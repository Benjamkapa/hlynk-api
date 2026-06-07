// check_referral_col.js — run with: node check_referral_col.js
import 'dotenv/config';
import mysql from 'mysql2/promise';

const pool = await mysql.createPool(process.env.DATABASE_URL);

const [cols] = await pool.query(`SHOW COLUMNS FROM tenant`);
console.log('\n=== tenant table columns ===');
cols.forEach(c => console.log(` ${c.Field.padEnd(25)} ${c.Type.padEnd(20)} ${c.Null} ${c.Key || ''}`));

const hasReferralCode  = cols.some(c => c.Field === 'referralCode');
const hasReferredById  = cols.some(c => c.Field === 'referredById');
console.log('\n referralCode column exists:', hasReferralCode);
console.log(' referredById column exists:', hasReferredById);

if (!hasReferralCode) {
  console.log('\n⚙️  Adding referralCode column...');
  await pool.query(`ALTER TABLE tenant ADD COLUMN referralCode VARCHAR(32) NULL DEFAULT NULL AFTER businessName`);
  console.log('✅  referralCode added');
}

if (!hasReferredById) {
  console.log('\n⚙️  Adding referredById column...');
  await pool.query(`ALTER TABLE tenant ADD COLUMN referredById VARCHAR(26) NULL DEFAULT NULL AFTER referralCode`);
  console.log('✅  referredById added');
}

// Now heal existing tenants that have no referralCode
const [tenants] = await pool.query(`SELECT id, businessName FROM tenant WHERE referralCode IS NULL OR referralCode = ''`);
console.log(`\n🔍  Tenants missing referralCode: ${tenants.length}`);
for (const t of tenants) {
  const code = (t.businessName || 'HLNK').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase()
             + Math.random().toString(36).slice(2, 6).toUpperCase();
  await pool.query(`UPDATE tenant SET referralCode = ? WHERE id = ?`, [code, t.id]);
  console.log(`  ✅  ${t.businessName} → ${code}`);
}

// Show a sample to verify
const [sample] = await pool.query(`SELECT id, businessName, referralCode FROM tenant LIMIT 5`);
console.log('\n=== Sample tenant rows ===');
sample.forEach(r => console.log(`  ${r.businessName.padEnd(30)} ${r.referralCode}`));

await pool.end();
console.log('\nDone.');
