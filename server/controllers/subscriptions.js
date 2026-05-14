import { db } from '../dbms/mysql.js';
import { initiateStkPush, queryStkPush } from '../utils/mpesa.js';
import { ulid } from 'ulid';

export const PLAN_PRICES = {
  LITE: 1,
  PLUS: 1,
  MAX: 1,
};

export const getMySubscription = async (req, res) => {
  const { tenantId } = req.user;
  try {
    const [subs] = await db.query(`SELECT * FROM Subscription WHERE tenantId = ? LIMIT 1`, [tenantId]);
    return res.json({ success: true, data: subs.length > 0 ? subs[0] : null });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch subscription' });
  }
};

export const getBillingHistory = async (req, res) => {
  const { tenantId } = req.user;
  const { page = 1, limit = 10, status, plan } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let query = `SELECT * FROM Payment WHERE tenantId = ?`;
    const queryParams = [tenantId];

    if (status) {
      query += ` AND status = ?`;
      queryParams.push(status);
    }
    if (plan) {
      query += ` AND plan = ?`;
      queryParams.push(plan);
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    queryParams.push(Number(limit), offset);

    const [payments] = await db.query(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM Payment WHERE tenantId = ?`;
    const countParams = [tenantId];
    if (status) { countQuery += ` AND status = ?`; countParams.push(status); }
    if (plan) { countQuery += ` AND plan = ?`; countParams.push(plan); }

    const [countRes] = await db.query(countQuery, countParams);
    const total = countRes[0].total;

    return res.json({
      success: true,
      data: {
        payments,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(total / Number(limit))
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch billing history' });
  }
};

export const initiateRenewal = async (req, res) => {
  const { tenantId } = req.user;
  const { phone } = req.body;

  try {
    const [subs] = await db.query(`SELECT * FROM Subscription WHERE tenantId = ? LIMIT 1`, [tenantId]);
    if (subs.length === 0) return res.status(404).json({ success: false, message: 'Subscription not found' });
    
    const sub = subs[0];
    const amount = PLAN_PRICES[sub.planName];
    const reference = `SUB-REN-${tenantId.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    
    const paymentId = ulid();
    await db.query(`
      INSERT INTO Payment (id, tenantId, amount, plan, status, reference, createdAt) 
      VALUES (?, ?, ?, ?, 'PENDING', ?, NOW())
    `, [paymentId, tenantId, amount, sub.planName, reference]);

    const result = await initiateStkPush({ phone, amount, reference });

    if (result.CheckoutRequestID) {
      await db.query(`UPDATE Payment SET mpesaReceipt = ? WHERE id = ?`, [result.CheckoutRequestID, paymentId]);
    }

    return res.json({ success: true, data: { paymentId, message: 'STK Push sent to your phone' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const changePlan = async (req, res) => {
  const { tenantId } = req.user;
  const { planName, phone } = req.body;

  try {
    const amount = PLAN_PRICES[planName];
    const reference = `SUB-UPG-${tenantId.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;

    const paymentId = ulid();
    await db.query(`
      INSERT INTO Payment (id, tenantId, amount, plan, status, reference, createdAt) 
      VALUES (?, ?, ?, ?, 'PENDING', ?, NOW())
    `, [paymentId, tenantId, amount, planName, reference]);

    const result = await initiateStkPush({ phone, amount, reference });

    if (result.CheckoutRequestID) {
      await db.query(`UPDATE Payment SET mpesaReceipt = ? WHERE id = ?`, [result.CheckoutRequestID, paymentId]);
    }

    return res.json({ success: true, data: { paymentId, message: 'Payment initiated for plan upgrade' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const handlePaymentCallback = async (reference, transactionId, success, message = null) => {
  const [payments] = await db.query(`SELECT * FROM Payment WHERE reference = ? LIMIT 1`, [reference]);
  if (payments.length === 0) return;
  const payment = payments[0];

  if (success) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(`UPDATE Payment SET status = 'PAID', mpesaReceipt = ?, message = ? WHERE id = ?`, [transactionId, message || 'Success', payment.id]);

      const [subs] = await connection.query(`SELECT * FROM Subscription WHERE tenantId = ? LIMIT 1 FOR UPDATE`, [payment.tenantId]);
      
      if (subs.length > 0) {
        const sub = subs[0];
        const baseDate = new Date();
        const newEnd = new Date(baseDate);
        newEnd.setDate(newEnd.getDate() + 28);

        await connection.query(`
          UPDATE Subscription 
          SET planName = ?, status = 'ACTIVE', endDate = ?, startDate = ?, isTrial = 0 
          WHERE id = ?
        `, [payment.plan, newEnd, new Date(), sub.id]);
      }

      await connection.commit();
    } catch (e) {
      await connection.rollback();
      console.error('Failed to handle payment success transaction', e);
    } finally {
      connection.release();
    }
  } else {
    await db.query(`UPDATE Payment SET status = 'FAILED', mpesaReceipt = ?, message = ? WHERE id = ?`, [transactionId, message || 'Failed', payment.id]);
  }
};

export const verifyPayment = async (req, res) => {
  const { tenantId } = req.user;
  const { paymentId } = req.params;

  try {
    const [payments] = await db.query(`SELECT * FROM Payment WHERE id = ? AND tenantId = ? LIMIT 1`, [paymentId, tenantId]);
    if (payments.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    const payment = payments[0];
    if (payment.status !== 'PENDING') return res.json({ success: true, data: payment });

    const checkoutRequestId = payment.mpesaReceipt;
    if (!checkoutRequestId) return res.status(400).json({ success: false, message: 'No CheckoutRequestID' });

    const result = await queryStkPush(checkoutRequestId);
    const message = result.ResultDesc || (result.ResultCode == '0' ? 'Success' : 'Failed');
    
    if (result.ResultCode == '0') {
      await handlePaymentCallback(payment.reference, checkoutRequestId, true, message);
      return res.json({ success: true, data: { status: 'PAID', message, result } });
    } else if (['1032', '1'].includes(String(result.ResultCode))) {
      const status = result.ResultCode == '1032' ? 'CANCELLED' : 'FAILED';
      await db.query(`UPDATE Payment SET status = ?, message = ? WHERE id = ?`, [status, message, payment.id]);
      return res.json({ success: true, data: { status, message, result } });
    }
    
    return res.json({ success: true, data: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
