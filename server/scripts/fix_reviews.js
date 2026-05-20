import { db } from '../dbms/mysql.js';

async function run() {
  try {
    console.log('--- DB FIX START ---');
    const [cols] = await db.query('DESCRIBE PlatformReview');
    const hasStatus = cols.some(c => c.Field === 'status');
    
    if (!hasStatus) {
      console.log('Adding status column...');
      await db.query('ALTER TABLE PlatformReview ADD COLUMN status INT DEFAULT 0 AFTER ownerName');
      console.log('✅ Column added successfully.');
    } else {
      console.log('✅ Status column already exists.');
    }
    console.log('--- DB FIX END ---');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB FIX ERROR:', err.message);
    process.exit(1);
  }
}

run();
