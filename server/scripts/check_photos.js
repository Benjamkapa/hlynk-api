import { db, pool } from '../dbms/mysql.js';

async function check() {
  try {
    const [rows] = await db.query('SELECT name, email, role, photoUrl FROM User');
    console.log(JSON.stringify(rows, null, 2));
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error(err);
    if (pool) await pool.end();
    process.exit(1);
  }
}

check();
