import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../dbms/mysql.js';
import { minioClient } from '../utils/storage.js';


const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ── Config ─────────────────────────────────────────────────────────────────
const BACKUP_DIR   = path.join(__dirname, '..', 'backups');
const MAX_COPIES   = 3;                    // keep N most recent copies (12 x 30 min = ~6 hours)
const MINIO_BUCKET = 'hlynk-backups';       // dedicated private bucket for DB backups
const MINIO_PREFIX = 'db/';                 // object prefix inside the bucket
const CRON_SCHEDULE = '*/30 * * * *';       // every 30 minutes (at :00 and :30)
const LOCK_NAME    = 'hlynk_backup_lock';   // MySQL named lock: blocks overlapping backups

// ── Ensure the private backup bucket exists (private policy — no public read) ──
async function ensureBackupBucket() {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
      // console.log(`[Backup Daemon] Created private MinIO bucket: ${MINIO_BUCKET}`);
    }
  } catch (err) {
    console.error('[Backup Daemon] Could not ensure MinIO bucket:', err.message);
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
    // console.log(`[Backup Daemon] Uploaded to MinIO: ${MINIO_BUCKET}/${objectName}`);
    return objectName;
  } catch (err) {
    console.error('[Backup Daemon] MinIO upload failed:', err.message);
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

    // Sort newest first by lastModified
    objects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

    const toDelete = objects.slice(MAX_COPIES);
    for (const obj of toDelete) {
      await minioClient.removeObject(MINIO_BUCKET, obj.name);
      // console.log(`[Backup Daemon] Pruned MinIO backup: ${obj.name}`);
    }
  } catch (err) {
    console.error('[Backup Daemon] MinIO prune failed:', err.message);
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

    // Upload to MinIO — the only persistent copy (lock is still held during upload)
    const uploaded = await uploadToMinio(backupName, sqlFilePath);

    if (uploaded) {
      // MinIO is the source of truth — delete local staging folder to free disk
      deleteLocalBackup(backupName);
      // Prune MinIO to keep only MAX_COPIES newest
      await pruneMinioBackups();
    } else {
      // Upload failed — leave local copy as emergency fallback, warn loudly
      console.error(`[Backup Daemon] ⚠️  MinIO upload failed — local copy kept at backups/${backupName}`);
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

// ── Daemon entry point ──────────────────────────────────────────────────────
export const startBackupDaemon = async () => {
  await ensureBackupBucket();

  // Run once immediately at startup
  runBackup().catch(err => console.error('[Backup Daemon] Initial backup failed:', err.message));

  // Then every 30 minutes: */30 * * * *
  cron.schedule(CRON_SCHEDULE, async () => {
    try {
      await runBackup();
    } catch (err) {
      console.error('[Backup Daemon] Scheduled backup failed:', err.message);
    }
  });

  // console.log(`💾 DB Backup Daemon started — every 30m → MinIO only, keeping last ${MAX_COPIES} copies.`);
};

// import cron from 'node-cron';
// import fs from 'fs';
// import path from 'path';
// import { fileURLToPath } from 'url';
// import { pool } from '../dbms/mysql.js';
// import { minioClient } from '../utils/storage.js';


// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// // ── Config ─────────────────────────────────────────────────────────────────
// const BACKUP_DIR   = path.join(__dirname, '..', 'backups');
// const MAX_COPIES   = 2;                     // keep only N most recent copies
// const MINIO_BUCKET = 'hlynk-backups';       // dedicated private bucket for DB backups
// const MINIO_PREFIX = 'db/';                 // object prefix inside the bucket

// // ── Ensure the private backup bucket exists (private policy — no public read) ──
// async function ensureBackupBucket() {
//   try {
//     const exists = await minioClient.bucketExists(MINIO_BUCKET);
//     if (!exists) {
//       await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
//       // console.log(`[Backup Daemon] Created private MinIO bucket: ${MINIO_BUCKET}`);
//     }
//   } catch (err) {
//     console.error('[Backup Daemon] Could not ensure MinIO bucket:', err.message);
//   }
// }

// // ── Upload a local folder as a single .sql file to MinIO ───────────────────
// async function uploadToMinio(backupName, sqlFilePath) {
//   try {
//     const objectName = `${MINIO_PREFIX}${backupName}.sql`;
//     await minioClient.fPutObject(MINIO_BUCKET, objectName, sqlFilePath, {
//       'Content-Type': 'application/sql',
//       'x-amz-meta-source': 'auto-backup-daemon',
//     });
//     // console.log(`[Backup Daemon] Uploaded to MinIO: ${MINIO_BUCKET}/${objectName}`);
//     return objectName;
//   } catch (err) {
//     console.error('[Backup Daemon] MinIO upload failed:', err.message);
//     return null;
//   }
// }

// // ── Prune MinIO: keep only MAX_COPIES newest backup objects ────────────────
// async function pruneMinioBackups() {
//   try {
//     const objects = [];
//     const stream = minioClient.listObjectsV2(MINIO_BUCKET, MINIO_PREFIX, true);
//     await new Promise((resolve, reject) => {
//       stream.on('data', obj => { if (obj.name) objects.push(obj); });
//       stream.on('error', reject);
//       stream.on('end', resolve);
//     });

//     // Sort newest first by lastModified
//     objects.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

//     const toDelete = objects.slice(MAX_COPIES);
//     for (const obj of toDelete) {
//       await minioClient.removeObject(MINIO_BUCKET, obj.name);
//       // console.log(`[Backup Daemon] Pruned MinIO backup: ${obj.name}`);
//     }
//   } catch (err) {
//     console.error('[Backup Daemon] MinIO prune failed:', err.message);
//   }
// }

// // ── Delete the local staging folder after a successful MinIO upload ────────
// function deleteLocalBackup(backupName) {
//   const fullPath = path.join(BACKUP_DIR, backupName);
//   if (fs.existsSync(fullPath)) {
//     fs.rmSync(fullPath, { recursive: true, force: true });
//     // console.log(`[Backup Daemon] Local staging folder removed: ${backupName}`);
//   }
// }

// // ── Core backup function ────────────────────────────────────────────────────
// async function runBackup() {
//   const d = new Date();
//   const pad = n => String(n).padStart(2, '0');
//   const timestamp = `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
//   const backupName     = `backup_${timestamp}`;
//   const localBackupDir = path.join(BACKUP_DIR, backupName);
//   const sqlFilePath    = path.join(localBackupDir, 'db_dump.sql');

//   // console.log(`[Backup Daemon] Starting backup -> ${backupName}`);
//   fs.mkdirSync(localBackupDir, { recursive: true });

//   let dbConnection = null;
//   let success = false;

//   try {
//     dbConnection = await pool.getConnection();

//     const [dbNameRow] = await dbConnection.query('SELECT DATABASE() as dbName');
//     const dbName = dbNameRow[0]?.dbName || 'hlynk';

//     const [tablesList] = await dbConnection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
//     const tableKey = tablesList[0] ? Object.keys(tablesList[0])[0] : null;

//     if (!tableKey) {
//       console.warn('[Backup Daemon] No tables found — nothing to back up.');
//       return;
//     }

//     const tables = tablesList.map(t => t[tableKey]);
//     const statements = ['SET FOREIGN_KEY_CHECKS = 0;'];
//     let totalRows = 0;

//     for (const table of tables) {
//       statements.push(`DROP TABLE IF EXISTS \`${table}\`;`);

//       const [createRows] = await dbConnection.query(`SHOW CREATE TABLE \`${table}\``);
//       statements.push(`${createRows[0]['Create Table']};`);

//       const [cols] = await dbConnection.query(`SHOW COLUMNS FROM \`${table}\``);
//       const insertable = cols
//         .filter(c => !c.Extra.toUpperCase().includes('VIRTUAL') && !c.Extra.toUpperCase().includes('STORED'))
//         .map(c => c.Field);

//       if (!insertable.length) continue;

//       const colSel = insertable.map(c => `\`${c}\``).join(', ');
//       const [rows] = await dbConnection.query(`SELECT ${colSel} FROM \`${table}\``);
//       totalRows += rows.length;

//       const chunkSize = 200;
//       for (let i = 0; i < rows.length; i += chunkSize) {
//         const chunk = rows.slice(i, i + chunkSize);
//         const vals = chunk.map(row =>
//           `(${insertable.map(col => dbConnection.escape(row[col])).join(', ')})`
//         ).join(',\n');
//         statements.push(`INSERT INTO \`${table}\` (${colSel}) VALUES \n${vals};`);
//       }
//     }

//     statements.push('SET FOREIGN_KEY_CHECKS = 1;');

//     const sqlContent = statements.join('\n-- STATEMENT_BOUNDARY --\n');
//     fs.writeFileSync(sqlFilePath, sqlContent, 'utf8');

//     const meta = {
//       timestamp: new Date().toISOString(),
//       source: 'auto-backup-daemon',
//       databaseName: dbName,
//       databaseBackup: { success: true, tablesCount: tables.length, rowsCount: totalRows, file: 'db_dump.sql' },
//     };
//     fs.writeFileSync(path.join(localBackupDir, 'backup_info.json'), JSON.stringify(meta, null, 2), 'utf8');

//     const sizeMB = (fs.statSync(sqlFilePath).size / (1024 * 1024)).toFixed(2);
//     // console.log(`[Backup Daemon] Local backup saved: ${tables.length} tables, ${totalRows} rows, ${sizeMB} MB`);
//     success = true;

//   } catch (err) {
//     console.error('[Backup Daemon] DB dump failed:', err.message);
//   } finally {
//     if (dbConnection) dbConnection.release();
//   }

//   if (success) {
//     // Upload to MinIO — the only persistent copy
//     const uploaded = await uploadToMinio(backupName, sqlFilePath);

//     if (uploaded) {
//       // MinIO is the source of truth — delete local staging folder to free disk
//       deleteLocalBackup(backupName);
//       // Prune MinIO to keep only MAX_COPIES newest
//       await pruneMinioBackups();
//     } else {
//       // Upload failed — leave local copy as emergency fallback, warn loudly
//       console.error(`[Backup Daemon] ⚠️  MinIO upload failed — local copy kept at backups/${backupName}`);
//     }
//   }
// }

// // ── Daemon entry point ──────────────────────────────────────────────────────
// export const startBackupDaemon = async () => {
//   await ensureBackupBucket();

//   // Run once immediately at startup
//   runBackup().catch(err => console.error('[Backup Daemon] Initial backup failed:', err.message));

//   // Then every 1 hour: 0 */1 * * *
//   cron.schedule('0 */1 * * *', async () => {
//     try {
//       await runBackup();
//     } catch (err) {
//       console.error('[Backup Daemon] Scheduled backup failed:', err.message);
//     }
//   });

//   // console.log('💾 DB Backup Daemon started — every 1h → MinIO only, keeping last 2 copies.');
// };
