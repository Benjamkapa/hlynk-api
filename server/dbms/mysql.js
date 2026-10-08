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
    // 0. Harmonize collation across all tables to utf8mb4_unicode_ci to prevent "Illegal mix of collations" and FK incompatibilities
    const [incompatibleTables] = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
        AND table_type = 'BASE TABLE'
        AND table_collation IS NOT NULL 
        AND table_collation != 'utf8mb4_unicode_ci'
    `).catch(() => [[]]);

    if (incompatibleTables && incompatibleTables.length > 0) {
      await pool.query('SET FOREIGN_KEY_CHECKS = 0;').catch(() => {});
      for (const t of incompatibleTables) {
        const tblName = t.TABLE_NAME || t.table_name;
        await pool.query(`ALTER TABLE \`${tblName}\` CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`).catch(e => {
          console.warn(`⚠️ [DB] Collation harmonize warning for ${tblName}:`, e.message);
        });
      }
      await pool.query('SET FOREIGN_KEY_CHECKS = 1;').catch(() => {});
      // console.log(`✅ [DB] Harmonized ${incompatibleTables.length} tables to utf8mb4_unicode_ci.`);
    }

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
    // 3. Session table: displacedBy and isImpersonation columns
    const [sessionCols] = await pool.query("SHOW COLUMNS FROM session").catch(() => [[]]);
    const sessionFieldNames = (sessionCols || []).map(c => c.Field);

    if (sessionFieldNames.length && !sessionFieldNames.includes('displacedBy')) {
      await pool.query('ALTER TABLE session ADD COLUMN displacedBy VARCHAR(64) NULL DEFAULT NULL;');
      // console.log('🔒 [DB] Added displacedBy to session table (admin single-session enforcement).');
    }
    if (sessionFieldNames.length && !sessionFieldNames.includes('isImpersonation')) {
      await pool.query('ALTER TABLE session ADD COLUMN isImpersonation TINYINT(1) NOT NULL DEFAULT 0 AFTER isActive;');
      // console.log('🎭 [DB] Added isImpersonation to session table.');
    }
  } catch (err) {
    console.warn('⚠️ [DB] Auto-migration notice:', err.message);
  }
};
