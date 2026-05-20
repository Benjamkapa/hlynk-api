import { db } from '../dbms/mysql.js';

async function migrateStatuses() {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    console.log('Migrating statuses to integers...');

    // 1. Update payment Table
    console.log('Updating payment table...');
    await connection.query(`ALTER TABLE payment MODIFY COLUMN status VARCHAR(20)`); // Ensure it can hold the temp string if needed, though we are going to TINYINT
    
    // Create a temporary column to store the integer status
    await connection.query(`ALTER TABLE payment ADD COLUMN status_int TINYINT DEFAULT 2`);
    
    await connection.query(`UPDATE payment SET status_int = 0 WHERE status IN ('PAID', 'SUCCESS', 'COMPLETED')`);
    await connection.query(`UPDATE payment SET status_int = 1 WHERE status IN ('FAILED', 'ERROR')`);
    await connection.query(`UPDATE payment SET status_int = 2 WHERE status IN ('PENDING')`);
    await connection.query(`UPDATE payment SET status_int = 3 WHERE status IN ('CANCELLED')`);
    
    await connection.query(`ALTER TABLE payment DROP COLUMN status`);
    await connection.query(`ALTER TABLE payment CHANGE COLUMN status_int status TINYINT DEFAULT 2`);
    await connection.query(`CREATE INDEX idx_payment_status ON payment(status)`);
    await connection.query(`CREATE INDEX idx_payment_ref ON payment(reference)`);

    // 2. Update sale Table
    console.log('Updating sale table...');
    await connection.query(`ALTER TABLE sale ADD COLUMN status_int TINYINT DEFAULT 2`);
    
    await connection.query(`UPDATE sale SET status_int = 0 WHERE status IN ('COMPLETED', 'SUCCESS', 'PAID')`);
    await connection.query(`UPDATE sale SET status_int = 1 WHERE status IN ('FAILED', 'ERROR')`);
    await connection.query(`UPDATE sale SET status_int = 2 WHERE status IN ('PENDING')`);
    await connection.query(`UPDATE sale SET status_int = 3 WHERE status IN ('CANCELLED')`);
    
    await connection.query(`ALTER TABLE sale DROP COLUMN status`);
    await connection.query(`ALTER TABLE sale CHANGE COLUMN status_int status TINYINT DEFAULT 2`);
    await connection.query(`CREATE INDEX idx_sale_status ON sale(status)`);
    await connection.query(`CREATE INDEX idx_sale_tenant ON sale(tenantId)`);

    // 3. Update subscription Table
    console.log('Updating subscription table...');
    await connection.query(`ALTER TABLE subscription ADD COLUMN status_int TINYINT DEFAULT 0`);
    
    await connection.query(`UPDATE subscription SET status_int = 0 WHERE status IN ('ACTIVE')`);
    await connection.query(`UPDATE subscription SET status_int = 1 WHERE status IN ('EXPIRED', 'INACTIVE')`);
    await connection.query(`UPDATE subscription SET status_int = 2 WHERE status IN ('PENDING', 'TRIAL')`);
    
    await connection.query(`ALTER TABLE subscription DROP COLUMN status`);
    await connection.query(`ALTER TABLE subscription CHANGE COLUMN status_int status TINYINT DEFAULT 0`);
    await connection.query(`CREATE INDEX idx_sub_status ON subscription(status)`);
    await connection.query(`CREATE INDEX idx_sub_tenant ON subscription(tenantId)`);

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
