import { db } from '../dbms/mysql.js';

async function audit() {
  console.log('\n🔍 --- PLATFORM HEALTH AUDIT ---');
  console.log(`Generated: ${new Date().toLocaleString()}\n`);

  try {
    // 1. Low Stock Check
    const [lowStock] = await db.query(`
      SELECT p.name, p.stockLevel, t.businessName 
      FROM product p 
      JOIN tenant t ON p.tenantId = t.id 
      WHERE p.stockLevel <= 2 LIMIT 10
    `);
    console.log('📦 LOW STOCK ALERTS (Critical <= 2):');
    if (lowStock.length === 0) console.log('   - All inventory healthy.');
    lowStock.forEach(item => {
      console.log(`   - [${item.businessName}] ${item.name}: ${item.stockLevel} left`);
    });

    // 2. Recent M-Pesa Failures (Last 24h)
    const [failedMpesa] = await db.query(`
      SELECT phone, amount, businessName, createdAt as time, resultDesc
      FROM mpesalog m
      JOIN tenant t ON m.tenantId = t.id
      WHERE m.status = 4 AND m.createdAt >= NOW() - INTERVAL 24 HOUR
      LIMIT 10
    `);
    console.log('\n💳 RECENT M-PESA FAILURES (24h):');
    if (failedMpesa.length === 0) console.log('   - No failed transactions detected.');
    failedMpesa.forEach(f => {
      console.log(`   - [${f.businessName}] ${f.phone} (KES ${f.amount}): ${f.resultDesc}`);
    });

    // 3. Expiry Watchlist (Next 7 Days)
    const [expiring] = await db.query(`
      SELECT t.businessName, s.endDate 
      FROM subscription s 
      JOIN tenant t ON s.tenantId = t.id 
      WHERE s.status = 0 AND s.endDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)
    `);
    console.log('\n⏳ EXPIRY WATCHLIST (Next 7 Days):');
    if (expiring.length === 0) console.log('   - No subscriptions expiring soon.');
    expiring.forEach(e => {
      const days = Math.ceil((new Date(e.endDate) - new Date()) / (1000 * 60 * 60 * 24));
      console.log(`   - ${e.businessName} expires in ${days} days`);
    });

    console.log('\n--- AUDIT COMPLETE ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ Audit Failed:', err.message);
    process.exit(1);
  }
}

audit();
