import express from 'express';
import { db } from '../dbms/mysql.js';
import { handlePaymentCallback } from '../controllers/subscriptions.js';

const router = express.Router();

/**
 * @route POST /api/payments/mpesa/callback
 * @desc M-Pesa Daraja STK Push Callback
 */
router.post('/mpesa/callback', async (req, res) => {
  const { Body } = req.body;
  console.log('[MPESA CALLBACK] Received:', JSON.stringify(req.body, null, 2));

  if (!Body || !Body.stkCallback) {
    return res.json({ ResultCode: 1, ResultDesc: 'Invalid body' });
  }

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
