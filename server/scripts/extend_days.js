import { db, pool } from '../dbms/mysql.js';
import { createNotification } from '../controllers/notifications.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/extend_days.js <email1> [<email2> ...] [days]');
  process.exit(1);
}

// Find the first argument that is a valid number (could be positive or negative)
// We need to parse strict numbers, since "-10" might be interpreted poorly by loose matching.
let daysToAddStr = args.find(arg => !isNaN(Number(arg)) && arg.trim() !== '');

if (daysToAddStr === undefined) {
  console.log('Error: Please provide a valid number of days (e.g. 5 or -5) to extend/reduce.');
  process.exit(1);
}

let daysToAdd = Number(daysToAddStr);
let foundNumIndex = args.indexOf(daysToAddStr);

if (foundNumIndex !== -1) {
  args.splice(foundNumIndex, 1);
}

const emails = args;

const extendDays = async () => {
  try {
    for (const email of emails) {
      // 1. Find user and tenant
      const [users] = await db.query('SELECT tenantId, name FROM user WHERE email = ? LIMIT 1', [email]);

      if (users.length === 0) {
        console.error(`❌ Error: User with email ${email} not found.`);
        continue;
      }

      const { tenantId, name } = users[0];
      console.log(`\n🔍 Found user: ${name || 'N/A'} (Tenant: ${tenantId})`);

      // 2. Check current subscription
      const [subs] = await db.query('SELECT * FROM subscription WHERE tenantId = ? LIMIT 1', [tenantId]);

      if (subs.length === 0) {
        console.error(`❌ Error: No subscription record found for tenant ${tenantId}.`);
        continue;
      }

      const sub = subs[0];
      const now = new Date();
      let currentEndDate = new Date(sub.endDate);

      let newEndDate;
      if (daysToAdd > 0) {
        // Extending: Start from existing end date if still active, otherwise start from now
        const baseDate = currentEndDate > now ? currentEndDate : now;
        newEndDate = new Date(baseDate);
      } else {
        // Reducing: Always subtract from the current end date
        newEndDate = new Date(currentEndDate);
      }
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);

      // 3. Update subscription (Automatically expire if date is now in the past)
      const newStatus = newEndDate > now ? 0 : 1;

      await db.query(`
        UPDATE subscription 
        SET endDate = ?, status = ?, updatedAt = NOW() 
        WHERE tenantId = ?
      `, [newEndDate, newStatus, tenantId]);

      const actionText = daysToAdd >= 0 ? 'extended' : 'reduced';
      const statusText = newStatus === 0 ? 'ACTIVE' : 'EXPIRED';

      console.log(`✅ Success! Subscription for ${email} ${actionText} by ${Math.abs(daysToAdd)} days.`);
      console.log(`📡 New Status: ${statusText} (${newStatus})`);
      console.log(`📅 Old Expiry: ${sub.endDate}`);
      console.log(`📅 New Expiry: ${newEndDate.toISOString().slice(0, 19).replace('T', ' ')}`);

      // 4. Notify the provider
      const absDays = Math.abs(daysToAdd);
      const direction = daysToAdd > 0 ? 'extended' : 'reduced';
      await createNotification({
        tenantId,
        title: daysToAdd > 0 ? `⏳ ${absDays} Extra Days Added!` : '📅 Subscription Adjusted',
        message: `Your subscription has been ${direction} by ${absDays} day${absDays !== 1 ? 's' : ''} by Support. New expiry: ${newEndDate.toDateString()}.`,
        type: 'success'
      });
    }

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Database Error:', err.message);
    if (pool) await pool.end();
    process.exit(1);
  }
};

extendDays();
