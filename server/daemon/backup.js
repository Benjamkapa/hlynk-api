import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../dbms/mysql.js';
import { minioClient } from '../utils/storage.js';
import * as Minio from 'minio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────
const BACKUP_DIR   = path.join(__dirname, '..', 'backups');
const MAX_COPIES   = 3;                    // keep 3 most recent copies
const MINIO_BUCKET = 'hlynk-backups';       // dedicated private bucket for DB backups
const MINIO_PREFIX = 'db/';                 // object prefix inside the bucket
const CRON_SCHEDULE = process.env.BACKUP_CRON_SCHEDULE || '0 */6 * * *'; // every 6 hours (00:00, 06:00, 12:00, 18:00)
const LOCK_NAME    = 'hlynk_backup_lock';   // MySQL named lock: blocks overlapping of backups

// ── Cloudflare R2 Config (Offsite Cloud Storage) ───────────────────────────
// Cloudflare R2 is 100% S3 compatible, so we reuse the minio/S3 client directly!
let r2Client = null;
let R2_BUCKET = process.env.R2_BUCKET || 'hlynk-backups';

try {
  const params = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'configs', 'params.json'), 'utf8'));
  const accountId = process.env.R2_ACCOUNT_ID || params.r2_account_id;
  const accessKey = process.env.R2_ACCESS_KEY_ID || params.r2_access_key_id;
  const secretKey = process.env.R2_SECRET_ACCESS_KEY || params.r2_secret_access_key;
  if (params.r2_bucket) R2_BUCKET = params.r2_bucket;

  if (accountId && accessKey && secretKey) {
    r2Client = new Minio.Client({
      endPoint: `${accountId}.r2.cloudflarestorage.com`,
      port: 443,
      useSSL: true,
      accessKey: accessKey,
      secretKey: secretKey,
    });
  }
} catch (_) {}

// ── Ensure the private backup bucket exists (private policy — no public read) ──
async function ensureBackupBucket() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
    }
  } catch (err) {
    console.error('[Backup Daemon] Could not ensure MinIO bucket:', err.message);
  }

  if (r2Client) {
    try {
      const r2Exists = await r2Client.bucketExists(R2_BUCKET);
      if (!r2Exists) {
        await r2Client.makeBucket(R2_BUCKET, 'us-east-1');
      }
    } catch (err) {
      console.error('[Backup Daemon] Cloudflare R2 bucket check:', err.message);
    }
  }
}

// ── Upload the local .sql file to MinIO ────────────────────────────────────
async function uploadToMinio(backupName, sqlFilePath) {
  try {
    const objectName = `${MINIO_PREFIX}${backupName}.sql`;
    await minioClient.fPutObject(MINIO_BUCKET, objectName, sqlFilePath, {
      'Content-Type': 'application/sql',
      'x-amz-meta-source': 'auto-backup-daemon',
    });
    console.log(`[Backup Daemon] Uploaded to MinIO: ${MINIO_BUCKET}/${objectName}`);
    return objectName;
  } catch (err) {
    console.error('[Backup Daemon] MinIO upload failed:', err.message);
    return null;
  }
}

// ── Upload raw .sql file to Cloudflare R2 ──────────────────────────────────
async function uploadToCloudflareR2(backupName, sqlFilePath) {
  if (!r2Client) return null;
  try {
    const objectName = `${MINIO_PREFIX}${backupName}.sql`;
    await r2Client.fPutObject(R2_BUCKET, objectName, sqlFilePath, {
      'Content-Type': 'application/sql',
      'x-amz-meta-source': 'auto-backup-daemon',
    });
    console.log(`[Backup Daemon] 🚀 Uploaded to Cloudflare R2 (Offsite Cloud): ${R2_BUCKET}/${objectName}`);
    return objectName;
  } catch (err) {
    console.error('[Backup Daemon] Cloudflare R2 upload failed:', err.message);
    return null;
  }
}

// ── Prune MinIO: keep only MAX_COPIES newest backup objects ────────────────
async function pruneMinioBackups() {
  try {
    const objects = [];
    const stream = minioClient.listObjectsV2(MINIO_BUCKET, MINIO_PREFIX, true);
    await new Promise((resolve, reject) => {
      stream.on('data', obj => { if (obj.name) objects.push(obj); });
      stream.on('error', reject);
      stream.on('end', resolve);
    });

    objects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    const toDelete = objects.slice(MAX_COPIES);
    for (const obj of toDelete) {
      await minioClient.removeObject(MINIO_BUCKET, obj.name);
    }
  } catch (err) {
    console.error('[Backup Daemon] MinIO prune failed:', err.message);
  }
}

