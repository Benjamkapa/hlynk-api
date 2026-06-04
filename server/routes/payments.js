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

  // Extract relevant fields (Standard KCB callback format)
  // Note: KCB callback structure can vary; we should map it to success/fail
  const { responseCode, responseDescription, checkoutId } = req.body;
  const success = responseCode === "00" || responseCode === "0";

  try {
    const [logs] = await db.query(`SELECT tenantId, reference FROM kcblog WHERE checkoutRequestId = ? LIMIT 1`, [checkoutId]);
    const initLog = logs[0];

    await db.query(`UPDATE kcblog SET status = ?, resultCode = ?, resultDesc = ?, rawPayload = ? WHERE checkoutRequestId = ?`,
      [success ? 0 : 1, responseCode, responseDescription, JSON.stringify(req.body), checkoutId]);

    const [payments] = await db.query(`SELECT * FROM payment WHERE mpesaRequestId = ? LIMIT 1`, [checkoutId]);
    if (payments.length > 0) {
      const payment = payments[0];
      await db.query(`UPDATE payment SET status = ?, message = ?, rawResponse = ?, updatedAt = NOW() WHERE id = ?`,
        [success ? 0 : 1, responseDescription, JSON.stringify(req.body), payment.id]);

      if (payment.transactionType === 'SALE') {
        await db.query(`UPDATE sale SET status = ?, updatedAt = NOW() WHERE id = ?`, [success ? 0 : 1, payment.reference]);
        
        if (success) {
          const saleId = payment.reference;
          pushSaleToEtims(initLog.tenantId, saleId).catch(err => console.error('[eTIMS] KCB push failed:', err.message));
        }
      }
    }
  } catch (err) {
    console.error('[KCB CALLBACK PROCESING ERROR]', err);
  }

  return res.json({ status: "Success" });
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

export default router;
