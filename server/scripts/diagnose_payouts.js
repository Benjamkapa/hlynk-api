/**
 * diagnose_payouts.js
 * Quick diagnostic to understand the current state of payment records
 */
import { db } from '../dbms/mysql.js';

async function run() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  Payout Diagnostics');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    // 1. Total payment records
    const [[totals]] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 0 THEN 1 ELSE 0 END) as success,
        SUM(CASE WHEN transactionType = 'SALE' THEN 1 ELSE 0 END) as sales,
        SUM(CASE WHEN isRented = 1 THEN 1 ELSE 0 END) as rented,
        SUM(CASE WHEN transactionType = 'SALE' AND status = 0 AND payoutStatus = 0 THEN 1 ELSE 0 END) as accruing
      FROM payment
    `);
    console.log('📊 Payment Table Summary:');
    console.log(`   Total records:          ${totals.total}`);
    console.log(`   Successful (status=0):  ${totals.success}`);
    console.log(`   SALE type:              ${totals.sales}`);
    console.log(`   isRented = 1:           ${totals.rented}`);
    console.log(`   Accruing (SALE+success+unpaid): ${totals.accruing}`);

    // 2. mpesalog isRented breakdown
    const [[mlog]] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN isRented = 1 THEN 1 ELSE 0 END) as rented,
        SUM(CASE WHEN isRented = 0 THEN 1 ELSE 0 END) as notRented
      FROM mpesalog WHERE type = 0
    `);
    console.log('\n📋 mpesalog (type=0 = STK initiations):');
    console.log(`   Total initiations:    ${mlog.total}`);
    console.log(`   isRented = 1:         ${mlog.rented}`);
    console.log(`   isRented = 0:         ${mlog.notRented}`);

    // 3. Per-tenant SALE payment breakdown
    const [tenantBreakdown] = await db.query(`
      SELECT 
        t.businessName,
        p.tenantId,
        COUNT(*) as txCount,
        SUM(p.amount) as totalAmount,
        SUM(CASE WHEN p.isRented = 1 THEN 1 ELSE 0 END) as rentedCount,
        SUM(CASE WHEN p.status = 0 AND p.payoutStatus = 0 THEN 1 ELSE 0 END) as accruing,
        SUM(CASE WHEN p.status = 0 AND p.payoutStatus = 0 THEN p.amount ELSE 0 END) as accruingAmount
      FROM payment p
      JOIN tenant t ON p.tenantId = t.id
      WHERE p.transactionType = 'SALE'
      GROUP BY p.tenantId, t.businessName
      ORDER BY totalAmount DESC
    `);

    console.log('\n📋 SALE Payments Per Tenant:');
    for (const row of tenantBreakdown) {
      console.log(`\n  📁 ${row.businessName} (${row.tenantId})`);
      console.log(`     Total SALE txns:    ${row.txCount}`);
      console.log(`     isRented = 1:       ${row.rentedCount}`);
      console.log(`     Accruing txns:      ${row.accruing}`);
      console.log(`     Accruing amount:    KES ${Number(row.accruingAmount || 0).toLocaleString()}`);
    }

    // 4. Check provider operationalSettings
    const [providers] = await db.query(`
      SELECT p.tenantId, t.businessName,
             CASE WHEN p.operationalSettings IS NULL OR p.operationalSettings = '{}' OR p.operationalSettings = '' 
                  THEN 'NO_SETTINGS' 
                  WHEN p.operationalSettings LIKE '%consumerKey%' 
                  THEN 'HAS_CREDENTIALS'
                  ELSE 'EMPTY_SETTINGS'
             END as credentialStatus
      FROM provider p
      JOIN tenant t ON p.tenantId = t.id
    `);

    console.log('\n📋 Provider Credential Status:');
    for (const p of providers) {
      console.log(`  ${p.businessName}: ${p.credentialStatus}`);
    }

    // 5. Show what getPayouts WOULD return right now
    const [accrued] = await db.query(`
      SELECT p.tenantId, t.businessName, COUNT(*) as txCount, SUM(p.amount) as gross
      FROM payment p
      JOIN tenant t ON p.tenantId = t.id
      WHERE p.transactionType = 'SALE'
        AND p.status = 0
        AND p.payoutStatus = 0
      GROUP BY p.tenantId, t.businessName
    `);

    console.log('\n💡 What SHOULD show in Payouts (all SALE, successful, unpaid):');
    if (accrued.length === 0) {
      console.log('   ⚠️ NOTHING — no successful SALE payments with payoutStatus=0');
    } else {
      for (const a of accrued) {
        const net = Number(a.gross) * 0.85;
        const cut = Number(a.gross) * 0.15;
        console.log(`   ${a.businessName}: ${a.txCount} txns | KES ${Number(a.gross).toLocaleString()} gross | KES ${Math.floor(net).toLocaleString()} net | KES ${Math.floor(cut).toLocaleString()} platform`);
      }
    }

  } catch (err) {
    console.error('❌ Diagnostic failed:', err.message);
  } finally {
    await db.end?.().catch(() => {});
    process.exit(0);
  }
}

run();
