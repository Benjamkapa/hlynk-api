import { db } from '../dbms/mysql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setSubscription() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node scripts/set_subscription.js <user_email> <plan_name> [status] [days_left]');
    console.log('Example: node scripts/set_subscription.js test@example.com MAX ACTIVE');
    process.exit(1);
  }

  const [email, planName, status = 'ACTIVE', daysLeft = 30] = args;

  try {
    // Find tenant
    const [tenants] = await db.query(`
      SELECT t.id, t.businessName, u.email 
      FROM tenant t 
      JOIN user u ON u.tenantId = t.id 
      WHERE u.email = ?
    `, [email]);

    if (tenants.length === 0) {
      console.error(`❌ No tenant found for email: ${email}`);
      process.exit(1);
    }

    const tenant = tenants[0];
    console.log(`🔍 Found Tenant: ${tenant.businessName}`);

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + parseInt(daysLeft));

    // Update subscription
    const [subRows] = await db.query(`SELECT id FROM subscription WHERE tenantId = ?`, [tenant.id]);
    
    if (subRows.length > 0) {
      await db.query(`
        UPDATE subscription 
        SET planName = ?, status = ?, trialEndDate = ?, updatedAt = NOW() 
        WHERE tenantId = ?
      `, [planName.toUpperCase(), status.toUpperCase(), trialEndDate, tenant.id]);
      console.log(`✅ Subscription updated to ${planName.toUpperCase()} (${status.toUpperCase()})`);
    } else {
      const id = 'sub_' + Math.random().toString(36).substr(2, 9);
      await db.query(`
        INSERT INTO subscription (id, tenantId, planName, status, trialEndDate, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, NOW(), NOW())
      `, [id, tenant.id, planName.toUpperCase(), status.toUpperCase(), trialEndDate]);
      console.log(`✅ New Subscription created: ${planName.toUpperCase()} (${status.toUpperCase()})`);
    }

    console.log(`📅 Trial/Period End Date: ${trialEndDate.toDateString()}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error updating subscription:', err.message);
    process.exit(1);
  }
}

setSubscription();
