import mysql from 'mysql2/promise';

async function run() {
  try {
    const conn = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'hlynk'
    });
    
    try {
      await conn.query('ALTER TABLE notification ADD COLUMN relatedTenantId VARCHAR(36) NULL;');
      console.log('Column added successfully');
    } catch(e) {
      if(e.code === 'ER_DUP_FIELDNAME') {
        console.log('Column already exists');
      } else {
        console.log('Query error:', e.message);
      }
    }
    await conn.end();
  } catch(e) {
    console.log('Connection error:', e.message);
  }
}
run();
