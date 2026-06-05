const mysql = require('mysql2/promise');
require('dotenv').config();

async function fix() {
  console.log('Connecting to DB...');
  const connection = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    console.log('Checking columns...');
    const [cols] = await connection.query('SHOW COLUMNS FROM user');
    const colNames = cols.map(c => c.Field);
    console.log('Columns:', colNames.join(', '));
    
    if (!colNames.includes('eulaAcceptedAt')) {
      console.log('Adding eulaAcceptedAt...');
      await connection.query('ALTER TABLE user ADD COLUMN eulaAcceptedAt DATETIME DEFAULT NULL AFTER photoUrl');
      console.log('✅ Success!');
    } else {
      console.log('✅ Already exists.');
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await connection.end();
    process.exit(0);
  }
}
fix();
