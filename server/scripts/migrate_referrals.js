import { db } from '../dbms/mysql.js';

async function migrate() {
  console.log('--- Starting Referral & Payout Migration ---');
  try {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Update Tenant Table
      const [tenantCols] = await connection.query('SHOW COLUMNS FROM tenant');
      const tenantColNames = tenantCols.map(c => c.Field);

      if (!tenantColNames.includes('referralCode')) {
        console.log('Adding referralCode to tenant...');
        await connection.query('ALTER TABLE tenant ADD COLUMN referralCode VARCHAR(20) UNIQUE AFTER slug');
      }
      if (!tenantColNames.includes('referredById')) {
        console.log('Adding referredById to tenant...');
        await connection.query('ALTER TABLE tenant ADD COLUMN referredById VARCHAR(50) AFTER referralCode');
        await connection.query('ALTER TABLE tenant ADD CONSTRAINT fk_tenant_referredBy FOREIGN KEY (referredById) REFERENCES user(id) ON DELETE SET NULL');
      }
      if (!tenantColNames.includes('payoutMethod')) {
        console.log('Adding payoutMethod to tenant...');
        await connection.query('ALTER TABLE tenant ADD COLUMN payoutMethod VARCHAR(50) DEFAULT "MPESA" AFTER isActive');
      }
      if (!tenantColNames.includes('payoutAccount')) {
        console.log('Adding payoutAccount to tenant...');
        await connection.query('ALTER TABLE tenant ADD COLUMN payoutAccount VARCHAR(50) AFTER payoutMethod');
      }

      // 2. Create Payout Table
      console.log('Creating payout table...');
      await connection.query(`
        CREATE TABLE IF NOT EXISTS payout (
          id VARCHAR(50) PRIMARY KEY,
          tenantId VARCHAR(50) NOT NULL,
          amount DECIMAL(15, 2) NOT NULL,
          status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PAID, CANCELLED
          type VARCHAR(20) NOT NULL, -- REFERRAL, VENDOR_PAYOUT
          refereeId VARCHAR(50), -- User ID of the person getting paid (for REFERRAL)
          sourceId VARCHAR(50), -- Sale ID or Subscription payment ID that triggered this
          message TEXT,
          processedAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          FOREIGN KEY (tenantId) REFERENCES tenant(id) ON DELETE CASCADE
        )
      `);

      // 3. Generate referral codes for existing tenants
      const [tenants] = await connection.query('SELECT id, businessName FROM tenant WHERE referralCode IS NULL');
      for (const tenant of tenants) {
        const code = (tenant.businessName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase());
        await connection.query('UPDATE tenant SET referralCode = ? WHERE id = ?', [code, tenant.id]);
      }

      await connection.commit();
      console.log('✅ Migration successful.');
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    process.exit(0);
  }
}

migrate();
