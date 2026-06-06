import { db } from './dbms/mysql.js';

async function check() {
  try {
    const [rows] = await db.query('SELECT operationalSettings FROM provider');
    console.log('--- Provider Configs ---');
    rows.forEach((row, i) => {
      console.log(`Provider ${i+1}:`, row.operationalSettings);
    });
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

check();