// ── Prune Cloudflare R2: keep only MAX_COPIES newest backup objects ───────
async function pruneCloudflareR2Backups() {
  if (!r2Client) return;
  try {
    const objects = [];
    const stream = r2Client.listObjectsV2(R2_BUCKET, MINIO_PREFIX, true);
    await new Promise((resolve, reject) => {
      stream.on('data', obj => { if (obj.name) objects.push(obj); });
      stream.on('error', reject);
      stream.on('end', resolve);
    });

    objects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    const toDelete = objects.slice(MAX_COPIES);
    for (const obj of toDelete) {
      await r2Client.removeObject(R2_BUCKET, obj.name);
      console.log(`[Backup Daemon] Pruned old Cloudflare R2 backup: ${obj.name}`);
    }
  } catch (err) {
    console.error('[Backup Daemon] Cloudflare R2 prune failed:', err.message);
  }
}

// ── Delete the local staging folder after a successful MinIO upload ────────
function deleteLocalBackup(backupName) {
  const fullPath = path.join(BACKUP_DIR, backupName);
  if (fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { recursive: true, force: true });
    // console.log(`[Backup Daemon] Local staging folder removed: ${backupName}`);
  }
}

// ── Prune leftover local folders (kept when a MinIO upload failed) ─────────
// Folder names contain a timestamp, so sorting by name = sorting by age.
function pruneLocalBackups() {
  try {
    if (!fs.existsSync(BACKUP_DIR)) return;
    const folders = fs.readdirSync(BACKUP_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory() && /^backup_\d{8}_\d{6}$/.test(e.name))
      .map(e => e.name)
      .sort()
      .reverse(); // newest first

    for (const name of folders.slice(MAX_COPIES)) {
      fs.rmSync(path.join(BACKUP_DIR, name), { recursive: true, force: true });
      // console.log(`[Backup Daemon] Pruned local backup: ${name}`);
    }
  } catch (err) {
    console.error('[Backup Daemon] Local prune failed:', err.message);
  }
}

// ── Core backup function ────────────────────────────────────────────────────
let backupRunning = false; // in-process guard (the MySQL lock below also covers other instances)

async function runBackup() {
  if (backupRunning) {
    console.warn('[Backup Daemon] Previous backup still running — skipping this run.');
    return;
  }
  backupRunning = true;

  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  const timestamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
  const backupName     = `backup_${timestamp}`;
  const localBackupDir = path.join(BACKUP_DIR, backupName);
  const sqlFilePath    = path.join(localBackupDir, 'db_dump.sql');

  let dbConnection = null;
  let lockAcquired = false;
  let inTransaction = false;

  try {
    dbConnection = await pool.getConnection();

    // Cross-process / cross-instance lock: if another backup holds it, skip.
    const [lockRows] = await dbConnection.query('SELECT GET_LOCK(?, 0) AS got', [LOCK_NAME]);
    if (!lockRows[0] || Number(lockRows[0].got) !== 1) {
      console.warn('[Backup Daemon] Another backup is already running — skipping this run.');
      return;
    }
    lockAcquired = true;

    // console.log(`[Backup Daemon] Starting backup -> ${backupName}`);
    fs.mkdirSync(localBackupDir, { recursive: true });

    const [dbNameRow] = await dbConnection.query('SELECT DATABASE() as dbName');
    const dbName = dbNameRow[0]?.dbName || 'hlynk';

    const [tablesList] = await dbConnection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tableKey = tablesList[0] ? Object.keys(tablesList[0])[0] : null;

    if (!tableKey) {
      console.warn('[Backup Daemon] No tables found — nothing to back up.');
      fs.rmSync(localBackupDir, { recursive: true, force: true });
      return;
    }

    const tables = tablesList.map(t => t[tableKey]);
    const statements = ['SET FOREIGN_KEY_CHECKS = 0;'];
    let totalRows = 0;

    // One consistent snapshot: every table is read as of the same moment
    await dbConnection.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
    await dbConnection.query('START TRANSACTION WITH CONSISTENT SNAPSHOT');
    inTransaction = true;

    for (const table of tables) {
      statements.push(`DROP TABLE IF EXISTS \`${table}\`;`);

      const [createRows] = await dbConnection.query(`SHOW CREATE TABLE \`${table}\``);
      statements.push(`${createRows[0]['Create Table']};`);

      const [cols] = await dbConnection.query(`SHOW COLUMNS FROM \`${table}\``);
      const insertable = cols
        .filter(c => !c.Extra.toUpperCase().includes('VIRTUAL') && !c.Extra.toUpperCase().includes('STORED'))
        .map(c => c.Field);

      if (!insertable.length) continue;

      const colSel = insertable.map(c => `\`${c}\``).join(', ');
      const [rows] = await dbConnection.query(`SELECT ${colSel} FROM \`${table}\``);
      totalRows += rows.length;

      const chunkSize = 200;
      for (let i = 0; i < rows.length; i += chunkSize) {
        const chunk = rows.slice(i, i + chunkSize);
        const vals = chunk.map(row =>
          `(${insertable.map(col => dbConnection.escape(row[col])).join(', ')})`
        ).join(',\n');
        statements.push(`INSERT INTO \`${table}\` (${colSel}) VALUES \n${vals};`);
      }
    }

    await dbConnection.query('COMMIT');
    inTransaction = false;

    statements.push('SET FOREIGN_KEY_CHECKS = 1;');

    const sqlContent = statements.join('\n-- STATEMENT_BOUNDARY --\n');
    fs.writeFileSync(sqlFilePath, sqlContent, 'utf8');

    const meta = {
      timestamp: new Date().toISOString(),
      source: 'auto-backup-daemon',
      databaseName: dbName,
      databaseBackup: { success: true, tablesCount: tables.length, rowsCount: totalRows, file: 'db_dump.sql' },
    };
    fs.writeFileSync(path.join(localBackupDir, 'backup_info.json'), JSON.stringify(meta, null, 2), 'utf8');

    // const sizeMB = (fs.statSync(sqlFilePath).size / (1024 * 1024)).toFixed(2);
    // console.log(`[Backup Daemon] Local backup saved: ${tables.length} tables, ${totalRows} rows, ${sizeMB} MB`);

    // Upload to MinIO (Local Object Storage)
    const uploadedMinio = await uploadToMinio(backupName, sqlFilePath);

    // Upload to Cloudflare R2 (Offsite Cloud Snapshot)
    const uploadedR2 = await uploadToCloudflareR2(backupName, sqlFilePath);

    if (uploadedMinio || uploadedR2) {
      // At least one persistent remote copy succeeded — delete local staging folder to free disk
      deleteLocalBackup(backupName);
      if (uploadedMinio) await pruneMinioBackups();
      if (uploadedR2) await pruneCloudflareR2Backups();
    } else {
      // Both uploads failed — leave local copy as emergency fallback, warn loudly
      console.error(`[Backup Daemon] ⚠️  Remote uploads failed — local copy kept at backups/${backupName}`);
    }

  } catch (err) {
    console.error('[Backup Daemon] DB dump failed:', err.message);
  } finally {
    if (dbConnection) {
      try { if (inTransaction) await dbConnection.query('ROLLBACK'); } catch (_) { /* ignore */ }
      try { if (lockAcquired) await dbConnection.query('SELECT RELEASE_LOCK(?)', [LOCK_NAME]); } catch (_) { /* ignore */ }
      dbConnection.release();
    }
    pruneLocalBackups();   // clears old fallback folders from past failed uploads
    backupRunning = false;
  }
}

