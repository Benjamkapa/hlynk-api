import { db } from '../dbms/mysql.js';

async function update() {
  try {
    console.log('Standardizing Payment table columns...');
    
    // 1. Check if columns exist and add them if necessary
    // We use a safe approach since IF NOT EXISTS might not be supported in all MySQL versions for ADD COLUMN
    const [columns] = await db.query('SHOW COLUMNS FROM Payment');
    const columnNames = columns.map(c => c.Field);

    if (!columnNames.includes('mpesaRequestId')) {
      await db.query('ALTER TABLE Payment ADD COLUMN mpesaRequestId VARCHAR(100) AFTER reference');
    }

    // 2. Migrate data: If mpesaReceipt currently holds RequestIDs, move them
    await db.query(`
      UPDATE Payment 
      SET mpesaRequestId = mpesaReceipt 
      WHERE mpesaReceipt LIKE 'ws_CO_%' OR mpesaReceipt LIKE 'sim_chk_%'
    `);

    // 3. Clear mpesaReceipt where it held request IDs (so it only holds actual receipts)
    await db.query(`
      UPDATE Payment 
      SET mpesaReceipt = NULL 
      WHERE mpesaReceipt LIKE 'ws_CO_%' OR mpesaReceipt LIKE 'sim_chk_%'
    `);
    
    console.log('Standardizing Sale table columns...');
    const [saleColumns] = await db.query('SHOW COLUMNS FROM Sale');
    const saleColumnNames = saleColumns.map(c => c.Field);

    if (!saleColumnNames.includes('mpesaReceipt')) {
      await db.query('ALTER TABLE Sale ADD COLUMN mpesaReceipt VARCHAR(50) AFTER mpesaRequestId');
    }
    
    console.log('✅ Database schema standardized.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Schema update failed:', err);
    process.exit(1);
  }
}

update();
