import { db } from '../dbms/mysql.js';

const args = process.argv.slice(2);
const command = args[0]; // 'check', 'gift', or 'expire'
const email = args[1];
const value = args[2] ? parseInt(args[2]) : 0;

if (!command || !email) {
  console.log('Usage:');
  console.log('  node scripts/sub_tool.js check [email]');
  console.log('  node scripts/sub_tool.js gift [email] [days]');
  console.log('  node scripts/sub_tool.js expire [email]');
  process.exit(1);
}

async function run() {
  try {
    const [tenants] = await db.query(`
      SELECT t.id, t.businessName 
      FROM tenant t 
      JOIN user u ON u.tenantId = t.id 
      WHERE u.email = ?
    `, [email]);

    if (tenants.length === 0) {
      console.error(`❌ Error: User with email "${email}" not found.`);
      process.exit(1);
    }
    const tenantId = tenants[0].id;
    const businessName = tenants[0].businessName;

    if (command === 'check') {
      const [subs] = await db.query('SELECT * FROM subscription WHERE tenantId = ?', [tenantId]);
      if (subs.length === 0) {
        console.log(`ℹ️  ${businessName} has no subscription record.`);
      } else {
        const sub = subs[0];
        console.log(`\n📊 subscription STATUS: ${businessName}`);
        console.log('-------------------------------------------');
        console.log(`Plan:    ${sub.planName}`);
        console.log(`Status:  ${sub.status === 0 ? 'ACTIVE (0)' : sub.status === 2 ? 'TRIAL (2)' : 'EXPIRED (1)'}`);
        console.log(`Starts:  ${new Date(sub.startDate).toLocaleDateString()}`);
        console.log(`Expires: ${new Date(sub.endDate).toLocaleString()}`);
        
        const now = new Date();
        const expiry = new Date(sub.endDate);
        const diffDays = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays <= 0) {
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

      const [subs] = await db.query('SELECT endDate, trialEndDate, status FROM subscription WHERE tenantId = ?', [tenantId]);
      if (subs.length === 0) {
        console.log(`❌ Error: ${businessName} has no subscription record.`);
        process.exit(1);
      }

      const sub = subs[0];
      // Use endDate if it exists and is in the future, otherwise use trialEndDate, otherwise use NOW
      let baseDate = new Date();
      if (sub.endDate && new Date(sub.endDate) > baseDate) {
        baseDate = new Date(sub.endDate);
      } else if (sub.trialEndDate && new Date(sub.trialEndDate) > baseDate) {
        baseDate = new Date(sub.trialEndDate);
      }

      const newEnd = new Date(baseDate);
      newEnd.setDate(newEnd.getDate() + value);

      // If they were expired (1), we reactivate them (0 or 2 depending on if it was a trial)
      // For simplicity, we'll set them to ACTIVE (0) if we are gifting days via endDate
      await db.query(`
        UPDATE subscription 
        SET endDate = ?, status = 0, updatedAt = NOW() 
        WHERE tenantId = ?
      `, [newEnd, tenantId]);
      
      console.log(`\n🎁 SUCCESS: Gifting ${value} days to ${businessName}`);
      console.log(`Reference Date: ${baseDate.toLocaleString()}`);
      console.log(`New Expiry:     ${newEnd.toLocaleString()}`);
      console.log(`Status:         ACTIVE (0)`);
    } else if (command === 'expire') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await db.query('UPDATE subscription SET endDate = ?, status = 1, updatedAt = NOW() WHERE tenantId = ?', [yesterday, tenantId]);
      
      console.log(`\n🥀 SUCCESS: subscription for ${businessName} has been EXPIRED.`);
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
