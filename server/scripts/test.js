import { db } from './dbms/mysql.js';

async function run() {
    const [rows] = await db.query('SHOW CREATE TABLE notification');
    console.log(rows[0]['Create Table']);
    process.exit(0);
}
run();
