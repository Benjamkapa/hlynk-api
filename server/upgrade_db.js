import { db } from './dbms/mysql.js';
import fs from 'fs';

async function upgrade() {
  const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('./upgrade_log.txt', msg + '\n');
  };

  try {
    log('--- Upgrading Database Schema ---');
    
    // Check payment table
    const [payCols] = await db.query('SHOW COLUMNS FROM payment');
    const payColNames = payCols.map(c => c.Field);
    log('Current payment columns: ' + payColNames.join(', '));

    if (!payColNames.includes('isRented')) {
      log('Adding isRented to payment...');
      await db.query('ALTER TABLE payment ADD COLUMN isRented TINYINT DEFAULT 0 AFTER transactionType');
    }

    if (!payColNames.includes('payoutStatus')) {
      log('Adding payoutStatus to payment...');
      await db.query('ALTER TABLE payment ADD COLUMN payoutStatus TINYINT DEFAULT 0 AFTER isRented');
    }

    // Check mpesalog table
    const [logCols] = await db.query('SHOW COLUMNS FROM mpesalog');
    const logColNames = logCols.map(c => c.Field);
    log('Current mpesalog columns: ' + logColNames.join(', '));

    if (!logColNames.includes('isRented')) {
      log('Adding isRented to mpesalog...');
      await db.query('ALTER TABLE mpesalog ADD COLUMN isRented TINYINT DEFAULT 0 AFTER type');
    }

    log('✅ Database upgrade complete.');
    process.exit(0);
  } catch (err) {
    log('❌ Upgrade failed: ' + err.message);
    process.exit(1);
  }
}
upgrade();
