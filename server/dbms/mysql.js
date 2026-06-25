import mysql from 'mysql2/promise';
import 'dotenv/config';

// Database configuration
// Priority: DATABASE_URL > individual env vars > defaults
const connectionString = process.env.DATABASE_URL;

const dbConfig = connectionString ? {
  uri: connectionString,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
} : {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
};

export const pool = mysql.createPool(dbConfig);

export const db = {
  query: async (sql, params) => {
    return pool.query(sql, params);
  },
  getConnection: async () => {
    return pool.getConnection();
  }
};

// Automatic migrations
(async () => {
  try {
    const [cols] = await db.query("SHOW COLUMNS FROM saleitem");
    if (!cols.some(c => c.Field === 'buyingPrice')) {
      console.log('[DB] Missing buyingPrice in saleitem. Migrating...');
      await db.query("ALTER TABLE saleitem ADD COLUMN buyingPrice DECIMAL(15,2) DEFAULT 0.00 AFTER price");
      console.log('[DB] Migration successful!');
      
      // Perform one-time backfill for old records
      console.log('[DB] Backfilling buyingPrice in saleitem...');
      const [result] = await db.query(`
        UPDATE saleitem si
        JOIN product p ON si.productId = p.id
        SET si.buyingPrice = p.buyingPrice
        WHERE (si.buyingPrice = 0 OR si.buyingPrice IS NULL) 
        AND p.buyingPrice > 0 
        AND IFNULL(p.type, 'GOOD') != 'SERVICE'
      `);
      console.log(`[DB] Backfill complete. Records updated: ${result.affectedRows}`);
    }
  } catch (err) {
    console.error('[DB] Auto-migration/backfill failed:', err.message);
  }
})();
