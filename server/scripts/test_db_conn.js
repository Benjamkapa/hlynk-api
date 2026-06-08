import mysql from 'mysql2/promise';
import 'dotenv/config';

async function test() {
  console.log('--- DB Connection Test ---');
  const url = process.env.DATABASE_URL;
  console.log('URL:', url.replace(/:[^:@]+@/, ':****@')); // mask your password
  
  try {
    const conn = await mysql.createConnection(url);
    console.log('✅ Connected successfully!');
    await conn.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  } finally {
    process.exit(0);
  }
}

test();
