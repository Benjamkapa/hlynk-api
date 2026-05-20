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
  const { tenantId, name } = req.user;

  try {
    const [tenants] = await db.query(`SELECT businessName FROM Tenant WHERE id = ?`, [tenantId]);
    const tenantName = tenants[0]?.businessName || 'Tenant';

    const result = await initiateStkPush(
      { phone, amount, reference }, 
      null, 
      {
        customerName: name,
        initiatorName: name,
        tenantName: tenantName,
        tenantId: tenantId
      }
    );
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
  const { page = 1, limit = 50, sortOrder = 'desc' } = req.query;
  const order = sortOrder.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
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
        l1.id,
        l1.checkoutRequestId,
        l1.merchantRequestId,
        l1.phone,
        l1.amount,
        l1.reference,
        l1.customerName,
        l1.initiatorName,
        l1.tenantName,
        l1.type,
        l1.status,
        l1.resultCode,
        l1.resultDesc,
        l1.rawPayload,
        l1.createdAt,
        (SELECT COUNT(*) FROM MpesaLog l2 WHERE l2.checkoutRequestId = l1.checkoutRequestId AND l2.type = 1) > 0 as isComplete
      FROM MpesaLog l1
      ${whereQuery}
      ORDER BY l1.createdAt ${order} 
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
  const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  const safaricomIPs = ['196.201.214.', '196.201.213.', '196.201.212.'];
  
  // Relaxed check for dev/ngrok - check if it's explicitly from Safaricom OR if we're in development
  const isSafaricom = clientIP.includes('127.0.0.1') || safaricomIPs.some(ip => clientIP.includes(ip));
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;

  if (!isSafaricom && !isDev) {
    console.warn(`[SECURITY] Spoofed M-Pesa callback attempt blocked from IP: ${clientIP}`);
    return res.status(403).json({ error: 'Forbidden' });
  }

  console.log('================================================');
  console.log('[MPESA DIAGNOSTIC] Incoming Callback');
  console.log('IP:', clientIP);
  console.log('Body:', JSON.stringify(req.body, null, 2));
  console.log('================================================');

  console.log(`[MPESA CALLBACK] Received from ${clientIP} (Safaricom: ${isSafaricom})`);

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

  // Log the callback
  try {
    const logStatus = success ? 0 : (canceled ? 3 : 1);
    
    // Attempt to retrieve metadata from initiation log
    const [rows] = await db.query(
      `SELECT customerName, initiatorName, tenantName, tenantId FROM MpesaLog WHERE checkoutRequestId = ? AND type = 0 LIMIT 1`,
      [CheckoutRequestID]
    );
    initLog = rows[0];

    await db.query(`
      INSERT INTO MpesaLog (id, merchantRequestId, checkoutRequestId, customerName, initiatorName, tenantName, tenantId, type, status, resultCode, resultDesc, rawPayload)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `, [
      ulid(),
      MerchantRequestID,
      CheckoutRequestID,
      initLog?.customerName || null,
      initLog?.initiatorName || null,
      initLog?.tenantName || null,
      initLog?.tenantId || null,
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

  if (success) {
    console.log(`[MONEY] M-Pesa Payment Success | Receipt: ${mpesaReceipt} | Tenant: ${initLog?.tenantName} | User: ${initLog?.initiatorName}`);
  } else {
    console.log(`[PAYMENT] M-Pesa Request Failed/Cancelled | Desc: ${ResultDesc} | Tenant: ${initLog?.tenantName} | User: ${initLog?.initiatorName}`);
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
      } 
      else if (payment.transactionType === 'SALE') {
        // Update the related Sale record if it exists
        const [sales] = await db.query(`SELECT id FROM Sale WHERE mpesaRequestId = ? OR id = ? LIMIT 1`, [CheckoutRequestID, payment.reference]);
        if (sales.length > 0) {
          const saleId = sales[0].id;
          await db.query(`UPDATE Sale SET status = ?, mpesaReceipt = ?, updatedAt = NOW() WHERE id = ?`, 
            [status, success ? mpesaReceipt : null, saleId]);
          
          console.log(`[SALE-SYNC] Updated Sale ${saleId} to Status ${status} (Success: ${success})`);
            
          // RESTORE STOCK IF FAILED OR CANCELLED
          if (!success) {
            try {
              const [items] = await db.query(`SELECT productId, quantity FROM SaleItem WHERE saleId = ?`, [saleId]);
              for (const item of items) {
                if (item.productId) {
                  await db.query(`UPDATE Product SET stockLevel = stockLevel + ? WHERE id = ?`, [item.quantity, item.productId]);
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
