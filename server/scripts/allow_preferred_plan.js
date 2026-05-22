import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

const args = process.argv.slice(2);
const email = args[0];
const planName = (args[1] || 'PLUS').toUpperCase(); // Default to PLUS (Growth)
const days = parseInt(args[2] || '30');

if (!email) {
  console.log('Usage: node scripts/allow_preferred_plan.js <user_email> [PLAN_NAME] [days]');
  console.log('Plans: LITE, PLUS, MAX');
  process.exit(1);
}

async function grantAccess() {
  try {
    // 1. Find the tenant and user
    const [tenants] = await db.query(`
      SELECT t.id, t.businessName, u.id as userId, u.name 
      FROM tenant t 
      JOIN user u ON u.tenantId = t.id 
      WHERE u.email = ?
      LIMIT 1
    `, [email]);

    if (tenants.length === 0) {
      console.error(`❌ Error: User with email "${email}" not found.`);
      process.exit(1);
    }

    const { id: tenantId, businessName, userId, name } = tenants[0];
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    console.log(`\n🚀 Granting access to ${businessName}...`);
    console.log(`-------------------------------------------`);
    console.log(`Plan:    ${planName}`);
    console.log(`Period:  ${days} days`);
    console.log(`Expiry:  ${endDate.toLocaleString()}`);

    // 2. Update/Insert Subscription
    const [subs] = await db.query('SELECT id FROM subscription WHERE tenantId = ?', [tenantId]);
    
    if (subs.length > 0) {
      await db.query(`
        UPDATE subscription 
        SET planName = ?, status = 0, endDate = ?, updatedAt = NOW() 
        WHERE tenantId = ?
      `, [planName, endDate, tenantId]);
    } else {
      await db.query(`
        INSERT INTO subscription (id, tenantId, planName, status, endDate, createdAt, updatedAt)
        VALUES (?, ?, ?, 0, ?, NOW(), NOW())
      `, [ulid(), tenantId, planName, endDate]);
    }

    // 3. Clear Trial Flags in Tenant
    await db.query('UPDATE tenant SET isTrial = 0, updatedAt = NOW() WHERE id = ?', [tenantId]);

    // 4. Record Activity Log
    await db.query(`
      INSERT INTO activitylog (id, tenantId, action, logName, details, createdAt) 
      VALUES (?, ?, 'Plan Grant', 'Billing', ?, NOW())
    `, [ulid(), tenantId, `Manually granted ${planName} access for ${days} days`]);

    // 5. Send System Notification
    const displayPlan = planName === 'MAX' ? 'Business Pro' : planName === 'PLUS' ? 'Growth' : 'Starter';
    await db.query(`
      INSERT INTO notification (id, tenantId, title, message, type, status, createdAt) 
      VALUES (?, ?, 'Plan Activated!', ?, 'success', 0, NOW())
    `, [ulid(), tenantId, `Your ${displayPlan} plan has been activated. Enjoy all the features!`, 'success']);

    console.log(`\n✅ SUCCESS: ${businessName} now has access to the ${planName} plan.`);
    process.exit(0);
  } catch (err) {
    console.error('💥 Execution Error:', err.message);
    process.exit(1);
  }
}

grantAccess();
