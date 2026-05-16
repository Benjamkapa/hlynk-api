import { db } from '../dbms/mysql.js';

async function optimizeInventoryTable() {
  try {
    console.log('Optimizing Product table indices...');
    await db.query(`CREATE INDEX idx_product_tenant_name ON Product(tenantId, name)`);
    await db.query(`CREATE INDEX idx_product_tenant_category ON Product(tenantId, category)`);
    await db.query(`CREATE INDEX idx_product_tenant_sku ON Product(tenantId, sku)`);
    await db.query(`CREATE INDEX idx_product_stock ON Product(stockLevel)`);
    await db.query(`CREATE INDEX idx_product_expiry ON Product(expiryDate)`);
    console.log('✅ Product table indices created.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error optimizing Product table:', err);
    process.exit(1);
  }
}

optimizeInventoryTable();
