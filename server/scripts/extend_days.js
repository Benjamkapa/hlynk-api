import { db, pool } from '../dbms/mysql.js';

const args = process.argv.slice(2);
if (args.length === 0) {
  console.log('Usage: node scripts/extend_days.js <email1> [<email2> ...] [days]');
  process.exit(1);
}

// Check if the last argument is a number (days). If so, pop it. Otherwise, default to 30.
let daysToAdd = 30;
const lastArg = parseInt(args[args.length - 1]);
if (!isNaN(lastArg)) {
  daysToAdd = lastArg;
  args.pop(); // remove the number from the list of emails
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
      let currentEndDate = new Date(sub.endDate);
      
      // If expired, start from today. If still active, extend from existing endDate.
      const startFrom = currentEndDate > new Date() ? currentEndDate : new Date();
      const newEndDate = new Date(startFrom);
      newEndDate.setDate(newEndDate.getDate() + daysToAdd);

      // 3. Update subscription
      await db.query(`
        UPDATE subscription 
        SET endDate = ?, status = 0, updatedAt = NOW() 
        WHERE tenantId = ?
      `, [newEndDate, tenantId]);

      console.log(`✅ Success! Subscription for ${email} extended by ${daysToAdd} days.`);
      console.log(`📅 Old Expiry: ${sub.endDate}`);
      console.log(`📅 New Expiry: ${newEndDate.toISOString().slice(0, 19).replace('T', ' ')}`);
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
