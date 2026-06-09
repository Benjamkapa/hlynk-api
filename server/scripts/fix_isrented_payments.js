/**
 * fix_isrented_payments.js
 * ─────────────────────────────────────────────────────────────────────────
 * One-time backfill: marks payment records as isRented = 1 wherever the
 * corresponding mpesalog initiation entry has isRented = 1 but the payment
 * record still has isRented = 0.
 *
 * This fixes historical records created before the isRented detection logic
 * was corrected in vendorMpesaPush (sales.js).
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   node scripts/fix_isrented_payments.js
 * ─────────────────────────────────────────────────────────────────────────
 */

import { db } from '../dbms/mysql.js';

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  isRented Payment Backfill — Starting');
  console.log('═══════════════════════════════════════════════════════');

  try {
    // ── Step 1: Fix payments whose mpesalog INIT entry has isRented = 1 ──
    const [resultA] = await db.query(`
      UPDATE payment p
      JOIN mpesalog ml ON ml.checkoutRequestId = p.mpesaRequestId
                      AND ml.type = 0
                      AND ml.isRented = 1
      SET p.isRented = 1,
          p.updatedAt = NOW()
      WHERE p.isRented = 0
        AND p.mpesaRequestId IS NOT NULL
    `);
    console.log(`✅  Step 1 – Synced from mpesalog: ${resultA.affectedRows} payment(s) updated.`);

    // ── Step 2: Report how many SALE payments are now correctly tagged ───
    const [[{ rentedCount }]] = await db.query(`
      SELECT COUNT(*) as rentedCount
      FROM payment
      WHERE transactionType = 'SALE' AND isRented = 1 AND status = 0
    `);
    console.log(`📊  Total confirmed rented SALE payments (status=0): ${rentedCount}`);

    // ── Step 3: Compute accrued value (for sanity-check) ────────────────
    const [[{ accrued }]] = await db.query(`
      SELECT SUM(amount) as accrued
      FROM payment
      WHERE isRented = 1 AND payoutStatus = 0 AND status = 0
    `);
    console.log(`💰  Total accrued unpaid amount (isRented=1, payoutStatus=0): KES ${Number(accrued || 0).toLocaleString()}`);

    // ── Step 4: Show per-tenant breakdown ───────────────────────────────
    const [breakdown] = await db.query(`
      SELECT t.businessName, COUNT(p.id) as txCount, SUM(p.amount) as gross
      FROM payment p
      JOIN tenant t ON p.tenantId = t.id
      WHERE p.isRented = 1 AND p.payoutStatus = 0 AND p.status = 0
      GROUP BY p.tenantId
      ORDER BY gross DESC
    `);

    if (breakdown.length === 0) {
      console.log('\n⚠️  No accrued rented payments found for any tenant.');
      console.log('    If you expected data, check:');
      console.log('    1. mpesalog.isRented = 1 for the relevant CheckoutRequestIDs');
      console.log('    2. payment.mpesaRequestId is linked (not NULL)');
      console.log('    3. payment.status = 0 (i.e., the STK push was successful)');
    } else {
      console.log('\n📋  Per-Tenant Accrued Breakdown:');
      console.log('─'.repeat(60));
      for (const row of breakdown) {
        const platform = (Number(row.gross) * 0.15).toFixed(2);
        const net = (Number(row.gross) * 0.85).toFixed(2);
        console.log(`  ${row.businessName.padEnd(30)} | ${String(row.txCount).padStart(4)} tx | Gross: KES ${Number(row.gross).toLocaleString().padStart(10)} | Net: KES ${Number(net).toLocaleString().padStart(10)} | Platform: KES ${Number(platform).toLocaleString()}`);
      }
      console.log('─'.repeat(60));
    }

    console.log('\n✅  Backfill complete. Refresh the Payouts panel in the admin dashboard.');
  } catch (err) {
    console.error('❌  Migration failed:', err.message);
    process.exit(1);
  } finally {
    await db.end?.().catch(() => {});
    process.exit(0);
  }
}

run();
