import { db } from '../dbms/mysql.js';

async function fixPaymentTable() {
  try {
    const [paymentCols] = await db.query('DESCRIBE payment');
    const paymentColNames = paymentCols.map(c => c.Field);
    if (!paymentColNames.includes('meta')) {
      console.log('Adding meta column to payment table...');
      await db.query('ALTER TABLE payment ADD COLUMN meta JSON DEFAULT NULL');
      console.log('Successfully added meta column.');
    } else {
      console.log('meta column already exists in payment table.');
    }
  } catch (err) {
    console.error('Error adding meta column:', err);
  } finally {
    process.exit();
  }
}

fixPaymentTable();
