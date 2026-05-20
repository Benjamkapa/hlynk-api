import { db } from '../dbms/mysql.js';

async function updateMpesaLogTable() {
  try {
    // Drop the old table if it exists to ensure new schema
    await db.query(`DROP TABLE IF EXISTS mpesalog`);

    await db.query(`
      CREATE TABLE mpesalog (
        id VARCHAR(36) PRIMARY KEY,
        merchantRequestId VARCHAR(100),
        checkoutRequestId VARCHAR(100),
        phone VARCHAR(20),
        amount DECIMAL(10, 2),
        reference VARCHAR(100),
        customerName VARCHAR(100),
        initiatorName VARCHAR(100),
        tenantName VARCHAR(100),
        type TINYINT COMMENT '0: INITIATION, 1: CALLBACK, 2: QUERY',
        status TINYINT COMMENT '0: SUCCESS, 1: FAILED, 2: PENDING, 3: CANCELLED, 4: ERROR',
        resultCode VARCHAR(10),
        resultDesc TEXT,
        rawPayload JSON,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_checkout (checkoutRequestId),
        INDEX idx_reference (reference),
        INDEX idx_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ mpesalog table (optimized) created.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating MpesaLog table:', err);
    process.exit(1);
  }
}

updateMpesaLogTable();
