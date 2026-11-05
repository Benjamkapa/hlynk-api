import { db } from './dbms/mysql.js';

(async () => {
    const connection = await db.getConnection();
    try {
        console.log("Adding source column if not exists...");
        const [columns] = await connection.query(`SHOW COLUMNS FROM sale LIKE 'source'`);
        if (columns.length === 0) {
            await connection.query(`ALTER TABLE sale ADD COLUMN source VARCHAR(100) DEFAULT 'In-Store' AFTER paymentMethod`);
            console.log("Added source column to sale table.");
        } else {
            console.log("source column already exists.");
        }
    } catch(err) {
        console.error("Migration Error:", err);
    } finally {
        connection.release();
        process.exit(0);
    }
})();
