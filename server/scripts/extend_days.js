import { db, pool } from '../dbms/mysql.js';
import { createNotification } from '../controllers/notifications.js';
import { ulid } from 'ulid';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage:');
  console.log('  npm run sub:extend <email> <days> [PLAN]');
  console.log('  node scripts/extend_days.js <email> [days] [PLAN]');
  console.log('Examples:');
  console.log('  npm run sub:extend calvingilbert310@gmail.com 90');
  console.log('  npm run sub:extend calvingilbert310@gmail.com 90 MAX');
  process.exit(1);
}

const KNOWN_PLANS = ['STARTER', 'LITE', 'PLUS', 'GROWTH', 'MAX', 'BUSINESS PRO', 'PRO'];
const PLAN_MAP = {
  'STARTER': 'STARTER',
  'LITE': 'STARTER',
  'PLUS': 'PLUS',
  'GROWTH': 'PLUS',
  'MAX': 'MAX',
  'BUSINESS PRO': 'MAX',
  'PRO': 'MAX'
};

// 1. Extract days (first numeric argument)
let daysToAdd = 30; // default 30 days if not provided
let foundNumIndex = args.findIndex(arg => !isNaN(Number(arg)) && arg.trim() !== '');
if (foundNumIndex !== -1) {
  daysToAdd = Number(args[foundNumIndex]);
  args.splice(foundNumIndex, 1);
}

// 2. Extract optional plan if provided
let specifiedPlan = null;
let foundPlanIndex = args.findIndex(arg => KNOWN_PLANS.includes(arg.trim().toUpperCase()));
if (foundPlanIndex !== -1) {
  specifiedPlan = PLAN_MAP[args[foundPlanIndex].trim().toUpperCase()];
  args.splice(foundPlanIndex, 1);
}

// Remaining args are identifiers (emails, slugs, or tenantIds)
const targets = args;

if (targets.length === 0) {
  console.log('❌ Error: Please provide at least one user email or tenant identifier.');
  process.exit(1);
}

const extendDays = async () => {
  try {
    for (const target of targets) {
      // 1. Find user and tenant (by email, tenantId, or slug)
      let [users] = await db.query(
        'SELECT u.id as userId, u.tenantId, u.name, u.email, t.businessName, t.slug FROM user u LEFT JOIN tenant t ON u.tenantId = t.id WHERE u.email = ? LIMIT 1',
        [target]
      );

      let tenantId = null;
      let businessName = 'N/A';
      let userName = target;

      if (users.length > 0) {
        tenantId = users[0].tenantId;
        businessName = users[0].businessName || 'Business';
        userName = users[0].name || users[0].email;
      } else {
        // Try searching by tenant id or slug
        const [tenants] = await db.query(
          'SELECT id, businessName, slug FROM tenant WHERE id = ? OR slug = ? LIMIT 1',
          [target, target]
        );
        if (tenants.length > 0) {
          tenantId = tenants[0].id;
          businessName = tenants[0].businessName || 'Business';
        } else {
          console.error(`❌ Error: User or tenant "${target}" not found.`);
          continue;
        }
      }

      console.log(`\n🔍 Found: ${businessName} (User: ${userName}, Tenant ID: ${tenantId})`);

      // 2. Check current subscription
      const [subs] = await db.query('SELECT * FROM subscription WHERE tenantId = ? LIMIT 1', [tenantId]);

      const now = new Date();
      let currentPlan = specifiedPlan || 'MAX';
      let baseDate = now;

      if (subs.length > 0) {
        const sub = subs[0];
        currentPlan = specifiedPlan || sub.planName || 'MAX';

        // Check if existing endDate is valid and in the future
        let existingEndDate = sub.endDate ? new Date(sub.endDate) : null;
        let existingTrialEndDate = sub.trialEndDate ? new Date(sub.trialEndDate) : null;

        if (existingEndDate && !isNaN(existingEndDate.getTime()) && existingEndDate > now) {
          baseDate = existingEndDate;
        } else if (existingTrialEndDate && !isNaN(existingTrialEndDate.getTime()) && existingTrialEndDate > now) {
          baseDate = existingTrialEndDate;
        } else {
          baseDate = now;
        }
      }

      // Calculate new end date
      const newEndDate = new Date(baseDate);
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);

      const newStatus = newEndDate > now ? 0 : 1; // 0 = ACTIVE, 1 = EXPIRED

      if (subs.length > 0) {
        await db.query(`
          UPDATE subscription 
          SET planName = ?, endDate = ?, status = ?, updatedAt = NOW() 
          WHERE tenantId = ?
        `, [currentPlan, newEndDate, newStatus, tenantId]);
      } else {
        await db.query(`
          INSERT INTO subscription (id, tenantId, planName, status, endDate, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, NOW(), NOW())
        `, [ulid(), tenantId, currentPlan, newStatus, newEndDate]);
      }

      // Clear trial status on tenant if extended actively
      if (newStatus === 0) {
        await db.query(`UPDATE tenant SET isTrial = 0, updatedAt = NOW() WHERE id = ?`, [tenantId]);
      }

      const actionText = daysToAdd >= 0 ? 'extended' : 'reduced';
      const statusText = newStatus === 0 ? 'ACTIVE' : 'EXPIRED';
      const displayPlan = currentPlan === 'MAX' ? 'Business Pro' : currentPlan === 'PLUS' ? 'Growth' : 'Starter';

      console.log(`✅ Success! Subscription for "${target}" ${actionText} by ${Math.abs(daysToAdd)} days.`);
      console.log(`📦 Plan:       ${displayPlan} (${currentPlan})`);
      console.log(`📡 Status:     ${statusText} (${newStatus})`);
      console.log(`📅 Base Date:  ${baseDate.toLocaleString()}`);
      console.log(`📅 New Expiry: ${newEndDate.toISOString().slice(0, 19).replace('T', ' ')}`);

      // 4. Notify the tenant
      const absDays = Math.abs(daysToAdd);
      const direction = daysToAdd >= 0 ? 'extended' : 'reduced';
      await createNotification({
        tenantId,
        title: daysToAdd >= 0 ? `⏳ ${absDays} Extra Days Added!` : '📅 Subscription Adjusted',
        message: `Your ${displayPlan} subscription has been ${direction} by ${absDays} day${absDays !== 1 ? 's' : ''}. New expiry: ${newEndDate.toDateString()}.`,
        type: 'success',
        data: { url: '/dashboard/subscription' }
      }).catch(() => {});
    }

    if (pool) await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Database Error:', err.message);
    if (pool) await pool.end();
    process.exit(1);
  }
};

extendDays();
