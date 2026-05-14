import { db } from '../dbms/mysql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function setSubscription() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: node scripts/set_subscription.js <email_or_slug> <plan_name> [status] [days_left]');
    console.log('Example: node scripts/set_subscription.js test@example.com MAX ACTIVE');
    console.log('Example: node scripts/set_subscription.js my-store LITE TRIAL 3');
    process.exit(1);
  }

  const [identifier, planName, status = 'ACTIVE', daysLeft = 30] = args;

  try {
    // Find tenant
    const [tenants] = await db.query(`
      SELECT t.id, t.businessName, t.slug, u.email 
      FROM Tenant t 
      JOIN User u ON u.tenantId = t.id 
      WHERE u.email = ? OR t.slug = ?
    `, [identifier, identifier]);

    if (tenants.length === 0) {
      console.error(`❌ No tenant found for identifier: ${identifier}`);
      process.exit(1);
    }

    const tenant = tenants[0];
    console.log(`🔍 Found Tenant: ${tenant.businessName} (${tenant.slug})`);

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + parseInt(daysLeft));

    // Update subscription
    const [subRows] = await db.query(`SELECT id FROM Subscription WHERE tenantId = ?`, [tenant.id]);
    
    if (subRows.length > 0) {
      await db.query(`
        UPDATE Subscription 
        SET planName = ?, status = ?, trialEndDate = ?, updatedAt = NOW() 
        WHERE tenantId = ?
      `, [planName.toUpperCase(), status.toUpperCase(), trialEndDate, tenant.id]);
      console.log(`✅ Subscription updated to ${planName.toUpperCase()} (${status.toUpperCase()})`);
    } else {
      const id = 'sub_' + Math.random().toString(36).substr(2, 9);
      await db.query(`
        INSERT INTO Subscription (id, tenantId, planName, status, trialEndDate, createdAt, updatedAt)
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
