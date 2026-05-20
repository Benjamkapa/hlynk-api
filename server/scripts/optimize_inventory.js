import { db } from '../dbms/mysql.js';

async function optimizeInventoryTable() {
  try {
    console.log('Optimizing product table indices...');
    await db.query(`CREATE INDEX idx_product_tenant_name ON product(tenantId, name)`);
    await db.query(`CREATE INDEX idx_product_tenant_category ON product(tenantId, category)`);
    await db.query(`CREATE INDEX idx_product_tenant_sku ON product(tenantId, sku)`);
    await db.query(`CREATE INDEX idx_product_stock ON product(stockLevel)`);
    await db.query(`CREATE INDEX idx_product_expiry ON product(expiryDate)`);
    console.log('✅ product table indices created.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error optimizing Product table:', err);
    process.exit(1);
  }
}

optimizeInventoryTable();
