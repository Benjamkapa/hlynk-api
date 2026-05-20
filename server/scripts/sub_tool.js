import { db } from '../dbms/mysql.js';

const args = process.argv.slice(2);
const command = args[0]; // 'check' or 'gift'
const slug = args[1];
const value = args[2] ? parseInt(args[2]) : 0;

if (!command || !slug) {
  console.log('Usage:');
  console.log('  node scripts/sub_tool.js check [slug]');
  console.log('  node scripts/sub_tool.js gift [slug] [days]');
  console.log('  node scripts/sub_tool.js expire [slug]');
  process.exit(1);
}

async function run() {
  try {
    const [tenants] = await db.query('SELECT id, businessName FROM Tenant WHERE slug = ?', [slug]);
    if (tenants.length === 0) {
      console.error(`❌ Error: Tenant with slug "${slug}" not found.`);
      process.exit(1);
    }
    const tenantId = tenants[0].id;
    const businessName = tenants[0].businessName;

    if (command === 'check') {
      const [subs] = await db.query('SELECT * FROM Subscription WHERE tenantId = ?', [tenantId]);
      if (subs.length === 0) {
        console.log(`ℹ️  ${businessName} has no subscription record.`);
      } else {
        const sub = subs[0];
        console.log(`\n📊 SUBSCRIPTION STATUS: ${businessName}`);
        console.log('-------------------------------------------');
        console.log(`Plan:    ${sub.planName}`);
        console.log(`Status:  ${sub.status === 0 ? 'ACTIVE (0)' : sub.status === 2 ? 'TRIAL (2)' : 'EXPIRED (1)'}`);
        console.log(`Starts:  ${new Date(sub.startDate).toLocaleDateString()}`);
        console.log(`Expires: ${new Date(sub.endDate).toLocaleString()}`);
        
        const now = new Date();
        const expiry = new Date(sub.endDate);
        const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          console.log(`⌛ Expired ${Math.abs(diffDays)} days ago.`);
        } else {
          console.log(`⏳ Time Remaining: ${diffDays} days.`);
        }
      }
    } else if (command === 'gift') {
      if (!value || value <= 0) {
        console.error('❌ Error: Specify a positive number of days to gift.');
        process.exit(1);
      }

      const [subs] = await db.query('SELECT endDate FROM Subscription WHERE tenantId = ?', [tenantId]);
      if (subs.length === 0) {
        console.log(`❌ Error: ${businessName} has no active subscription to extend.`);
        process.exit(1);
      }

      const currentEnd = new Date(subs[0].endDate);
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + value);

      await db.query('UPDATE Subscription SET endDate = ?, status = 0, updatedAt = NOW() WHERE tenantId = ?', [newEnd, tenantId]);
      
      console.log(`\n🎁 SUCCESS: Gifting ${value} days to ${businessName}`);
      console.log(`Old Expiry: ${currentEnd.toLocaleString()}`);
      console.log(`New Expiry: ${newEnd.toLocaleString()}`);
    } else if (command === 'expire') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db.query('UPDATE Subscription SET endDate = ?, status = 1, updatedAt = NOW() WHERE tenantId = ?', [yesterday, tenantId]);
      
      console.log(`\n🥀 SUCCESS: Subscription for ${businessName} has been EXPIRED.`);
      console.log(`New Expiry (Simulated): ${yesterday.toLocaleString()}`);
      console.log(`Status set to: 1 (EXPIRED)`);
    }

    process.exit(0);
  } catch (err) {
    console.error('💥 Execution Error:', err.message);
    process.exit(1);
  }
}

run();
