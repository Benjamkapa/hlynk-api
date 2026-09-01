import { db } from './mysql.js';

async function migrate() {
  try {
    await db.query(`ALTER TABLE notification ADD COLUMN relatedTenantId VARCHAR(36) NULL`);
    console.log('Added relatedTenantId column');
  } catch(e) {
    console.log(e.message);
  }
  process.exit();
}
migrate();
