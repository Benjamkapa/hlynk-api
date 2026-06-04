import { db } from './dbms/mysql.js';

async function setupEtims() {
  console.log('--- Creating eTIMS Database Tables ---');
  try {
    // Drop unused/old tables for a clean slate
    await db.query(`DROP TABLE IF EXISTS etims_invoices;`);
    await db.query(`DROP TABLE IF EXISTS etims_credentials;`);

    // 1. Create etims_credentials for Direct Connection
    await db.query(`
      CREATE TABLE etims_credentials (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        kra_pin VARCHAR(20) NOT NULL,
        branch_id VARCHAR(50) DEFAULT '00',
        device_serial_number VARCHAR(100) NOT NULL,
        certificate_b64 MEDIUMTEXT,
        cert_password VARCHAR(255),
        cmc_key TEXT,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY(provider_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ etims_credentials table created cleanly.');

    // 2. Create etims_invoices to track responses from KRA
    await db.query(`
      CREATE TABLE etims_invoices (
        id INT AUTO_INCREMENT PRIMARY KEY,
        provider_id VARCHAR(255) NOT NULL,
        payment_id VARCHAR(255) NOT NULL,
        kra_invoice_number VARCHAR(100),
        kra_receipt_number VARCHAR(100),
        qr_code_url TEXT,
        internal_signature VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending',
        error_message TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX(provider_id),
        INDEX(payment_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
    console.log('✅ etims_invoices table created cleanly.');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create tables:', err);
    process.exit(1);
  }
}

setupEtims();
