import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

async function activateFullExperience() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: node scripts/activate_trial_all.js <user_email> [days]');
    console.log('Example: node scripts/activate_trial_all.js imkap@hlynk.co.ke 14');
    process.exit(1);
  }

  const email = args[0];
  const days = parseInt(args[1]) || 14;

  try {
    // 1. Find User & Tenant
    const [userRows] = await db.query(`
      SELECT u.id as userId, u.tenantId, t.businessName 
      FROM user u 
      JOIN tenant t ON u.tenantId = t.id 
      WHERE u.email = ?
    `, [email]);

    if (userRows.length === 0) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    const { tenantId, businessName, userId } = userRows[0];
    console.log(`🚀 Activating Full Experience for: ${businessName} (${email})`);

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + days);

    // 2. Set Subscription to MAX (Full Access) and TRIAL status
    // Status codes: 0 = ACTIVE, 1 = EXPIRED, 2 = TRIAL
    const [subRows] = await db.query(`SELECT id FROM subscription WHERE tenantId = ?`, [tenantId]);
    
    if (subRows.length > 0) {
      await db.query(`
        UPDATE subscription 
        SET planName = 'MAX', status = 2, trialEndDate = ?, updatedAt = NOW() 
        WHERE tenantId = ?
      `, [trialEndDate, tenantId]);
    } else {
      await db.query(`
        INSERT INTO subscription (id, tenantId, planName, status, trialEndDate, createdAt, updatedAt)
        VALUES (?, ?, 'MAX', 2, ?, NOW(), NOW())
      `, [ulid(), tenantId, trialEndDate]);
    }

    // 3. Clear any trial restrictions on Tenant
    await db.query(`UPDATE tenant SET isTrial = 0 WHERE id = ?`, [tenantId]);

    // 4. Log the action
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, ?, ?, 'Premium Trial Activated', 'System', ?, NOW())
    `, [ulid(), tenantId, userId, `Full system access (MAX plan) granted for ${days} days by script`, ]);

    console.log(`✅ Success! ${businessName} now has full access until ${trialEndDate.toLocaleString()}`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

activateFullExperience();
