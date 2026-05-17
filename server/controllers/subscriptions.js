import { db } from '../dbms/mysql.js';
import { initiateStkPush, queryStkPush } from '../utils/mpesa.js';
import { ulid } from 'ulid';

export const PLAN_PRICES = {
  LITE: 2999 , // Starter
  PLUS: 6999, // Growth
  MAX: 16999, // Business Pro
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
    let query = `
      SELECT p.*, (SELECT rawPayload FROM MpesaLog l WHERE l.checkoutRequestId = p.mpesaRequestId ORDER BY type DESC, createdAt DESC LIMIT 1) as rawPayload
      FROM Payment p
      WHERE p.tenantId = ? AND p.transactionType = 'SUBSCRIPTION'
    `;
    const queryParams = [tenantId];

    if (status) {
      query += ` AND p.status = ?`;
      queryParams.push(status);
    }
    if (plan) {
      query += ` AND p.plan = ?`;
      queryParams.push(plan);
    }

    query += ` ORDER BY p.createdAt DESC LIMIT ? OFFSET ?`;
    queryParams.push(Number(limit), offset);

    const [payments] = await db.query(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM Payment WHERE tenantId = ? AND transactionType = 'SUBSCRIPTION'`;
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
      INSERT INTO Payment (id, tenantId, amount, phone, plan, status, reference, transactionType, createdAt) 
      VALUES (?, ?, ?, ?, ?, 2, ?, 'SUBSCRIPTION', NOW())
    `, [paymentId, tenantId, amount, phone, sub.planName, reference]);

    const [tenants] = await db.query(`SELECT businessName FROM Tenant WHERE id = ?`, [tenantId]);
    const tenantName = tenants[0]?.businessName || 'Tenant';

    const result = await initiateStkPush(
      { phone, amount, reference }, 
      null, 
      {
        customerName: req.user.name,
        initiatorName: req.user.name,
        tenantName: tenantName,
        tenantId: tenantId
      }
    );

    if (result.CheckoutRequestID) {
      await db.query(`UPDATE Payment SET mpesaRequestId = ? WHERE id = ?`, [result.CheckoutRequestID, paymentId]);
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
      INSERT INTO Payment (id, tenantId, amount, phone, plan, status, reference, transactionType, createdAt) 
      VALUES (?, ?, ?, ?, ?, 2, ?, 'SUBSCRIPTION', NOW())
    `, [paymentId, tenantId, amount, phone, planName, reference]);

    const [tenants] = await db.query(`SELECT businessName FROM Tenant WHERE id = ?`, [tenantId]);
    const tenantName = tenants[0]?.businessName || 'Tenant';

    const result = await initiateStkPush(
      { phone, amount, reference }, 
      null, 
      {
        customerName: req.user.name,
        initiatorName: req.user.name,
        tenantName: tenantName,
        tenantId: tenantId
      }
    );

    if (result.CheckoutRequestID) {
      await db.query(`UPDATE Payment SET mpesaRequestId = ? WHERE id = ?`, [result.CheckoutRequestID, paymentId]);
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
      console.log(`[SUBSCRIPTION CALLBACK] Processing ${reference} (Success: ${success})`);

      await connection.query(`UPDATE Payment SET status = 0, mpesaReceipt = ?, message = ? WHERE id = ?`, [transactionId, message || 'Success', payment.id]);

      const [subs] = await connection.query(`SELECT * FROM Subscription WHERE tenantId = ? LIMIT 1 FOR UPDATE`, [payment.tenantId]);
      
      if (subs.length > 0) {
        const sub = subs[0];
        const isNewPlan = sub.planName !== payment.plan;
        const actionLabel = isNewPlan ? 'Plan Change' : 'Subscription Renewal';
        const notificationTitle = isNewPlan ? 'Plan Activated!' : 'Subscription Renewed!';
        const notificationMsg = isNewPlan 
          ? `Your switch to the ${payment.plan} plan was successful. New features are now active.`
          : `Your ${payment.plan} subscription has been extended for another 28 days.`;

        const baseDate = new Date();
        const newEnd = new Date(baseDate);
        newEnd.setDate(newEnd.getDate() + 28);

        await connection.query(`
          UPDATE Subscription 
          SET planName = ?, status = 0, endDate = ?, startDate = ?, isTrial = 0 
          WHERE id = ?
        `, [payment.plan, newEnd, new Date(), sub.id]);

        // 3. UPDATE TENANT STATE (Clear trial flags)
        await connection.query(`UPDATE Tenant SET isTrial = 0, updatedAt = NOW() WHERE id = ?`, [payment.tenantId]);

        // 4. ACTIVITY LOG
        await connection.query(`
          INSERT INTO ActivityLog (id, tenantId, action, logName, details, createdAt) 
          VALUES (?, ?, ?, 'Billing', ?, NOW())
        `, [ulid(), payment.tenantId, actionLabel, `${actionLabel} to ${payment.plan} via M-Pesa (${transactionId})`]);

        // 5. SYSTEM NOTIFICATION
        await connection.query(`
          INSERT INTO Notification (id, tenantId, title, message, type, status, createdAt) 
          VALUES (?, ?, ?, ?, 'success', 0, NOW())
        `, [ulid(), payment.tenantId, notificationTitle, notificationMsg]);
      }

      await connection.commit();
    } catch (e) {
      await connection.rollback();
      console.error('Failed to handle payment success transaction', e);
    } finally {
      connection.release();
    }
  } else {
    const status = message?.toLowerCase().includes('cancel') ? 3 : 1;
    await db.query(`UPDATE Payment SET status = ?, message = ? WHERE id = ?`, [status, message || 'Failed', payment.id]);
  }
};

export const verifyPayment = async (req, res) => {
  const { tenantId } = req.user;
  const { paymentId } = req.params;

  try {
    const [payments] = await db.query(`SELECT * FROM Payment WHERE id = ? AND tenantId = ? LIMIT 1`, [paymentId, tenantId]);
    if (payments.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    const payment = payments[0];
    if (payment.status !== 2) return res.json({ success: true, data: payment });

    const checkoutRequestId = payment.mpesaRequestId;
    if (!checkoutRequestId) return res.status(400).json({ success: false, message: 'No mpesaRequestId found' });

    const result = await queryStkPush(checkoutRequestId);
    const message = result.ResultDesc || (result.ResultCode == '0' ? 'Success' : 'Failed');
    
    if (result.ResultCode == '0') {
      await handlePaymentCallback(payment.reference, checkoutRequestId, true, message);
      return res.json({ success: true, data: { status: 0, message, result } });
    } else if (['1032', '1'].includes(String(result.ResultCode))) {
      const status = result.ResultCode == '1032' ? 3 : 1;
      await db.query(`UPDATE Payment SET status = ?, message = ? WHERE id = ?`, [status, message, payment.id]);
      return res.json({ success: true, data: { status, message, result } });
    }
    
    return res.json({ success: true, data: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
