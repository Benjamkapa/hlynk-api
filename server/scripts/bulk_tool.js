import { db } from '../dbms/mysql.js';

const args = process.argv.slice(2);
const command = args[0]; // 'check', 'gift', 'expire', 'trial'
const value = args[1]; // days for gift/trial, or the first email for check/expire

if (!command || args.length < 2) {
  console.log('Usage:');
  console.log('  node scripts/bulk_tool.js check <email1> <email2> ...');
  console.log('  node scripts/bulk_tool.js gift <days> <email1> <email2> ...');
  console.log('  node scripts/bulk_tool.js expire <email1> <email2> ...');
  console.log('  node scripts/bulk_tool.js trial <days> <email1> <email2> ...');
  process.exit(1);
}

async function processUser(command, identifier, extraValue) {
  try {
    const [tenants] = await db.query(`
      SELECT t.id, t.businessName, u.email 
      FROM tenant t 
      JOIN user u ON u.tenantId = t.id 
      WHERE u.email = ?
    `, [identifier]);

    if (tenants.length === 0) {
      return { email: identifier, success: false, message: 'User not found' };
    }

    const { id: tenantId, businessName } = tenants[0];

    if (command === 'check') {
      const [subs] = await db.query('SELECT * FROM subscription WHERE tenantId = ?', [tenantId]);
      if (subs.length === 0) return { email: identifier, success: true, message: `${businessName}: No subscription` };
      const sub = subs[0];
      const status = sub.status === 0 ? 'ACTIVE' : sub.status === 2 ? 'TRIAL' : 'EXPIRED';
      return { email: identifier, success: true, message: `${businessName}: ${sub.planName} (${status}) - Expiry: ${new Date(sub.endDate || sub.trialEndDate).toLocaleDateString()}` };
    
    } else if (command === 'gift') {
      const days = parseInt(extraValue);
      const [subs] = await db.query('SELECT endDate, trialEndDate FROM subscription WHERE tenantId = ?', [tenantId]);
      if (subs.length === 0) return { email: identifier, success: false, message: 'No subscription record found to extend' };
      
      let baseDate = new Date();
      if (subs[0].endDate && new Date(subs[0].endDate) > baseDate) baseDate = new Date(subs[0].endDate);
      else if (subs[0].trialEndDate && new Date(subs[0].trialEndDate) > baseDate) baseDate = new Date(subs[0].trialEndDate);

      const newEnd = new Date(baseDate);
      newEnd.setDate(newEnd.getDate() + days);

      await db.query('UPDATE subscription SET endDate = ?, status = 0, updatedAt = NOW() WHERE tenantId = ?', [newEnd, tenantId]);
      return { email: identifier, success: true, message: `Gifted ${days} days to ${businessName}. New Expiry: ${newEnd.toLocaleDateString()}` };

    } else if (command === 'expire') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await db.query('UPDATE subscription SET endDate = ?, status = 1, updatedAt = NOW() WHERE tenantId = ?', [yesterday, tenantId]);
      return { email: identifier, success: true, message: `Expired subscription for ${businessName}` };

    } else if (command === 'trial') {
        const days = parseInt(extraValue) || 7;
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + days);
        const [subs] = await db.query('SELECT id FROM subscription WHERE tenantId = ?', [tenantId]);
        if (subs.length > 0) {
            await db.query('UPDATE subscription SET status = 2, trialEndDate = ?, updatedAt = NOW() WHERE tenantId = ?', [trialEnd, tenantId]);
        } else {
            await db.query('INSERT INTO subscription (id, tenantId, status, trialEndDate, planName, createdAt, updatedAt) VALUES (?, ?, 2, ?, "LITE", NOW(), NOW())', ['sub_'+Math.random().toString(36).substr(2,9), tenantId, trialEnd]);
        }
        return { email: identifier, success: true, message: `Activated ${days}-day trial for ${businessName}` };
    }

  } catch (err) {
    return { email: identifier, success: false, message: err.message };
  }
}

async function run() {
  const isValueBased = ['gift', 'trial'].includes(command);
  const extraValue = isValueBased ? args[1] : null;
  const emails = isValueBased ? args.slice(2) : args.slice(1);

  console.log(`\n🛠️  BULK TOOL: Processing ${command.toUpperCase()} for ${emails.length} users...\n`);

  for (const email of emails) {
    const result = await processUser(command, email, extraValue);
    if (result.success) {
      console.log(`✅ [${result.email}] ${result.message}`);
    } else {
      console.log(`❌ [${result.email}] ${result.message}`);
    }
  }

  console.log('\n✨ Done.');
  process.exit(0);
}

run();
