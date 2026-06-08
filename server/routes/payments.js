import express from 'express';
import { db } from '../dbms/mysql.js';
import { handlePaymentCallback } from '../controllers/subscriptions.js';
import { initiateStkPush } from '../utils/mpesa.js';
import { initiateKcbStkPush } from '../utils/kcb.js';
import { authenticate } from '../middleware/auth.js';
import { validateMpesaIP } from '../middleware/ipWhitelist.js';
import { ulid } from 'ulid';
import { pushSaleToEtims } from '../controllers/etims.js';

const router = express.Router();

router.post('/mpesa/stk-push', authenticate, async (req, res) => {
  const { phone, amount, reference } = req.body;
  const { tenantId, name } = req.user;
  try {
    const [tenants] = await db.query(`SELECT businessName FROM tenant WHERE id = ?`, [tenantId]);
    const tenantName = tenants[0]?.businessName || 'Tenant';
    const result = await initiateStkPush({ phone, amount, reference }, null, { customerName: name, initiatorName: name, tenantName, tenantId });
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/kcb/stk-push', authenticate, async (req, res) => {
  const { phone, amount, reference } = req.body;
  const { tenantId, name } = req.user;
  try {
    const [tenants] = await db.query(`SELECT businessName FROM tenant WHERE id = ?`, [tenantId]);
    const tenantName = tenants[0]?.businessName || 'Tenant';
    const result = await initiateKcbStkPush({ phone, amount, reference }, null, { customerName: name, initiatorName: name, tenantName, tenantId });
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/kcb/callback', express.json(), async (req, res) => {
  console.log('[KCB CALLBACK] Received:', JSON.stringify(req.body, null, 2));

  /**
   * KCB / Buni callback payload can arrive in multiple formats.
   * We normalise all known formats into: checkoutId, responseCode, responseDescription.
   *
   * Known KCB response codes:
   *   "00" / "0"   → Success
   *   "1032"       → Cancelled by user
   *   "1037"       → Timeout / DS timeout (user took too long)
   *   "1"          → Generic failure
   *   anything else → Unknown failure
   */
  const body = req.body || {};

  // Support both flat and nested callback formats (Buni UAT uses Body.stkCallback)
  const stk = body.Body?.stkCallback || body.stkCallback || {};
  const checkoutId = stk.CheckoutRequestID || body.checkoutId || body.CheckoutRequestID || body.request?.id || null;
  const responseCode = String(stk.ResultCode ?? (stk.responseCode || body.responseCode || body.ResultCode || body.resultCode || '1'));
  const responseDescription = stk.ResultDesc || stk.responseDescription || body.responseDescription || body.ResultDesc || body.resultDesc || 'Unknown';

  // ── Classify the result ───────────────────────────────────────────────
  const isSuccess   = responseCode === '0' || responseCode === '00';
  const isCancelled = responseCode === '1032';
  const isExpired   = responseCode === '1037' || responseCode === '1025';
  const isFailed    = !isSuccess; // catches cancelled, expired, and generic failure

  // Numeric DB status:  0 = success | 1 = failed | 2 = pending | 3 = cancelled | 4 = expired
  const kcbLogStatus = isSuccess ? 0 : isCancelled ? 3 : isExpired ? 4 : 1;
  const saleStatus   = isSuccess ? 0 : isCancelled ? 3 : isExpired ? 4 : 1;

  const stateLabel = isSuccess ? 'SUCCESS' : isCancelled ? 'CANCELLED' : isExpired ? 'EXPIRED' : 'FAILED';
  console.log(`[KCB CALLBACK] State: ${stateLabel} | CheckoutID: ${checkoutId} | Code: ${responseCode} | Desc: ${responseDescription}`);

  if (!checkoutId) {
    console.warn('[KCB CALLBACK] No checkoutId in payload — cannot reconcile.');
    return res.json({ status: 'Acknowledged' });
  }

  try {
    // 1. Update the kcblog record
    const [logs] = await db.query(
      `SELECT id, tenantId, reference FROM kcblog WHERE checkoutRequestId = ? LIMIT 1`,
      [checkoutId]
    );
    const initLog = logs[0];

    await db.query(
      `UPDATE kcblog SET status = ?, resultCode = ?, resultDesc = ?, rawPayload = ?
       WHERE checkoutRequestId = ?`,
      [kcbLogStatus, responseCode, responseDescription, JSON.stringify(body), checkoutId]
    );

    // 2. Find the matching payment record
    const [payments] = await db.query(
      `SELECT * FROM payment WHERE mpesaRequestId = ? LIMIT 1`,
      [checkoutId]
    );

    if (payments.length === 0) {
      console.warn(`[KCB CALLBACK] No payment record found for CheckoutID: ${checkoutId}`);
      return res.json({ status: 'Acknowledged' });
    }

    const payment = payments[0];

    // 3. Update the payment record
    await db.query(
      `UPDATE payment SET status = ?, message = ?, rawResponse = ?, updatedAt = NOW() WHERE id = ?`,
      [saleStatus, responseDescription, JSON.stringify(body), payment.id]
    );

    // 4. Handle SALE transaction type
    if (payment.transactionType === 'SALE') {
      const saleId = payment.reference;

      // Look up the sale
      const [sales] = await db.query(
        `SELECT id, tenantId FROM sale WHERE id = ? OR mpesaRequestId = ? LIMIT 1`,
        [saleId, checkoutId]
      );
      const sale = sales[0];

      if (!sale) {
        console.warn(`[KCB CALLBACK] No sale record found for reference: ${saleId}`);
        return res.json({ status: 'Acknowledged' });
      }

      // Update sale status
      await db.query(
        `UPDATE sale SET status = ?, updatedAt = NOW() WHERE id = ?`,
        [saleStatus, sale.id]
      );
      console.log(`[KCB-SYNC] Sale ${sale.id} → ${stateLabel} (status=${saleStatus})`);

      if (isSuccess) {
        // ── PAID: Push to KRA eTIMS ──────────────────────────────────
        const tenantId = initLog?.tenantId || payment.tenantId || sale.tenantId;
        if (tenantId) {
          setImmediate(() => {
            pushSaleToEtims(tenantId, sale.id).catch(err =>
              console.error(`[eTIMS] KCB success push failed for sale ${sale.id}:`, err.message)
            );
          });
        }
      } else {
        // ── NOT PAID: Restore stock ──────────────────────────────────
        try {
          const [items] = await db.query(
            `SELECT productId, quantity FROM saleitem WHERE saleId = ?`,
            [sale.id]
          );
          for (const item of items) {
            if (item.productId) {
              await db.query(
                `UPDATE product SET stockLevel = stockLevel + ? WHERE id = ?`,
                [item.quantity, item.productId]
              );
            }
          }
          console.log(`[KCB RESTORE] Stock restored for ${stateLabel} sale ${sale.id} (${items.length} items)`);
        } catch (restoreErr) {
          console.error('[KCB RESTORE] Stock restore failed:', restoreErr.message);
        }
      }
    }
  } catch (err) {
    console.error('[KCB CALLBACK] Critical processing error:', err);
  }

  // Always return 200 so KCB stops retrying
  return res.json({ status: 'Success' });
});

/**
 * KCB Payment Status Poll
 * Called by the frontend when a pending STK push hasn't resolved after ~30s.
 * Returns the current state of the checkout from our DB.
 *
 * GET /api/v1/payments/kcb/status/:checkoutId
 */
router.get('/kcb/status/:checkoutId', authenticate, async (req, res) => {
  const { checkoutId } = req.params;
  try {
    const [logs] = await db.query(
      `SELECT status, resultCode, resultDesc, updatedAt FROM kcblog
       WHERE checkoutRequestId = ?
       ORDER BY updatedAt DESC LIMIT 1`,
      [checkoutId]
    );

    if (logs.length === 0) {
      return res.json({ success: true, data: { state: 'PENDING', status: 2, message: 'Awaiting payment confirmation' } });
    }

    const log = logs[0];
    // Map DB status → human-readable state
    const stateMap = { 0: 'SUCCESS', 1: 'FAILED', 2: 'PENDING', 3: 'CANCELLED', 4: 'EXPIRED' };
    const state = stateMap[log.status] ?? 'UNKNOWN';

    return res.json({
      success: true,
      data: {
        state,
        status:    log.status,
        message:   log.resultDesc || stateMap[log.status],
        updatedAt: log.updatedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * KCB Transaction Logs
 * GET /api/v1/payments/kcb/logs
 */
router.get('/kcb/logs', authenticate, async (req, res) => {
  const { tenantId, role } = req.user;
  const { page = 1, limit = 50, sortOrder = 'desc' } = req.query;
  const order  = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const offset = (Number(page) - 1) * Number(limit);
  try {
    let whereClause = '';
    const queryParams = [];
    if (role !== 'SUPER_ADMIN') {
      whereClause = 'WHERE tenantId = ?';
      queryParams.push(tenantId);
    }
    const [logs] = await db.query(
      `SELECT id, checkoutRequestId, merchantRequestId, phone, amount, reference,
              customerName, initiatorName, tenantName, status, resultCode, resultDesc,
              createdAt, updatedAt
       FROM kcblog ${whereClause}
       ORDER BY createdAt ${order} LIMIT ? OFFSET ?`,
      [...queryParams, Number(limit), offset]
    );
    const [countRes] = await db.query(
      `SELECT COUNT(*) as total FROM kcblog ${whereClause}`,
      queryParams
    );
    const total = Number(countRes[0].total);
    return res.json({
      success: true,
      data: {
        items: logs,
        pagination: { total, totalPages: Math.ceil(total / Number(limit)), page: Number(page), limit: Number(limit) }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch KCB logs' });
  }
});

router.get('/mpesa/logs', authenticate, async (req, res) => {
  const { tenantId, role } = req.user;
  const { page = 1, limit = 50, sortOrder = 'desc' } = req.query;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const offset = (Number(page) - 1) * Number(limit);
  try {
    let whereQuery = '';
    const queryParams = [];
    if (role !== 'SUPER_ADMIN') {
      whereQuery = 'WHERE tenantName = (SELECT businessName FROM tenant WHERE id = ?)';
      queryParams.push(tenantId);
    }
    const [logs] = await db.query(`
      SELECT l1.id, l1.checkoutRequestId, l1.merchantRequestId, l1.phone, l1.amount, l1.reference,
             l1.customerName, l1.initiatorName, l1.tenantName, l1.type, l1.status, l1.resultCode,
             l1.resultDesc, l1.rawPayload, l1.createdAt,
             (SELECT COUNT(*) FROM mpesalog l2 WHERE l2.checkoutRequestId = l1.checkoutRequestId AND l2.type = 1) > 0 as isComplete
      FROM mpesalog l1 ${whereQuery} ORDER BY l1.createdAt ${order} LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);
    const [countRes] = await db.query(`SELECT COUNT(DISTINCT checkoutRequestId) as total FROM mpesalog ${whereQuery}`, queryParams);
    const total = Number(countRes[0].total);
    return res.json({ success: true, data: { items: logs, pagination: { total, totalPages: Math.ceil(total / Number(limit)), page: Number(page), limit: Number(limit) } } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch M-Pesa logs' });
  }
});

router.post('/mpesa/callback', express.json(), validateMpesaIP, async (req, res) => {
  const clientIP = req.clientIP;
  console.log('================================================');
  console.log('[MPESA DIAGNOSTIC] Incoming Callback');
  console.log('IP:', clientIP);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('================================================');
  console.log(`[MPESA CALLBACK] Received from ${clientIP}`);

  if (!req.body || !req.body.Body) {
    console.error('[MPESA CALLBACK] Error: No Body found in request');
    return res.json({ ResultCode: 1, ResultDesc: 'Invalid body' });
  }
  const { Body } = req.body;
  if (!Body.stkCallback) {
    console.error('[MPESA CALLBACK] Error: stkCallback missing in body');
    return res.json({ ResultCode: 1, ResultDesc: 'Invalid stkCallback' });
  }

  const { ResultCode, ResultDesc, CheckoutRequestID, MerchantRequestID, CallbackMetadata } = Body.stkCallback;
  const success = ResultCode === 0;
  const canceled = ResultCode === 1032;
  let initLog = null;

  try {
    const logStatus = success ? 0 : (canceled ? 3 : 1);
    const [rows] = await db.query(
      `SELECT customerName, initiatorName, tenantName, tenantId FROM mpesalog WHERE checkoutRequestId = ? AND type = 0 LIMIT 1`,
      [CheckoutRequestID]
    );
    initLog = rows[0];
    await db.query(`
      INSERT INTO mpesalog (id, merchantRequestId, checkoutRequestId, customerName, initiatorName, tenantName, tenantId, type, status, resultCode, resultDesc, rawPayload)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `, [ulid(), MerchantRequestID, CheckoutRequestID, initLog?.customerName || null, initLog?.initiatorName || null, initLog?.tenantName || null, initLog?.tenantId || null, logStatus, ResultCode, ResultDesc, JSON.stringify(req.body)]);
  } catch (logErr) {
    console.error('[MPESA LOG] Failed to log callback:', logErr.message);
  }

  let mpesaReceipt = CheckoutRequestID;
  if (success && CallbackMetadata && CallbackMetadata.Item) {
    const receiptItem = CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
    if (receiptItem) mpesaReceipt = receiptItem.Value;
  }

  if (success) {
    console.log(`[MONEY] M-Pesa Payment Success | Receipt: ${mpesaReceipt} | Tenant: ${initLog?.tenantName} | User: ${initLog?.initiatorName}`);
  } else {
    console.log(`[PAYMENT] M-Pesa Request Failed/Cancelled | Desc: ${ResultDesc} | Tenant: ${initLog?.tenantName} | User: ${initLog?.initiatorName}`);
  }

  try {
    const [payments] = await db.query(`SELECT * FROM payment WHERE mpesaRequestId = ? LIMIT 1`, [CheckoutRequestID]);
    if (payments.length > 0) {
      const payment = payments[0];
      const status = canceled ? 3 : (success ? 0 : 1);
      await db.query(`UPDATE payment SET status = ?, mpesaReceipt = ?, message = ?, rawResponse = ?, updatedAt = NOW() WHERE id = ?`,
        [status, success ? mpesaReceipt : null, ResultDesc, JSON.stringify(req.body), payment.id]);

      if (payment.transactionType === 'SUBSCRIPTION') {
        await handlePaymentCallback(payment.reference, mpesaReceipt, success, ResultDesc);
      } else if (payment.transactionType === 'SALE') {
        const [sales] = await db.query(`SELECT id FROM sale WHERE mpesaRequestId = ? OR id = ? LIMIT 1`, [CheckoutRequestID, payment.reference]);
        if (sales.length > 0) {
          const saleId = sales[0].id;
          await db.query(`UPDATE sale SET status = ?, mpesaReceipt = ?, updatedAt = NOW() WHERE id = ?`, [status, success ? mpesaReceipt : null, saleId]);
          console.log(`[SALE-SYNC] Updated Sale ${saleId} to Status ${status} (Success: ${success})`);

          // ─── eTIMS push after confirmed MPesa payment ───
          if (success) {
            const saleRow = await db.query('SELECT tenantId FROM sale WHERE id = ? LIMIT 1', [saleId]).then(([r]) => r[0]).catch(() => null);
            if (saleRow?.tenantId) {
              setImmediate(() => {
                pushSaleToEtims(saleRow.tenantId, saleId).catch(err =>
                  console.error(`[eTIMS] MPesa callback push failed for sale ${saleId}:`, err.message)
                );
              });
            }
          }

          if (!success) {
            try {
              const [items] = await db.query(`SELECT productId, quantity FROM saleitem WHERE saleId = ?`, [saleId]);
              for (const item of items) {
                if (item.productId) {
                  await db.query(`UPDATE product SET stockLevel = stockLevel + ? WHERE id = ?`, [item.quantity, item.productId]);
                }
              }
              console.log(`[SALE RESTORE] Restored stock for cancelled/failed sale ${saleId}`);
            } catch (err) {
              console.error('[SALE RESTORE] Failed to restore stock:', err);
            }
          }
        } else {
          console.warn(`[SALE-SYNC] Failed to find Sale record for reference ${payment.reference} or RequestID ${CheckoutRequestID}`);
        }
      }
    } else {
      console.warn(`[MASTER CALLBACK] Orphaned callback received for ID: ${CheckoutRequestID}. No matching record in Master Payment table.`);
    }
  } catch (err) {
    console.error('[MASTER CALLBACK] Critical processing error:', err);
  }

  return res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

/**
 * M-Pesa B2C Result Callback
 * Safaricom sends this when a B2C payment completes (success or fail).
 * POST /api/v1/payments/mpesa/b2c/result
 */
router.post('/mpesa/b2c/result', express.json(), async (req, res) => {
  console.log('================================================');
  console.log('[B2C RESULT] Incoming Callback');
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('================================================');

  const body = req.body || {};
  const result = body.Result || {};

  const conversationId = result.ConversationID || null;
  const originatorConversationId = result.OriginatorConversationID || null;
  const resultCode = Number(result.ResultCode ?? 1);
  const resultDesc = result.ResultDesc || 'Unknown';
  const transactionId = result.TransactionID || null;

  const isSuccess = resultCode === 0;
  const logStatus = isSuccess ? 0 : 1;

  // Extract result parameters (amount, phone, receipt, etc.)
  let transactionAmount = null;
  let transactionReceipt = null;
  let receiverPhone = null;

  if (isSuccess && result.ResultParameters?.ResultParameter) {
    for (const param of result.ResultParameters.ResultParameter) {
      if (param.Key === 'TransactionAmount') transactionAmount = param.Value;
      if (param.Key === 'TransactionReceipt') transactionReceipt = param.Value;
      if (param.Key === 'ReceiverPartyPublicName') receiverPhone = param.Value;
    }
  }

  console.log(`[B2C RESULT] ${isSuccess ? 'SUCCESS' : 'FAILED'} | ConvID: ${conversationId} | Code: ${resultCode} | Desc: ${resultDesc} | Receipt: ${transactionReceipt}`);

  try {
    // 1. Find and update the b2clog record
    let payoutId = null;
    if (conversationId) {
      const [logs] = await db.query(
        `SELECT id, payoutId, tenantId FROM b2clog WHERE conversationId = ? LIMIT 1`,
        [conversationId]
      );

      if (logs.length > 0) {
        payoutId = logs[0].payoutId;
        await db.query(
          `UPDATE b2clog SET status = ?, resultCode = ?, resultDesc = ?, transactionId = ?, transactionReceipt = ?, rawCallback = ?, updatedAt = NOW() WHERE id = ?`,
          [logStatus, resultCode, resultDesc, transactionId, transactionReceipt, JSON.stringify(body), logs[0].id]
        );
      }
    }

    // 2. Update linked payout record
    if (payoutId) {
      const newStatus = isSuccess ? 'PAID' : 'FAILED';
      await db.query(
        `UPDATE payout SET status = ?, processedAt = NOW(), message = ?, updatedAt = NOW() WHERE id = ?`,
        [newStatus, isSuccess ? `B2C Success: ${transactionReceipt || resultDesc}` : `B2C Failed: ${resultDesc}`, payoutId]
      );
      console.log(`[B2C RESULT] Payout ${payoutId} → ${newStatus}`);

      // 3. Log activity
      const [payoutRows] = await db.query(`SELECT tenantId FROM payout WHERE id = ?`, [payoutId]);
      if (payoutRows.length > 0) {
        await db.query(`
          INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
          VALUES (?, ?, NULL, ?, 'Financials', ?, NOW())
        `, [
          ulid(),
          payoutRows[0].tenantId,
          isSuccess ? 'B2C Payout Success' : 'B2C Payout Failed',
          `${isSuccess ? 'Disbursement confirmed' : 'Disbursement failed'}: ${transactionReceipt || resultDesc} (KES ${transactionAmount || 'N/A'})`
        ]);
      }
    }
  } catch (err) {
    console.error('[B2C RESULT] Critical processing error:', err);
  }

  // Always return success to Safaricom
  return res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

/**
 * M-Pesa B2C Timeout Callback
 * Safaricom sends this when a B2C request times out.
 * POST /api/v1/payments/mpesa/b2c/timeout
 */
router.post('/mpesa/b2c/timeout', express.json(), async (req, res) => {
  console.log('[B2C TIMEOUT] Received:', JSON.stringify(req.body, null, 2));

  const body = req.body || {};
  const result = body.Result || {};
  const conversationId = result.ConversationID || null;
  const resultDesc = result.ResultDesc || 'B2C Request Timed Out';

  try {
    if (conversationId) {
      const [logs] = await db.query(
        `SELECT id, payoutId FROM b2clog WHERE conversationId = ? LIMIT 1`,
        [conversationId]
      );

      if (logs.length > 0) {
        await db.query(
          `UPDATE b2clog SET status = 3, resultDesc = ?, rawCallback = ?, updatedAt = NOW() WHERE id = ?`,
          [resultDesc, JSON.stringify(body), logs[0].id]
        );

        // Mark payout as failed so it can be retried
        if (logs[0].payoutId) {
          await db.query(
            `UPDATE payout SET status = 'FAILED', message = ?, updatedAt = NOW() WHERE id = ?`,
            [`B2C Timeout: ${resultDesc}`, logs[0].payoutId]
          );
          console.log(`[B2C TIMEOUT] Payout ${logs[0].payoutId} → FAILED (timeout)`);
        }
      }
    }
  } catch (err) {
    console.error('[B2C TIMEOUT] Processing error:', err);
  }

  return res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

/**
 * B2C Disbursement Logs
 * GET /api/v1/payments/b2c/logs
 */
router.get('/b2c/logs', authenticate, async (req, res) => {
  const { role } = req.user;
  if (role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }

  const { page = 1, limit = 50, sortOrder = 'desc' } = req.query;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const [logs] = await db.query(`
      SELECT b.*, p.type as payoutType, t.businessName
      FROM b2clog b
      LEFT JOIN payout p ON b.payoutId = p.id
      LEFT JOIN tenant t ON b.tenantId = t.id
      ORDER BY b.createdAt ${order} LIMIT ? OFFSET ?
    `, [Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM b2clog`);
    const total = Number(countRes[0].total);

    return res.json({
      success: true,
      data: {
        items: logs,
        pagination: { total, totalPages: Math.ceil(total / Number(limit)), page: Number(page), limit: Number(limit) }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch B2C logs' });
  }
});

export default router;
