import { db } from '../dbms/mysql.js';

async function update() {
  try {
    const [columns] = await db.query('SHOW COLUMNS FROM Payment');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('phone')) {
      console.log('Adding phone column to Payment table...');
      await db.query('ALTER TABLE Payment ADD COLUMN phone VARCHAR(20) AFTER amount');
      console.log('✅ Phone column added.');
    } else {
      console.log('Phone column already exists.');
    }
    process.exit(0);
  } catch (err) {
    console.error('❌ Update failed:', err);
    process.exit(1);
  }
}

update();