// ── Get Status of Backups in MinIO & Cloudflare R2 ──────────────────────────
export async function getBackupStatus() {
  const result = {
    minio: { connected: false, files: [], error: null },
    cloudflareR2: { configured: !!r2Client, connected: false, files: [], error: null },
    lastBackupTime: null,
  };

  // Check MinIO
  try {
    const minioFiles = [];
    const stream = minioClient.listObjectsV2(MINIO_BUCKET, MINIO_PREFIX, true);
    await new Promise((resolve, reject) => {
      stream.on('data', obj => { if (obj.name) minioFiles.push(obj); });
      stream.on('error', reject);
      stream.on('end', resolve);
    });
    minioFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    result.minio.connected = true;
    result.minio.files = minioFiles.map(f => ({
      name: f.name.replace(MINIO_PREFIX, ''),
      size: f.size,
      lastModified: f.lastModified,
    }));
  } catch (err) {
    result.minio.error = err.message;
  }

  // Check Cloudflare R2
  if (r2Client) {
    try {
      const r2Files = [];
      const stream = r2Client.listObjectsV2(R2_BUCKET, MINIO_PREFIX, true);
      await new Promise((resolve, reject) => {
        stream.on('data', obj => { if (obj.name) r2Files.push(obj); });
        stream.on('error', reject);
        stream.on('end', resolve);
      });
      r2Files.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
      result.cloudflareR2.connected = true;
      result.cloudflareR2.files = r2Files.map(f => ({
        name: f.name.replace(MINIO_PREFIX, ''),
        size: f.size,
        lastModified: f.lastModified,
      }));
    } catch (err) {
      result.cloudflareR2.error = err.message;
    }
  }

  // Determine latest overall timestamp
  const allFiles = [...result.minio.files, ...result.cloudflareR2.files];
  if (allFiles.length > 0) {
    allFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
    result.lastBackupTime = allFiles[0].lastModified;
  }

  return result;
}

// ── Export runBackup for manual/test invocation ─────────────────────────────
export { runBackup };

// ── Daemon entry point ──────────────────────────────────────────────────────
export const startBackupDaemon = async () => {
  try {
    await ensureBackupBucket();
  } catch (err) {
    console.error('[Backup Daemon] Bucket check warning:', err.message);
  }

  // Schedule regular backups (e.g. every 6 hours) without blocking server startup
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await runBackup();
    } catch (err) {
      console.error('[Backup Daemon] Scheduled backup failed:', err.message);
    }
  });

  // console.log(`💾 DB Backup Daemon started — schedule: ${CRON_SCHEDULE}, keeping last ${MAX_COPIES} copies.`);
};
