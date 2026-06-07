import { db } from './api/server/dbms/mysql.js';

async function check() {
  console.log('--- Starting DB Check ---');
  try {
    const [tables] = await db.query('SHOW TABLES');
    const tableNames = tables.map(t => Object.values(t)[0]);
    console.log('Tables found:', tableNames.length);
    console.log(tableNames.join(', '));

    for (const table of tableNames) {
      console.log(`\nChecking table: ${table}`);
      const [columns] = await db.query(`SHOW COLUMNS FROM ${table}`);
      console.log(columns.map(c => `${c.Field} (${c.Type})`).join(', '));
    }
  } catch (err) {
    console.error('ERROR:', err);
  } finally {
    console.log('--- Finished DB Check ---');
    process.exit(0);
  }
}

check();
