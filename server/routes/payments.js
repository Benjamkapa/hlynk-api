import express from 'express';
import { db } from '../dbms/mysql.js';
import { handlePaymentCallback } from '../controllers/subscriptions.js';
import { initiateStkPush } from '../utils/mpesa.js';
import { authenticate } from '../middleware/auth.js';

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
 * @route POST /api/payments/mpesa/callback
 * @desc M-Pesa Daraja STK Push Callback
 */
router.post('/mpesa/callback', express.json(), async (req, res) => {
  console.log('[MPESA CALLBACK] Raw Body:', JSON.stringify(req.body, null, 2));
  
  if (!req.body || !req.body.Body) {
    console.error('[MPESA CALLBACK] Error: No Body found in request');
    return res.json({ ResultCode: 1, ResultDesc: 'Invalid body' });
  }

  const { Body } = req.body;
  const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;
  const success = ResultCode === 0;
  const canceled = ResultCode === 1032;

  let mpesaReceipt = CheckoutRequestID;
  if (success && CallbackMetadata && CallbackMetadata.Item) {
    const receiptItem = CallbackMetadata.Item.find((i) => i.Name === 'MpesaReceiptNumber');
    if (receiptItem) mpesaReceipt = receiptItem.Value;
  }

  try {
    // 1. Search in Payment table (Subscriptions)
    const [payments] = await db.query(`SELECT * FROM Payment WHERE mpesaReceipt = ? LIMIT 1`, [CheckoutRequestID]);

    if (payments.length > 0) {
      const payment = payments[0];
      await handlePaymentCallback(payment.reference, mpesaReceipt, success, ResultDesc);
      
      const status = canceled ? 'CANCELLED' : (success ? 'PAID' : 'FAILED');
      await db.query(`UPDATE Payment SET status = ?, message = ? WHERE id = ?`, [status, ResultDesc, payment.id]);
      console.log(`[MPESA CALLBACK] Updated Subscription Payment: ${payment.id} to ${status}`);
    } 
    // 2. Search in Sale table (POS)
    else {
      const [sales] = await db.query(`SELECT * FROM Sale WHERE mpesaRequestId = ? LIMIT 1`, [CheckoutRequestID]);
      
      if (sales.length > 0) {
        const sale = sales[0];
        const status = success ? 'COMPLETED' : (canceled ? 'CANCELLED' : 'FAILED');
        await db.query(`UPDATE Sale SET status = ?, updatedAt = NOW() WHERE id = ?`, [status, sale.id]);
        console.log(`[MPESA CALLBACK] Updated Sale: ${sale.id} to ${status}`);
      } else {
        console.warn(`[MPESA CALLBACK] No pending payment or sale found for RequestID: ${CheckoutRequestID}`);
      }
    }
  } catch (err) {
    console.error('[MPESA CALLBACK] Error processing:', err);
  }

  return res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

export default router;
