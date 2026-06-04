import { db, pool } from '../dbms/mysql.js';

const email = process.argv[2];
const daysToAdd = parseInt(process.argv[3]) || 30;

if (!email) {
  console.log('Usage: node scripts/extend_days.js <email> [days]');
  process.exit(1);
}

const extendDays = async () => {
  try {
    // 1. Find user and tenant
    const [users] = await db.query('SELECT tenantId, name FROM user WHERE email = ? LIMIT 1', [email]);
    
    if (users.length === 0) {
      console.error(`❌ Error: User with email ${email} not found.`);
      await pool.end();
      process.exit(1);
    }

    const { tenantId, name } = users[0];
    console.log(`🔍 Found user: ${name} (Tenant: ${tenantId})`);

    // 2. Check current subscription
    const [subs] = await db.query('SELECT * FROM subscription WHERE tenantId = ? LIMIT 1', [tenantId]);
    
    if (subs.length === 0) {
      console.error(`❌ Error: No subscription record found for tenant ${tenantId}.`);
      await pool.end();
      process.exit(1);
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

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('❌ Database Error:', err.message);
    if (pool) await pool.end();
    process.exit(1);
  }
};

extendDays();
