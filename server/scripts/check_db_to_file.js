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
        
        const [columns] = await connection.query("SHOW COLUMNS FROM saleitem");
        output += "SALEITEM COLUMNS:\n" + JSON.stringify(columns, null, 2) + "\n\n";
        
        const [prodColumns] = await connection.query("SHOW COLUMNS FROM product");
        output += "PRODUCT COLUMNS:\n" + JSON.stringify(prodColumns, null, 2) + "\n";
        
        await connection.end();
    } catch (err) {
        output += "ERROR: " + err.message + "\n";
    }
    fs.writeFileSync('db_check_result.txt', output);
}

check();
