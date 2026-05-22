import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

const args = process.argv.slice(2);
const email = args[0];

if (!email) {
  console.log('Usage: node scripts/activate_trial.js <user_email>');
  console.log('Description: Activates a 7-day LITE (Starter) trial for the specified user email.');
  process.exit(1);
}

async function activateTrial() {
  try {
    // 1. Find the tenant by user email
    const [rows] = await db.query(`
      SELECT t.id, t.businessName, u.name 
      FROM tenant t 
      JOIN user u ON u.tenantId = t.id 
      WHERE u.email = ?
      LIMIT 1
    `, [email]);

    if (rows.length === 0) {
      console.error(`❌ Error: User with email "${email}" not found.`);
      process.exit(1);
    }

    const { id: tenantId, businessName, name } = rows[0];
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    console.log(`\n✨ Activating 7-Day Trial for ${businessName} (${email})...`);
    console.log(`-------------------------------------------`);
    console.log(`User:    ${name}`);
    console.log(`Plan:    LITE (Starter)`);
    console.log(`Status:  TRIAL (2)`);
    console.log(`Expiry:  ${trialEndDate.toLocaleString()}`);

    // 2. Update/Insert Subscription
    const [subs] = await db.query('SELECT id FROM subscription WHERE tenantId = ?', [tenantId]);
    
    if (subs.length > 0) {
      await db.query(`
        UPDATE subscription 
        SET planName = 'LITE', status = 2, trialEndDate = ?, updatedAt = NOW() 
        WHERE tenantId = ?
      `, [trialEndDate, tenantId]);
    } else {
      await db.query(`
        INSERT INTO subscription (id, tenantId, planName, status, trialEndDate, createdAt, updatedAt)
        VALUES (?, ?, 'LITE', 2, ?, NOW(), NOW())
      `, [ulid(), tenantId, trialEndDate]);
    }

    // 3. Ensure Tenant has isTrial flag (optional but good for tracking)
    // In our DB schema, tenant might not have isTrial, but handlePaymentCallback updates it.
    // Let's check if tenant table has isTrial column.
    try {
        await db.query('UPDATE tenant SET isTrial = 1, updatedAt = NOW() WHERE id = ?', [tenantId]);
    } catch (e) {
        // Column might not exist or other error, just ignore
    }

    // 4. Record Activity Log
    await db.query(`
      INSERT INTO activitylog (id, tenantId, action, logName, details, createdAt) 
      VALUES (?, ?, 'Trial Activated', 'Billing', 'Manually activated 7-day LITE trial via script', NOW())
    `, [ulid(), tenantId]);

    // 5. Send System Notification
    await db.query(`
      INSERT INTO notification (id, tenantId, title, message, type, status, createdAt) 
      VALUES (?, ?, '7-Day Trial Active!', 'Your 7-day Starter trial has been activated. Enjoy exploring hlynk!', 'success', 0, NOW())
    `, [ulid(), tenantId]);

    console.log(`\n✅ SUCCESS: Trial activated successfully for ${businessName}.`);
    process.exit(0);
  } catch (err) {
    console.error('💥 Execution Error:', err.message);
    process.exit(1);
  }
}

activateTrial();
