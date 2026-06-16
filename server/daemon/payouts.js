import cron from 'node-cron';
import { db } from '../dbms/mysql.js';
import { initiateB2C } from '../utils/mpesa.js';
import { ulid } from 'ulid';

/**
 * Payout Daemon
 * 
 * Runs weekly on Mondays at 6:00 AM (EAT / UTC+3 = 3:00 AM UTC)
 * 
 * 1. Batch all PENDING vendor settlements (rented paybill 85/15 split)
 * 2. Batch all PENDING referral bonuses
 * 3. Initiate M-Pesa B2C for each
 * 4. Mark payouts as PROCESSING → callbacks will finalize to PAID/FAILED
 */

const PLATFORM_SHARE_RATE = 0.15;

export const startPayoutDaemon = () => {
  // Every Monday at 3:00 AM UTC (6:00 AM EAT)
  cron.schedule('0 3 * * 1', async () => {
    console.log('[Payout Daemon] 🏦 Weekly payout cycle starting...');

    try {
      // ── Step 1: Create vendor settlement payouts from accrued rented payments ──
      await createVendorSettlements();

      // ── Step 2: Process all PENDING payouts via B2C ──
      await processPendingPayouts();

      console.log('[Payout Daemon] ✅ Weekly cycle complete.');
    } catch (err) {
      console.error('[Payout Daemon] ❌ Critical error:', err);
    }
  });

  // console.log('🏦 [Daemon] Payout scheduler started (Weekly Monday 06:00 EAT).');
};

/**
 * Create vendor settlement payout records from accrued rented-paybill payments.
 * Groups unpaid rented payments by tenant, calculates net (after 15% platform share),
 * and inserts a PENDING payout for each tenant.
 */
async function createVendorSettlements() {
  const [accruedPayments] = await db.query(`
    SELECT 
      p.tenantId,
      p.amount,
      p.createdAt,
      s.trialEndDate
    FROM payment p
    LEFT JOIN subscription s ON s.tenantId = p.tenantId
    WHERE p.isRented = 1 AND p.payoutStatus = 0 AND p.status = 0
  `);

  if (accruedPayments.length === 0) {
    console.log('[Payout Daemon] No accrued vendor payments to settle.');
    return;
  }

  // Group by tenant
  const grouped = accruedPayments.reduce((acc, p) => {
    if (!acc[p.tenantId]) {
      acc[p.tenantId] = { tenantId: p.tenantId, totalGross: 0, platformShare: 0, txCount: 0 };
    }
    const g = acc[p.tenantId];
    const trialEnd = p.trialEndDate ? new Date(p.trialEndDate) : null;
    const rate = (trialEnd && new Date(p.createdAt) <= trialEnd) ? 0 : PLATFORM_SHARE_RATE;
    const amount = Number(p.amount);
    g.totalGross += amount;
    g.platformShare += amount * rate;
    g.txCount++;
    return acc;
  }, {});

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    for (const g of Object.values(grouped)) {
      const netSettlement = Math.round(g.totalGross - g.platformShare);
      if (netSettlement < 10) continue; // Skip tiny amounts (M-Pesa minimum)

      const payoutId = ulid();
      await connection.query(`
        INSERT INTO payout (id, tenantId, amount, status, type, message, createdAt)
        VALUES (?, ?, ?, 'PENDING', 'VENDOR', ?, NOW())
      `, [
        payoutId,
        g.tenantId,
        netSettlement,
        `Weekly vendor settlement: ${g.txCount} transactions, Gross KES ${g.totalGross}, Platform share KES ${Math.round(g.platformShare)}`
      ]);

      // Mark the source payments as "batched" (payoutStatus = 1)
      await connection.query(`
        UPDATE payment SET payoutStatus = 1, updatedAt = NOW() 
        WHERE tenantId = ? AND isRented = 1 AND payoutStatus = 0 AND status = 0
      `, [g.tenantId]);

      console.log(`[Payout Daemon] Created vendor payout ${payoutId} for tenant ${g.tenantId}: KES ${netSettlement}`);
    }

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    console.error('[Payout Daemon] Vendor settlement error:', err);
  } finally {
    connection.release();
  }
}

/**
 * Process all PENDING payouts by initiating M-Pesa B2C disbursements.
 * Looks up each tenant's payout account (phone number) and sends money.
 */
async function processPendingPayouts() {
  const [pendingPayouts] = await db.query(`
    SELECT p.*, t.businessName, t.payoutAccount, u.phone as tenantPhone
    FROM payout p
    JOIN tenant t ON p.tenantId = t.id
    LEFT JOIN user u ON t.id = u.tenantId AND u.role = 'PROVIDER'
    WHERE p.status = 'PENDING'
    ORDER BY p.createdAt ASC
  `);

  if (pendingPayouts.length === 0) {
    console.log('[Payout Daemon] No pending payouts to process.');
    return;
  }

  console.log(`[Payout Daemon] Processing ${pendingPayouts.length} pending payouts...`);

  let successCount = 0;
  let failCount = 0;

  for (const payout of pendingPayouts) {
    const phone = payout.payoutAccount || payout.tenantPhone;
    if (!phone) {
      console.warn(`[Payout Daemon] Skipping payout ${payout.id} — no phone number for tenant ${payout.tenantId}`);
      await db.query(`UPDATE payout SET status = 'FAILED', message = 'No payout phone number configured', updatedAt = NOW() WHERE id = ?`, [payout.id]);
      failCount++;
      continue;
    }

    const amount = Number(payout.amount);
    if (amount < 10) {
      console.warn(`[Payout Daemon] Skipping payout ${payout.id} — amount KES ${amount} below minimum`);
      await db.query(`UPDATE payout SET status = 'FAILED', message = 'Amount below M-Pesa minimum (KES 10)', updatedAt = NOW() WHERE id = ?`, [payout.id]);
      failCount++;
      continue;
    }

    try {
      // Mark as PROCESSING before initiating
      await db.query(`UPDATE payout SET status = 'PROCESSING', updatedAt = NOW() WHERE id = ?`, [payout.id]);

      const result = await initiateB2C({
        amount,
        phone,
        payoutId: payout.id,
        tenantId: payout.tenantId,
        remarks: `Hlynk ${payout.type} Payout - ${payout.businessName || payout.tenantId}`
      });

      console.log(`[Payout Daemon] B2C initiated for ${payout.id} | ConvID: ${result.ConversationID} | Desc: ${result.ResponseDescription}`);
      successCount++;

      // Add a small delay between B2C requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.error(`[Payout Daemon] B2C failed for payout ${payout.id}:`, err.message);
      await db.query(`UPDATE payout SET status = 'FAILED', message = ?, updatedAt = NOW() WHERE id = ?`, [err.message, payout.id]);
      failCount++;
    }
  }

  // Log summary
  await db.query(`
    INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
    VALUES (?, 'SYSTEM', NULL, 'Automated Payout Cycle', 'System', ?, NOW())
  `, [
    ulid(),
    `Weekly payout cycle: ${successCount} initiated, ${failCount} failed out of ${pendingPayouts.length} total.`
  ]);

  console.log(`[Payout Daemon] Cycle summary: ${successCount} initiated, ${failCount} failed.`);
}
