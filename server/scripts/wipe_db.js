import { db } from '../dbms/mysql.js';

async function wipe() {
  console.log('⚠️  WARNING: PERMANENTLY WIPING ALL DATA IN 3 SECONDS...');
  await new Promise(r => setTimeout(r, 3000));

  const connection = await db.getConnection();
  try {
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    
    const tables = [
      'activitylog', 'mpesalog', 'notification', 'payment', 'saleitem', 'sale', 
      'product', 'subscription', 'provider', 'session', 'customer', 'user', 'tenant',
      'platformreview', 'expense', 'staff', 'service', 'request'
    ];

    for (const table of tables) {
      try {
        await connection.query(`TRUNCATE TABLE ${table}`);
        console.log(`✅ Wiped: ${table}`);
      } catch (e) {
        console.warn(`❌ Could not wipe ${table}: ${e.message}`);
      }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✨ DATABASE WIPED CLEAN. A FRESH START AWAITS.');
    process.exit(0);
  } catch (err) {
    console.error('💥 CRITICAL ERROR DURING WIPE:', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

wipe();
