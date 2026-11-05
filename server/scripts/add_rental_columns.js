import { db } from '../dbms/mysql.js';

async function upgrade() {
  try {
    console.log('--- Upgrading Database Schema for Paybill Rental ---');
    
    // Upgrade Payment table
    const [payCols] = await db.query('SHOW COLUMNS FROM payment');
    const payColNames = payCols.map(c => c.Field);

    if (!payColNames.includes('isRented')) {
      console.log('Adding isRented to payment table...');
      await db.query('ALTER TABLE payment ADD COLUMN isRented TINYINT DEFAULT 0 AFTER transactionType');
    }

    if (!payColNames.includes('payoutStatus')) {
      console.log('Adding payoutStatus to payment table...');
      await db.query('ALTER TABLE payment ADD COLUMN payoutStatus TINYINT DEFAULT 0 AFTER isRented');
    }

    // Upgrade MpesaLog table
    const [logCols] = await db.query('SHOW COLUMNS FROM mpesalog');
    const logColNames = logCols.map(c => c.Field);

    if (!logColNames.includes('isRented')) {
      console.log('Adding isRented to mpesalog table...');
      await db.query('ALTER TABLE mpesalog ADD COLUMN isRented TINYINT DEFAULT 0 AFTER type');
    }

    console.log('✅ Database schema upgraded successfully.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Upgrade failed:', err);
    process.exit(1);
  }
}

upgrade();
