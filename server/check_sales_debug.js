import mysql from 'mysql2/promise';
import 'dotenv/config';
import fs from 'fs';

async function check() {
    let output = "";
    try {
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });
        
        const [rows] = await connection.query("SELECT id, totalAmount, status, createdAt, tenantId FROM sale ORDER BY createdAt DESC LIMIT 10");
        output += "RECENT SALES DATA:\n" + JSON.stringify(rows, null, 2) + "\n\n";
        
        const [providers] = await connection.query("SELECT tenantId, businessName FROM provider LIMIT 5");
        output += "PROVIDERS (Tenants):\n" + JSON.stringify(providers, null, 2) + "\n";

        const today = new Date();
        today.setHours(0,0,0,0);
        output += "\nQuery 'today' constant: " + today.toISOString() + "\n";

        const [daily] = await connection.query("SELECT SUM(totalAmount) as sales FROM sale WHERE status = 0 AND createdAt >= ?", [today]);
        output += "DAILY SALES QUERY RESULT: " + JSON.stringify(daily, null, 2) + "\n";
        
        await connection.end();
    } catch (err) {
        output += "ERROR: " + err.message + "\n";
    }
    fs.writeFileSync('db_sales_check.txt', output);
}

check();
