import { db, pool } from '../dbms/mysql.js';

async function setup() {
  console.log('--- Setting up KCB and eTIMS Tables ---');
  try {
    // Create kcblog table
    await db.query(`
      CREATE TABLE IF NOT EXISTS kcblog (
        id VARCHAR(255) PRIMARY KEY,
        merchantRequestId VARCHAR(255),
        checkoutRequestId VARCHAR(255),
        phone VARCHAR(20),
        amount DECIMAL(10, 2),
        reference VARCHAR(255),
        customerName VARCHAR(255),
        initiatorName VARCHAR(255),
        tenantName VARCHAR(255),
        tenantId VARCHAR(255),
        status TINYINT DEFAULT 2,
        -- 0: Success | 1: Failed | 2: Pending | 3: Cancelled (user) | 4: Expired (timeout)
        resultCode VARCHAR(50),
        resultDesc TEXT,
        rawPayload TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX (checkoutRequestId),
        INDEX (tenantId)
      )
    `);
    console.log('✅ kcblog table created or already exists.');

    // Patch existing kcblog table if updatedAt column is missing
    const [kcbCols] = await db.query('SHOW COLUMNS FROM kcblog');
    const kcbColNames = kcbCols.map(c => c.Field);
    if (!kcbColNames.includes('updatedAt')) {
      await db.query(`ALTER TABLE kcblog ADD COLUMN updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER createdAt`);
      console.log('✅ Added updatedAt to kcblog table.');
    }

    // Add mpesaRequestId to sale if missing (aliased for KCB as well)
    const [saleCols] = await db.query('SHOW COLUMNS FROM sale');
    const saleColNames = saleCols.map(c => c.Field);
    if (!saleColNames.includes('mpesaRequestId')) {
      console.log('Adding mpesaRequestId to sale table...');
      await db.query('ALTER TABLE sale ADD COLUMN mpesaRequestId VARCHAR(255) AFTER paymentMethod');
    }

    // Add mpesaRequestId to payment if missing
    const [payCols] = await db.query('SHOW COLUMNS FROM payment');
    const payColNames = payCols.map(c => c.Field);
    if (!payColNames.includes('mpesaRequestId')) {
      console.log('Adding mpesaRequestId to payment table...');
      await db.query('ALTER TABLE payment ADD COLUMN mpesaRequestId VARCHAR(255) AFTER reference');
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Setup failed:', err.message);
    if (pool) await pool.end();
    process.exit(1);
  }
}

setup();
