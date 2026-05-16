import { db } from '../dbms/mysql.js';

async function consolidate() {
  try {
    console.log('--- Consolidating Payment Schema ---');
    
    // 1. Add missing columns to Payment table
    const [columns] = await db.query('SHOW COLUMNS FROM Payment');
    const colNames = columns.map(c => c.Field);

    const additions = [
      { name: 'transactionType', type: "VARCHAR(50) DEFAULT 'SUBSCRIPTION'" },
      { name: 'rawResponse', type: 'LONGTEXT' },
      { name: 'merchantRequestId', type: 'VARCHAR(100)' }
    ];

    for (const col of additions) {
      if (!colNames.includes(col.name)) {
        console.log(`Adding ${col.name}...`);
        await db.query(`ALTER TABLE Payment ADD COLUMN ${col.name} ${col.type}`);
      }
    }

    console.log('✅ Payment table upgraded to Master Schema.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Consolidation failed:', err);
    process.exit(1);
  }
}

consolidate();
