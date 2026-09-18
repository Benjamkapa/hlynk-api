import { db } from './mysql.js';

async function migrate() {
  console.log('Running notification referenceId/referenceType migration...');
  try {
    await db.query(`ALTER TABLE notification ADD COLUMN referenceId VARCHAR(36) NULL`);
    console.log('✅ Added referenceId column');
  } catch (e) {
    console.log('referenceId:', e.message);
  }
  try {
    await db.query(`ALTER TABLE notification ADD COLUMN referenceType VARCHAR(50) NULL`);
    console.log('✅ Added referenceType column');
  } catch (e) {
    console.log('referenceType:', e.message);
  }
  console.log('Migration complete.');
  process.exit();
}
migrate();
