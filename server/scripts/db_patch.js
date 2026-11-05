import { db } from 'file:///c:/PROJECTS/hlynk/api/server/dbms/mysql.js';

async function run() {
  try {
    await db.query(`ALTER TABLE saleitem ADD COLUMN buyingPrice DECIMAL(10,2) DEFAULT NULL;`);
    console.log("buyingPrice added to saleitem successfully.");
  } catch (err) {
    if (err.code === 'ER_DUP_FIELDNAME') {
      console.log("Column buyingPrice already exists.");
    } else {
      console.error(err);
    }
  }
  process.exit(0);
}

run();
