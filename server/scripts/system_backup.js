import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../dbms/mysql.js';
import { minioClient, bucketName } from '../utils/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve paths
const rootDir = path.join(__dirname, '..');
const backupsDir = path.join(rootDir, 'backups');

const getTimestamp = () => {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
};

async function runBackup() {
  const timestamp = getTimestamp();
  const backupName = `backup_${timestamp}`;
  const currentBackupDir = path.join(backupsDir, backupName);
  const mediaBackupDir = path.join(currentBackupDir, 'media');

  console.log(`🚀 Starting system backup to: ${currentBackupDir}\n`);

  // Ensure directories exist
  fs.mkdirSync(currentBackupDir, { recursive: true });

  let dbConnection = null;
  const metadata = {
    timestamp: new Date().toISOString(),
    databaseBackup: { success: false, tablesCount: 0, rowsCount: 0 },
    mediaBackup: { success: false, filesCount: 0 }
  };

  try {
    // --------------------------------------------------
    // 1. Database Backup
    // --------------------------------------------------
    console.log('📦 Backing up Database...');
    dbConnection = await pool.getConnection();

    // Get Database Name
    const [dbNameRow] = await dbConnection.query('SELECT DATABASE() as dbName');
    const dbName = dbNameRow[0]?.dbName || 'hlynk';
    metadata.databaseName = dbName;

    // Get all tables
    const [tablesList] = await dbConnection.query("SHOW FULL TABLES WHERE Table_type = 'BASE TABLE'");
    const tableKey = tablesList[0] ? Object.keys(tablesList[0])[0] : null;
    
    if (!tableKey) {
      console.warn('⚠️ No tables found in the database.');
    } else {
      const tables = tablesList.map(t => t[tableKey]);
      console.log(`Found ${tables.length} tables to export.`);
      
      const statements = [];
      statements.push("SET FOREIGN_KEY_CHECKS = 0;");

      let totalRows = 0;

      for (const table of tables) {
        console.log(`  - Exporting table: ${table}`);
        
        // 1. Drop existing table
        statements.push(`DROP TABLE IF EXISTS \`${table}\`;`);

        // 2. Create table schema
        const [createRows] = await dbConnection.query(`SHOW CREATE TABLE \`${table}\``);
        const createSql = createRows[0]['Create Table'];
        statements.push(`${createSql};`);

        // 3. Columns checks of non-generated columns
        const [cols] = await dbConnection.query(`SHOW COLUMNS FROM \`${table}\``);
        const insertableColumns = cols
          .filter(col => {
            const extra = col.Extra.toUpperCase();
            return !extra.includes('VIRTUAL') && !extra.includes('STORED');
          })
          .map(col => col.Field);

        if (insertableColumns.length === 0) continue;

        // 4. Rows export
        const columnsSelector = insertableColumns.map(c => `\`${c}\``).join(', ');
        const [rows] = await dbConnection.query(`SELECT ${columnsSelector} FROM \`${table}\``);
        totalRows += rows.length;

        if (rows.length > 0) {
          const chunkSize = 200;
          for (let i = 0; i < rows.length; i += chunkSize) {
            const chunk = rows.slice(i, i + chunkSize);
            const valuesSql = chunk.map(row => {
              const values = insertableColumns.map(colName => {
                const val = row[colName];
                return dbConnection.escape(val);
              }).join(', ');
              return `(${values})`;
            }).join(',\n');

            const escapedCols = insertableColumns.map(c => `\`${c}\``).join(', ');
            statements.push(`INSERT INTO \`${table}\` (${escapedCols}) VALUES \n${valuesSql};`);
          }
        }
      }

      statements.push("SET FOREIGN_KEY_CHECKS = 1;");

      // Write DB dump
      const sqlContent = statements.join('\n-- STATEMENT_BOUNDARY --\n');
      const sqlFilePath = path.join(currentBackupDir, 'db_dump.sql');
      fs.writeFileSync(sqlFilePath, sqlContent, 'utf8');

      metadata.databaseBackup = {
        success: true,
        tablesCount: tables.length,
        rowsCount: totalRows,
        file: 'db_dump.sql'
      };
      
      console.log(`✅ DB Backup completed! Saved to ${sqlFilePath} (${tables.length} tables, ${totalRows} rows)`);
    }
  } catch (err) {
    console.error('❌ Database backup FAILED:', err.message);
  } finally {
    if (dbConnection) {
      dbConnection.release();
    }
  }

  // --------------------------------------------------
  // 2. Storage/Media Backup (MinIO)
  // --------------------------------------------------
  try {
    console.log('\n🪣 Backing up Object Storage (MinIO)...');
    
    // Test minio bucket exists
    const bucketExists = await minioClient.bucketExists(bucketName);
    if (!bucketExists) {
      console.warn(`⚠️ MinIO bucket '${bucketName}' does not exist. Skipping media backup.`);
    } else {
      fs.mkdirSync(mediaBackupDir, { recursive: true });
      
      const objects = [];
      const stream = minioClient.listObjectsV2(bucketName, '', true);
      
      await new Promise((resolve, reject) => {
        stream.on('data', obj => {
          if (obj.name) objects.push(obj);
        });
        stream.on('error', reject);
        stream.on('end', resolve);
      });

      console.log(`Found ${objects.length} file(s) in bucket '${bucketName}'.`);
      
      let downloadedCount = 0;
      for (const obj of objects) {
        process.stdout.write(`  - Downloading: ${obj.name} ... `);
        try {
          const objectStream = await minioClient.getObject(bucketName, obj.name);
          const localFilePath = path.join(mediaBackupDir, obj.name);
          
          // Ensure directory path exists
          fs.mkdirSync(path.dirname(localFilePath), { recursive: true });
          
          const writeStream = fs.createWriteStream(localFilePath);
          
          await new Promise((resolve, reject) => {
            objectStream.pipe(writeStream);
            objectStream.on('error', reject);
            writeStream.on('finish', resolve);
            writeStream.on('error', reject);
          });
          
          downloadedCount++;
          console.log(`OK (${(obj.size / 1024).toFixed(1)} KB)`);
        } catch (downloadErr) {
          console.log(`ERROR: ${downloadErr.message}`);
        }
      }

      metadata.mediaBackup = {
        success: true,
        filesCount: downloadedCount,
        bucketName
      };
      
      console.log(`✅ Media Backup completed! Downloaded ${downloadedCount}/${objects.length} files.`);
    }
  } catch (err) {
    console.error('❌ Media backup FAILED:', err.message);
  }

  // --------------------------------------------------
  // 3. Write metadata file
  // --------------------------------------------------
  const metaFilePath = path.join(currentBackupDir, 'backup_info.json');
  fs.writeFileSync(metaFilePath, JSON.stringify(metadata, null, 2), 'utf8');

  console.log('\n======================================');
  console.log(`🎉 BACKUP COMPLETE!`);
  console.log(`Backup Folder: ${currentBackupDir}`);
  console.log(`--------------------------------------`);
  console.log(`To restore this backup, run:`);
  console.log(`node scripts/system_restore.js backups/${backupName}`);
  console.log('======================================\n');
  
  process.exit(0);
}

runBackup();
