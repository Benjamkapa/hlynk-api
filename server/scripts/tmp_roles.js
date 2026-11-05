import { db } from './dbms/mysql.js';
async function test() {
  try {
    const [rows] = await db.query("SELECT email, role FROM user");
    console.log("USERS:", rows);
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}
test();
