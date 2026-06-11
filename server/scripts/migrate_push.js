import { db } from '../dbms/mysql.js';

async function migrate() {
  console.log('🚀 Starting Push Notifications Migration...');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS push_subscription (
        id INT AUTO_INCREMENT PRIMARY KEY,
        tenantId VARCHAR(50) NOT NULL,
        userId VARCHAR(50) NOT NULL,
        subscription JSON NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_user_subscription (userId)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('✅ push_subscription table ready.');

    // Add notification settings to tenant or user if needed
    // For now, we'll just use the presence of a subscription as consent.
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrate();
