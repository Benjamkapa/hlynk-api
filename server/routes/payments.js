import express from 'express';
import { db } from '../dbms/mysql.js';
import { handlePaymentCallback } from '../controllers/subscriptions.js';
import { initiateStkPush } from '../utils/mpesa.js';
import { authenticate } from '../middleware/auth.js';
import { ulid } from 'ulid';

const router = express.Router();

/**
 * @route POST /api/payments/mpesa/stk-push
 * @desc General M-Pesa STK Push trigger
 */
router.post('/mpesa/stk-push', authenticate, async (req, res) => {
  const { phone, amount, reference } = req.body;
  try {
    const result = await initiateStkPush({ phone, amount, reference });
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * @route GET /api/payments/mpesa/logs
 * @desc Get M-Pesa transaction logs
 */
router.get('/mpesa/logs', authenticate, async (req, res) => {
  const { tenantId, role } = req.user;
  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereQuery = '';
    const queryParams = [];

    // Staff/Providers only see logs for their tenant
    if (role !== 'SUPER_ADMIN') {
      whereQuery = 'WHERE tenantName = (SELECT businessName FROM Tenant WHERE id = ?)';
      queryParams.push(tenantId);
    }

    const [logs] = await db.query(`
      SELECT 
        l1.checkoutRequestId,
        l1.phone,
        l1.amount,
        l1.reference,
        l1.customerName,
        l1.initiatorName,
        l1.tenantName,
        (SELECT status FROM MpesaLog l2 WHERE l2.checkoutRequestId = l1.checkoutRequestId ORDER BY type DESC, createdAt DESC LIMIT 1) as status,
        (SELECT resultDesc FROM MpesaLog l3 WHERE l3.checkoutRequestId = l1.checkoutRequestId ORDER BY type DESC, createdAt DESC LIMIT 1) as resultDesc,
        (SELECT COUNT(*) FROM MpesaLog l4 WHERE l4.checkoutRequestId = l1.checkoutRequestId AND l4.type = 1) > 0 as isComplete,
        MAX(l1.createdAt) as createdAt
      FROM MpesaLog l1
      ${whereQuery}
      GROUP BY l1.checkoutRequestId
      ORDER BY createdAt DESC 
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(DISTINCT checkoutRequestId) as total FROM MpesaLog ${whereQuery}`, queryParams);
    const total = Number(countRes[0].total);

    return res.json({
      success: true,
      data: {
        items: logs,
        pagination: { total, totalPages: Math.ceil(total / Number(limit)), page: Number(page), limit: Number(limit) }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch M-Pesa logs' });
  }
});

/**
 * @route POST /api/payments/mpesa/callback
 * @desc M-Pesa Daraja STK Push Callback
 */
router.post('/mpesa/callback', express.json(), async (req, res) => {
  console.log('[MPESA CALLBACK] Raw Body:', JSON.stringify(req.body, null, 2));
  
  if (!req.body || !req.body.Body) {
    console.error('[MPESA CALLBACK] Error: No Body found in request');
    
    // Log invalid callback
    try {
      await db.query(`
        INSERT INTO MpesaLog (id, type, status, resultDesc, rawPayload)
        VALUES (?, 1, 4, 'Invalid body', ?)
      `, [ulid(), JSON.stringify(req.body)]);
    } catch (e) {}

    return res.json({ ResultCode: 1, ResultDesc: 'Invalid body' });
  }

  const { Body } = req.body;
  const { ResultCode, ResultDesc, CheckoutRequestID, MerchantRequestID, CallbackMetadata } = Body.stkCallback;
  const success = ResultCode === 0;
  const canceled = ResultCode === 1032;

  // Log the callback
  try {
    const logStatus = success ? 0 : (canceled ? 3 : 1);
    
    // Attempt to retrieve metadata from initiation log
    const [[initLog]] = await db.query(
      `SELECT customerName, initiatorName, tenantName FROM MpesaLog WHERE checkoutRequestId = ? AND type = 0 LIMIT 1`,
      [CheckoutRequestID]
    );

    await db.query(`
      INSERT INTO MpesaLog (id, merchantRequestId, checkoutRequestId, customerName, initiatorName, tenantName, type, status, resultCode, resultDesc, rawPayload)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `, [
      ulid(),
      MerchantRequestID,
      CheckoutRequestID,
      initLog?.customerName || null,
      initLog?.initiatorName || null,
      initLog?.tenantName || null,
      logStatus,
      ResultCode,
      ResultDesc,
      JSON.stringify(req.body)
    ]);
  } catch (logErr) {
    console.error('[MPESA LOG] Failed to log callback:', logErr.message);
  }

  let mpesaReceipt = CheckoutRequestID;
  if (success && CallbackMetadata && CallbackMetadata.Item) {
    const receiptItem = CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
    if (receiptItem) mpesaReceipt = receiptItem.Value;
  }

  try {
    // SEARCH IN MASTER PAYMENT TABLE
    const [payments] = await db.query(`SELECT * FROM Payment WHERE mpesaRequestId = ? LIMIT 1`, [CheckoutRequestID]);

    if (payments.length > 0) {
      const payment = payments[0];
      const status = canceled ? 3 : (success ? 0 : 1);

      // 1. UPDATE MASTER PAYMENT RECORD WITH EVERY DETAIL
      await db.query(`
        UPDATE Payment 
        SET status = ?, mpesaReceipt = ?, message = ?, rawResponse = ?, updatedAt = NOW() 
        WHERE id = ?
      `, [status, success ? mpesaReceipt : null, ResultDesc, JSON.stringify(req.body), payment.id]);

      // 2. TRIGGER BUSINESS LOGIC BASED ON TYPE
      if (payment.transactionType === 'SUBSCRIPTION') {
        await handlePaymentCallback(payment.reference, mpesaReceipt, success, ResultDesc);
        console.log(`[MASTER CALLBACK] Subscription Processed: ${payment.id}`);
      } 
      else if (payment.transactionType === 'SALE') {
        // Update the related Sale record if it exists
        const [sales] = await db.query(`SELECT id FROM Sale WHERE mpesaRequestId = ? OR id = ? LIMIT 1`, [CheckoutRequestID, payment.reference]);
        if (sales.length > 0) {
          await db.query(`UPDATE Sale SET status = ?, mpesaReceipt = ?, updatedAt = NOW() WHERE id = ?`, 
            [status, success ? mpesaReceipt : null, sales[0].id]);
        }
        console.log(`[MASTER CALLBACK] Sale Processed: ${payment.id}`);
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
