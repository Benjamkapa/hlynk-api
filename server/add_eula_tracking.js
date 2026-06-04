import { db } from './dbms/mysql.js';
import fs from 'fs';

async function upgrade() {
  const log = (msg) => {
    console.log(msg);
    fs.appendFileSync('./upgrade_log.txt', msg + '\n');
  };

  try {
    log('--- Adding EULA Tracking to User Table ---');
    
    const [cols] = await db.query('SHOW COLUMNS FROM user');
    const colNames = cols.map(c => c.Field);
    log('Current user columns: ' + colNames.join(', '));

    if (!colNames.includes('eulaAcceptedAt')) {
      log('Adding eulaAcceptedAt to user...');
      await db.query('ALTER TABLE user ADD COLUMN eulaAcceptedAt DATETIME DEFAULT NULL AFTER photoUrl');
    }

    log('✅ EULA tracking added.');
    process.exit(0);
  } catch (err) {
    log('❌ Upgrade failed: ' + err.message);
    process.exit(1);
  }
}
upgrade();
