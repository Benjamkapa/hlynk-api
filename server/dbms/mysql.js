import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env'), quiet: true });

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

/**
 * Auto-run schema migrations safely after DB connection is established
 */
export const runAutoMigrations = async () => {
  try {
    // 1. Notification table columns
    const [notifCols] = await pool.query("SHOW COLUMNS FROM notification").catch(() => [[]]);
    const notifFieldNames = (notifCols || []).map(c => c.Field);

    if (notifFieldNames.length && !notifFieldNames.includes('relatedTenantId')) {
      await pool.query('ALTER TABLE notification ADD COLUMN relatedTenantId VARCHAR(36) NULL;');
      console.log('🔔 [DB] Added relatedTenantId to notification table.');
    }
    if (notifFieldNames.length && !notifFieldNames.includes('referenceId')) {
      await pool.query('ALTER TABLE notification ADD COLUMN referenceId VARCHAR(36) NULL;');
      console.log('🔔 [DB] Added referenceId to notification table.');
    }
    if (notifFieldNames.length && !notifFieldNames.includes('referenceType')) {
      await pool.query('ALTER TABLE notification ADD COLUMN referenceType VARCHAR(50) NULL;');
      console.log('🔔 [DB] Added referenceType to notification table.');
    }

    // 2. SaleItem table: buyingPrice & backfill
    const [saleCols] = await pool.query("SHOW COLUMNS FROM saleitem").catch(() => [[]]);
    const saleFieldNames = (saleCols || []).map(c => c.Field);

    if (saleFieldNames.length && !saleFieldNames.includes('buyingPrice')) {
      console.log('📦 [DB] Missing buyingPrice in saleitem. Migrating...');
      await pool.query("ALTER TABLE saleitem ADD COLUMN buyingPrice DECIMAL(15,2) DEFAULT 0.00 AFTER price");
      console.log('✅ [DB] Successfully added buyingPrice to saleitem!');

      // Perform one-time backfill for old records
      console.log('⏳ [DB] Backfilling buyingPrice in saleitem...');
      const [result] = await pool.query(`
        UPDATE saleitem si
        JOIN product p ON si.productId = p.id
        SET si.buyingPrice = p.buyingPrice
        WHERE (si.buyingPrice = 0 OR si.buyingPrice IS NULL) 
        AND p.buyingPrice > 0 
        AND IFNULL(p.type, 'GOOD') != 'SERVICE'
      `);
      console.log(`✅ [DB] Backfill complete. Records updated: ${result.affectedRows}`);
    }
    // 3. Session table: displacedBy column for admin single-session enforcement
    const [sessionCols] = await pool.query("SHOW COLUMNS FROM session").catch(() => [[]]);
    const sessionFieldNames = (sessionCols || []).map(c => c.Field);

    if (sessionFieldNames.length && !sessionFieldNames.includes('displacedBy')) {
      await pool.query('ALTER TABLE session ADD COLUMN displacedBy VARCHAR(64) NULL DEFAULT NULL;');
      console.log('🔒 [DB] Added displacedBy to session table (admin single-session enforcement).');
    }
  } catch (err) {
    console.warn('⚠️ [DB] Auto-migration notice:', err.message);
  }
};
