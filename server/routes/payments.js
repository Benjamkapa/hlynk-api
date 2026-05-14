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
  console.log('[MPESA CALLBACK] Raw Body:', req.body);
  
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

  // Find the specific payment by CheckoutRequestID (which we stored in mpesaReceipt field during initiation)
  try {
    const [payments] = await db.query(`SELECT * FROM Payment WHERE mpesaReceipt = ? LIMIT 1`, [CheckoutRequestID]);

    if (payments.length > 0) {
      const payment = payments[0];
      await handlePaymentCallback(payment.reference, mpesaReceipt, success, ResultDesc);
      
      const updateData = [];
      const updateFields = [];

      if (canceled) {
        updateFields.push('status = ?');
        updateData.push('CANCELLED');
      }
      
      updateFields.push('message = ?');
      updateData.push(ResultDesc);
      
      updateData.push(payment.id);
      
      await db.query(`UPDATE Payment SET ${updateFields.join(', ')} WHERE id = ?`, updateData);
    } else {
      console.warn(`[MPESA CALLBACK] No pending payment found for ID: ${CheckoutRequestID}`);
    }
  } catch (err) {
    console.error('[MPESA CALLBACK] Error processing:', err);
  }

  return res.json({ ResultCode: 0, ResultDesc: 'Success' });
});

export default router;
