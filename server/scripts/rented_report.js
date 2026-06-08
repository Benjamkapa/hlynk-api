import { db } from '../dbms/mysql.js';
import fs from 'fs';

async function generateReport() {
  console.log('--- Rented Paybill Usage Report ---');
  try {
    const [rows] = await db.query(`
      SELECT 
        p.tenantId, 
        t.businessName, 
        SUM(p.amount) as gross, 
        SUM(p.amount * 0.15) as platformShare, 
        SUM(p.amount * 0.85) as netDue,
        COUNT(*) as transactionCount
      FROM payment p 
      JOIN tenant t ON p.tenantId = t.id 
      WHERE p.isRented = 1 AND p.status = 0 AND p.payoutStatus = 0 
      GROUP BY p.tenantId, t.businessName
    `);
    
    console.table(rows);
    fs.writeFileSync('rented_report_output.txt', JSON.stringify(rows, null, 2));
    console.log('\n✅ Report generated in rented_report_output.txt');
  } catch (err) {
    console.error('❌ Failed to generate report:', err.message);
  } finally {
    process.exit(0);
  }
}

generateReport();
