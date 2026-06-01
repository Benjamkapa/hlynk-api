import { db } from './dbms/mysql.js';

async function check() {
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM payment');
    console.log('PAYMENT_COLUMNS:', columns.map(c => c.Field).join(', '));
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err);
    process.exit(1);
  }
}
check();
