import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { pool } from '../dbms/mysql.js';
import { minioClient, bucketName } from '../utils/storage.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve paths
const rootDir = path.join(__dirname, '..');

// Helper to list all files recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  if (!fs.existsSync(dirPath)) return [];
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      arrayOfFiles.push(fullPath);
    }
  });

  return arrayOfFiles;
}

async function runRestore() {
  // Check target backup folder argument
  const targetArg = process.argv[2];
  if (!targetArg) {
    console.error('❌ Error: Please specify the backup folder path to restore.');
    console.log('Usage: node scripts/system_restore.js backups/backup_YYYYMMDD_HHMMSS\n');
    process.exit(1);
  }

  // Parse path (ensure absolute or resolved against rootDir)
  let backupPath = targetArg;
  if (!path.isAbsolute(backupPath)) {
    backupPath = path.resolve(rootDir, backupPath);
  }

  if (!fs.existsSync(backupPath)) {
    console.error(`❌ Error: Backup path does not exist: ${backupPath}`);
    process.exit(1);
  }

  const dbDumpPath = path.join(backupPath, 'db_dump.sql');
  const mediaBackupDir = path.join(backupPath, 'media');
  const metaPath = path.join(backupPath, 'backup_info.json');

  console.log(`⚠️  WARNING: Restoring backup from: ${backupPath}`);
  console.log(`This is a destructive action and will overwrite current database and media buckets.`);
  console.log(`Press Ctrl+C to abort, or wait 5 seconds before starting the restoration...`);

  // Pause for safety
  await new Promise(resolve => setTimeout(resolve, 5000));

  console.log('\n🏁 Starting restore process...\n');

  // Verify backup contents
  if (fs.existsSync(metaPath)) {
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    console.log(`Backup Info:`);
    console.log(`  - Timestamp: ${meta.timestamp}`);
    console.log(`  - Database: ${meta.databaseName || 'N/A'} (${meta.databaseBackup?.tablesCount || 0} tables)`);
    console.log(`  - Media files: ${meta.mediaBackup?.filesCount || 0} files`);
    console.log(`-----------------------------------------\n`);
  }

  // --------------------------------------------------
  // 1. Restore Database
  // --------------------------------------------------
  if (fs.existsSync(dbDumpPath)) {
    console.log('📦 Restoring Database records...');
    const sqlContent = fs.readFileSync(dbDumpPath, 'utf8');
    const statements = sqlContent.split('\n-- STATEMENT_BOUNDARY --\n').filter(s => s.trim().length > 0);
    
    console.log(`Executing ${statements.length} sql statements...`);
    
    let dbConnection = null;
    try {
      dbConnection = await pool.getConnection();
      
      let executionCount = 0;
      for (const statement of statements) {
        try {
          await dbConnection.query(statement);
          executionCount++;
        } catch (dbErr) {
          console.error(`❌ DB execution error at statement ${executionCount + 1}:`);
          console.error(statement);
          console.error(dbErr.message);
          
          // Rethrow to stop execution
          throw dbErr;
        }
      }
      
      console.log(`✅ DB Restore completed successfully! (${executionCount} SQL statements executed)`);
    } catch (err) {
      console.error('❌ Database restoration failed!');
      process.exit(1);
    } finally {
      if (dbConnection) dbConnection.release();
    }
  } else {
    console.log('ℹ️ No database dump (db_dump.sql) found in backup folder. Skipping DB restore.');
  }

  // --------------------------------------------------
  // 2. Restore Storage/Media (MinIO)
  // --------------------------------------------------
  if (fs.existsSync(mediaBackupDir)) {
    console.log('\n🪣 Restoring Object Storage files to MinIO...');
    try {
      const bucketExists = await minioClient.bucketExists(bucketName);
      if (!bucketExists) {
        console.log(`Bucket '${bucketName}' does not exist. Creating bucket...`);
        await minioClient.makeBucket(bucketName, 'us-east-1');
        
        const policy = {
          Version: "2012-10-17",
          Statement: [
            {
              Action: ["s3:GetObject"],
              Effect: "Allow",
              Principal: "*",
              Resource: [`arn:aws:s3:::${bucketName}/*`]
            }
          ]
        };
        await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
      }

      const localFiles = getAllFiles(mediaBackupDir);
      console.log(`Found ${localFiles.length} file(s) to upload.`);

      let uploadCount = 0;
      for (const localFile of localFiles) {
        // Calculate relative/object path
        const relativePath = path.relative(mediaBackupDir, localFile);
        // Normalize slashes for MinIO (which expects forward slashes regardless of platform)
        const objectName = relativePath.split(path.sep).join('/');
        
        process.stdout.write(`  - Uploading: ${objectName} ... `);
        try {
          const fileData = fs.readFileSync(localFile);
          
          await minioClient.putObject(bucketName, objectName, fileData, fileData.length);
          uploadCount++;
          console.log('OK');
        } catch (uploadErr) {
          console.log(`ERROR: ${uploadErr.message}`);
        }
      }

      console.log(`✅ Media Restore completed successfully! (${uploadCount}/${localFiles.length} files uploaded to bucket '${bucketName}')`);
    } catch (err) {
      console.error('❌ Media restoration failed:', err.message);
    }
  } else {
    console.log('ℹ️ No media files directory found in backup folder. Skipping media restore.');
  }

  console.log('\n======================================');
  console.log(`🎉 SYSTEM RESTORE COMPLETE!`);
  console.log(`======================================\n`);
  process.exit(0);
}

runRestore();
