import { db } from '../dbms/mysql.js';

async function migrateStatuses() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    console.log('Migrating statuses to integers...');

    // 1. Update Payment Table
    console.log('Updating Payment table...');
    await connection.query(`ALTER TABLE Payment MODIFY COLUMN status VARCHAR(20)`); // Ensure it can hold the temp string if needed, though we are going to TINYINT
    
    // Create a temporary column to store the integer status
    await connection.query(`ALTER TABLE Payment ADD COLUMN status_int TINYINT DEFAULT 2`);
    
    await connection.query(`UPDATE Payment SET status_int = 0 WHERE status IN ('PAID', 'SUCCESS', 'COMPLETED')`);
    await connection.query(`UPDATE Payment SET status_int = 1 WHERE status IN ('FAILED', 'ERROR')`);
    await connection.query(`UPDATE Payment SET status_int = 2 WHERE status IN ('PENDING')`);
    await connection.query(`UPDATE Payment SET status_int = 3 WHERE status IN ('CANCELLED')`);
    
    await connection.query(`ALTER TABLE Payment DROP COLUMN status`);
    await connection.query(`ALTER TABLE Payment CHANGE COLUMN status_int status TINYINT DEFAULT 2`);
    await connection.query(`CREATE INDEX idx_payment_status ON Payment(status)`);
    await connection.query(`CREATE INDEX idx_payment_ref ON Payment(reference)`);

    // 2. Update Sale Table
    console.log('Updating Sale table...');
    await connection.query(`ALTER TABLE Sale ADD COLUMN status_int TINYINT DEFAULT 2`);
    
    await connection.query(`UPDATE Sale SET status_int = 0 WHERE status IN ('COMPLETED', 'SUCCESS', 'PAID')`);
    await connection.query(`UPDATE Sale SET status_int = 1 WHERE status IN ('FAILED', 'ERROR')`);
    await connection.query(`UPDATE Sale SET status_int = 2 WHERE status IN ('PENDING')`);
    await connection.query(`UPDATE Sale SET status_int = 3 WHERE status IN ('CANCELLED')`);
    
    await connection.query(`ALTER TABLE Sale DROP COLUMN status`);
    await connection.query(`ALTER TABLE Sale CHANGE COLUMN status_int status TINYINT DEFAULT 2`);
    await connection.query(`CREATE INDEX idx_sale_status ON Sale(status)`);
    await connection.query(`CREATE INDEX idx_sale_tenant ON Sale(tenantId)`);

    // 3. Update Subscription Table
    console.log('Updating Subscription table...');
    await connection.query(`ALTER TABLE Subscription ADD COLUMN status_int TINYINT DEFAULT 0`);
    
    await connection.query(`UPDATE Subscription SET status_int = 0 WHERE status IN ('ACTIVE')`);
    await connection.query(`UPDATE Subscription SET status_int = 1 WHERE status IN ('EXPIRED', 'INACTIVE')`);
    await connection.query(`UPDATE Subscription SET status_int = 2 WHERE status IN ('PENDING', 'TRIAL')`);
    
    await connection.query(`ALTER TABLE Subscription DROP COLUMN status`);
    await connection.query(`ALTER TABLE Subscription CHANGE COLUMN status_int status TINYINT DEFAULT 0`);
    await connection.query(`CREATE INDEX idx_sub_status ON Subscription(status)`);
    await connection.query(`CREATE INDEX idx_sub_tenant ON Subscription(tenantId)`);

    await connection.commit();
    console.log('✅ Status migration and optimization completed.');
    process.exit(0);
  } catch (err) {
    await connection.rollback();
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    connection.release();
  }
}

migrateStatuses();
