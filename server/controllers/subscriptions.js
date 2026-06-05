import { db } from '../dbms/mysql.js';
import { initiateStkPush, queryStkPush } from '../utils/mpesa.js';
import { ulid } from 'ulid';

export const PLAN_PRICES = {
  LITE: 4450, // Starter
  PLUS: 9450, // Growth
  MAX: 16999, // Business Pro
};

export const getMySubscription = async (req, res) => {
  const { tenantId } = req.user;
  try {
    const [subs] = await db.query(`SELECT * FROM subscription WHERE tenantId = ? LIMIT 1`, [tenantId]);
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
      SELECT p.*, (SELECT rawPayload FROM mpesalog l WHERE l.checkoutRequestId = p.mpesaRequestId ORDER BY type DESC, createdAt DESC LIMIT 1) as rawPayload
      FROM payment p
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

    let countQuery = `SELECT COUNT(*) as total FROM payment WHERE tenantId = ? AND transactionType = 'SUBSCRIPTION'`;
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
  const { phone, months = 1 } = req.body; // Added months

  try {
    const [recentPayments] = await db.query(`SELECT COUNT(*) as cnt FROM payment WHERE tenantId = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)`, [tenantId]);
    if (recentPayments[0].cnt >= 5) {
      return res.status(429).json({ success: false, message: 'Too many payment attempts. Please wait before trying again.' });
    }

    const [subs] = await db.query(`SELECT * FROM subscription WHERE tenantId = ? LIMIT 1`, [tenantId]);
    if (subs.length === 0) return res.status(404).json({ success: false, message: 'Subscription not found' });
    
    const sub = subs[0];
    const baseAmount = PLAN_PRICES[sub.planName];
    
    // Calculate final amount and days
    let finalAmount = baseAmount * months;
    let daysToReward = months * 28; // Default 28 days per month

    if (months === 6) {
        daysToReward = 180;
        finalAmount = Math.round(finalAmount * 0.95); // 5% discount
    } else if (months === 12) {
        daysToReward = 365;
        finalAmount = Math.round(finalAmount * 0.85); // 15% discount
    }

    const reference = `SUB-REN-${tenantId.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    
    const paymentId = ulid();
    await db.query(`
      INSERT INTO payment (id, tenantId, amount, phone, plan, status, reference, transactionType, createdAt, meta) 
      VALUES (?, ?, ?, ?, ?, 2, ?, 'SUBSCRIPTION', NOW(), ?)
    `, [paymentId, tenantId, finalAmount, phone, sub.planName, reference, JSON.stringify({ months, daysToReward })]);

    const [tenants] = await db.query(`SELECT businessName FROM tenant WHERE id = ?`, [tenantId]);
    const tenantName = tenants[0]?.businessName || 'Tenant';

    const result = await initiateStkPush(
      { phone, amount: finalAmount, reference }, 
      null, 
      {
        customerName: req.user.name,
        initiatorName: req.user.name,
        tenantName: tenantName,
        tenantId: tenantId
      }
    );

    if (result.CheckoutRequestID) {
      await db.query(`UPDATE payment SET mpesaRequestId = ? WHERE id = ?`, [result.CheckoutRequestID, paymentId]);
    }

    return res.json({ success: true, data: { paymentId, message: 'STK Push sent to your phone, Enter your pin to complete the transaction' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const changePlan = async (req, res) => {
  const { tenantId } = req.user;
  const { plan: newPlan, phone, months = 1 } = req.body;

  if (!PLAN_PRICES[newPlan]) return res.status(400).json({ success: false, message: 'Invalid plan' });

  try {
    const [recentPayments] = await db.query(`SELECT COUNT(*) as cnt FROM payment WHERE tenantId = ? AND createdAt > DATE_SUB(NOW(), INTERVAL 1 HOUR)`, [tenantId]);
    if (recentPayments[0].cnt >= 5) {
      return res.status(429).json({ success: false, message: 'Too many payment attempts. Please wait before trying again.' });
    }

    const baseAmount = PLAN_PRICES[newPlan];
    
    // Calculate final amount and days
    let finalAmount = baseAmount * months;
    let daysToReward = months * 28;

    if (months === 6) {
        daysToReward = 180;
        finalAmount = Math.round(finalAmount * 0.95); // 5% discount
    } else if (months === 12) {
        daysToReward = 365;
        finalAmount = Math.round(finalAmount * 0.85); // 15% discount
    }

    const reference = `SUB-UPG-${tenantId.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const paymentId = ulid();

    await db.query(`
      INSERT INTO payment (id, tenantId, amount, phone, plan, status, reference, transactionType, createdAt, meta) 
      VALUES (?, ?, ?, ?, ?, 2, ?, 'SUBSCRIPTION', NOW(), ?)
    `, [paymentId, tenantId, finalAmount, phone, newPlan, reference, JSON.stringify({ months, daysToReward })]);

    const [tenants] = await db.query(`SELECT businessName FROM tenant WHERE id = ?`, [tenantId]);
    const tenantName = tenants[0]?.businessName || 'Tenant';

    const result = await initiateStkPush(
      { phone, amount: finalAmount, reference },
      null, 
      {
        customerName: req.user.name,
        initiatorName: req.user.name,
        tenantName: tenantName,
        tenantId: tenantId
      }
    );

    if (result.CheckoutRequestID) {
      await db.query(`UPDATE payment SET mpesaRequestId = ? WHERE id = ?`, [result.CheckoutRequestID, paymentId]);
    }

    return res.json({ success: true, data: { paymentId, message: 'Payment initiated for plan upgrade' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const handlePaymentCallback = async (reference, transactionId, success, message = null) => {
  const [payments] = await db.query(`SELECT * FROM payment WHERE reference = ? LIMIT 1`, [reference]);
  if (payments.length === 0) return;
  const payment = payments[0];

  if (success) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();
      console.log(`[SUBSCRIPTION CALLBACK] Processing ${reference} (Success: ${success})`);

      await connection.query(`UPDATE payment SET status = 0, mpesaReceipt = ?, message = ? WHERE id = ?`, [transactionId, message || 'Success', payment.id]);

      const [subs] = await connection.query(`SELECT * FROM subscription WHERE tenantId = ? LIMIT 1 FOR UPDATE`, [payment.tenantId]);
      
      if (subs.length > 0) {
        const sub = subs[0];
        
        // Parse custom reward days from meta
        let daysToReward = 28;
        let monthsLabel = 'another 28 days';
        try {
          if (payment.meta) {
            const meta = typeof payment.meta === 'string' ? JSON.parse(payment.meta) : payment.meta;
            if (meta.daysToReward) {
              daysToReward = meta.daysToReward;
              monthsLabel = `${daysToReward} days`;
            }
          }
        } catch (e) {
          console.error('[META PARSE ERROR]', e);
        }

        const isNewPlan = sub.planName !== payment.plan;
        const actionLabel = isNewPlan ? 'Plan Change' : 'Subscription Renewal';
        const notificationTitle = isNewPlan ? 'Plan Activated!' : 'Subscription Renewed!';
        const getPlanName = (p) => p === 'MAX' ? 'Business Pro' : p === 'PLUS' ? 'Growth' : 'Starter';
        const displayPlanName = getPlanName(payment.plan);
        const notificationMsg = isNewPlan 
          ? `Your switch to the ${displayPlanName} plan was successful. ${daysToReward} service days added.`
          : `Your ${displayPlanName} subscription has been extended for ${monthsLabel}.`;

        // Calculate New End Date
        const currentEnd = sub.endDate ? new Date(sub.endDate) : new Date();
        const baseDate = currentEnd > new Date() ? currentEnd : new Date(); // Add to current if not expired, else from now
        const newEnd = new Date(baseDate);
        newEnd.setDate(newEnd.getDate() + daysToReward);

        await connection.query(`
          UPDATE subscription 
          SET planName = ?, status = 0, endDate = ?, startDate = ? 
          WHERE id = ?
        `, [payment.plan, newEnd, new Date(), sub.id]);

        // 3. UPDATE TENANT STATE (Clear trial flags)
        await connection.query(`UPDATE tenant SET isTrial = 0, updatedAt = NOW() WHERE id = ?`, [payment.tenantId]);

        // 4. ACTIVITY LOG
        await connection.query(`
          INSERT INTO activitylog (id, tenantId, action, logName, details, createdAt) 
          VALUES (?, ?, ?, 'Billing', ?, NOW())
        `, [ulid(), payment.tenantId, actionLabel, `${actionLabel} to ${payment.plan} via M-Pesa (${transactionId})`]);

        // 5. SYSTEM NOTIFICATION
        await connection.query(`
          INSERT INTO notification (id, tenantId, title, message, type, status, createdAt) 
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
    await db.query(`UPDATE payment SET status = ?, message = ? WHERE id = ?`, [status, message || 'Failed', payment.id]);
  }
};

export const verifyPayment = async (req, res) => {
  const { tenantId } = req.user;
  const { paymentId } = req.params;

  try {
    const [payments] = await db.query(`SELECT * FROM payment WHERE id = ? AND tenantId = ? LIMIT 1`, [paymentId, tenantId]);
    if (payments.length === 0) return res.status(404).json({ success: false, message: 'Payment not found' });
    
    const payment = payments[0];
    if (payment.status !== 2) return res.json({ success: true, data: payment });

    const checkoutRequestId = payment.mpesaRequestId;
    if (!checkoutRequestId) return res.status(400).json({ success: false, message: 'No mpesaRequestId found' });

    const result = await queryStkPush(checkoutRequestId);
    const message = result.ResultDesc || (result.ResultCode == '0' ? 'Success' : 'Failed');
    const code = String(result.ResultCode);
    
    if (code === '0') {
      await handlePaymentCallback(payment.reference, checkoutRequestId, true, message);
      return res.json({ success: true, data: { status: 0, message, result } });
    } else if (['1032', '1', '2001', '1037', '1019'].includes(code)) {
      // 1032: Canceled, 1: Insufficient Balance, 2001: Wrong PIN, 1037: Timeout, 1019: Expired
      const status = code === '1032' ? 3 : 1;
      await db.query(`UPDATE payment SET status = ?, message = ? WHERE id = ?`, [status, message, payment.id]);
      return res.json({ success: true, data: { status, message, result } });
    }
    
    return res.json({ success: true, data: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const submitManualPayment = async (req, res) => {
  const { tenantId } = req.user;
  const { planName, mpesaCode, amount, phone } = req.body;

  if (!mpesaCode || !planName) {
    return res.status(400).json({ success: false, message: 'M-Pesa Transaction Code and Plan are required' });
  }

  try {
    const [existing] = await db.query(`SELECT id FROM payment WHERE mpesaReceipt = ? LIMIT 1`, [mpesaCode.toUpperCase()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'This transaction code has already been submitted' });
    }

    const reference = `SUB-MAN-${tenantId.slice(-6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const paymentId = ulid();

    // 1. Record the manual payment as PENDING (status 2 or a new status for manual verification)
    // Actually, for hlynk, we might want instant activation if it's a known valid code, 
    // but usually, manual payments need admin approval. 
    // For now, let's record it as status 2 (Awaiting Verification)
    await db.query(`
      INSERT INTO payment (id, tenantId, amount, phone, plan, status, reference, transactionType, mpesaReceipt, message, createdAt) 
      VALUES (?, ?, ?, ?, ?, 2, ?, 'SUBSCRIPTION', ?, 'Manual submission awaiting verification', NOW())
    `, [paymentId, tenantId, amount || PLAN_PRICES[planName], phone || 'MANUAL', planName, reference, mpesaCode.toUpperCase()]);

    // Notify Admins
    const [tenants] = await db.query(`SELECT businessName FROM tenant WHERE id = ?`, [tenantId]);
    const tenantName = tenants[0]?.businessName || 'Tenant';
    
    const [admins] = await db.query(`SELECT tenantId FROM user WHERE role = 'SUPER_ADMIN'`);
    for (const admin of admins) {
      await db.query(`
        INSERT INTO notification (id, tenantId, title, message, type, status, createdAt) 
        VALUES (?, ?, 'Manual Payment Submitted', ?, 'SYSTEM', 0, NOW())
      `, [ulid(), admin.tenantId, `${tenantName} submitted manual code ${mpesaCode} for ${planName} plan.`]);
    }

    return res.json({ 
      success: true, 
      data: { 
        paymentId, 
        message: 'Transaction code submitted! Our team will verify and activate your plan shortly.' 
      } 
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to submit manual payment' });
  }
};

export const getMyPayouts = async (req, res) => {
  const { tenantId } = req.user;
  try {
    const PLATFORM_SHARE_RATE = 0.10;

    // 1. Get trial status
    const [subRows] = await db.query(`SELECT trialEndDate, status FROM subscription WHERE tenantId = ? LIMIT 1`, [tenantId]);
    const sub = subRows[0];
    const trialEnd = sub?.trialEndDate ? new Date(sub.trialEndDate) : null;

    // 2. Get all successful rented payments
    const [payments] = await db.query(`
      SELECT amount, createdAt, status, payoutStatus
      FROM payment 
      WHERE tenantId = ? AND isRented = 1 AND status = 0
    `, [tenantId]);

    let pendingGross = 0;
    let settledGross = 0;
    let pendingNet = 0;
    let settledNet = 0;
    let totalTransactions = payments.length;

    const historyMap = {
      0: { payoutStatus: 0, grossAmount: 0, netAmount: 0, txCount: 0, periodStart: null, periodEnd: null },
      1: { payoutStatus: 1, grossAmount: 0, netAmount: 0, txCount: 0, periodStart: null, periodEnd: null }
    };

    for (const p of payments) {
      const created = new Date(p.createdAt);
      // If payment was made BEFORE or ON trial end date, rate is 0%. Otherwise 10%.
      const isTrialMatch = trialEnd && created <= trialEnd;
      const rate = isTrialMatch ? 0 : PLATFORM_SHARE_RATE;
      const amount = Number(p.amount);
      const net = amount * (1 - rate);

      if (p.payoutStatus === 0) {
        pendingGross += amount;
        pendingNet += net;
      } else {
        settledGross += amount;
        settledNet += net;
      }

      // Update history aggregation
      const h = historyMap[p.payoutStatus];
      h.grossAmount += amount;
      h.netAmount += net;
      h.txCount++;
      if (!h.periodStart || created < new Date(h.periodStart)) h.periodStart = p.createdAt;
      if (!h.periodEnd || created > new Date(h.periodEnd)) h.periodEnd = p.createdAt;
    }

    const history = Object.values(historyMap).filter(h => h.txCount > 0);

    return res.json({
      success: true,
      data: {
        summary: {
          pendingGross,
          pendingNet,
          settledGross,
          settledNet,
          totalTransactions,
          shareRate: PLATFORM_SHARE_RATE,
          isTrialActive: trialEnd && new Date() <= trialEnd
        },
        history
      }
    });
  } catch (err) {
    console.error('[MY-PAYOUTS] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch payout data' });
  }
};
