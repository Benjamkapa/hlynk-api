import { db } from './dbms/mysql.js';

(async () => {
    try {
        const [rows] = await db.query('DESCRIBE sale');
        console.log("SCHEMA:");
        console.log(rows.map(r => r.Field));
        process.exit(0);
    } catch(err) {
        console.error(err);
        process.exit(1);
    }
})();
