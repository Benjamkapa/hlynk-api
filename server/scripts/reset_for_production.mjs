/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║           HLYNK — PRODUCTION RESET SCRIPT                   ║
 * ║  Clears all test transactional data before going live.      ║
 * ║  Run ONCE from the server:  node scripts/reset_for_production.mjs  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * WHAT THIS CLEARS:
 *   ✅ sale          — Gross Volume (GMV) / M-Pesa collection totals
 *   ✅ payment       — Platform Revenue, revenue trend graph
 *   ✅ payout        — Pending payout amounts
 *   ✅ activitylog   — Security alerts, failed logins, recent activity feed
 *   ✅ session        — All test login sessions
 *   ✅ saleitem      — Line items tied to test sales (FK child of sale)
 *   ✅ notification  — Test push/in-app notifications
 *
 * WHAT THIS PRESERVES:
 *   🔒 tenant        — Registered vendor accounts
 *   🔒 user          — All user accounts
 *   🔒 subscription  — Subscription / plan records
 *   🔒 product       — Product catalogue
 *   🔒 provider      — Provider profiles
 *   🔒 customer      — Customer records
 */

import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

// ── Tables to wipe (order matters — children before parents) ──────────────────
const TABLES_TO_TRUNCATE = [
  'saleitem',       // FK child of sale — must go first
  'sale',           // Gross Volume, M-Pesa collections
  'payment',        // Platform Revenue, revenue trend
  'payout',         // Pending payouts
  'activitylog',    // Security alerts, failed logins, activity feed
  'session',        // Test login sessions
  'notification',   // Test push / in-app notifications
];

// ── Confirm prompt ────────────────────────────────────────────────────────────
function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans.trim().toLowerCase()); }));
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║       HLYNK — PRODUCTION RESET SCRIPT               ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌  DATABASE_URL not found in .env. Aborting.');
    process.exit(1);
  }

  // Show which DB we're hitting so there are no surprises
  const dbName = dbUrl.match(/\/([^/?]+)(\?|$)/)?.[1] || '(unknown)';
  console.log(`🔗  Target database : ${dbName}`);
  console.log(`📋  Tables to wipe  : ${TABLES_TO_TRUNCATE.join(', ')}\n`);
  console.log('⚠️   This will permanently delete ALL test transactional data.');
  console.log('    Vendor accounts, products, and subscriptions are NOT affected.\n');

  const answer = await confirm('Type  yes  to proceed, anything else to abort: ');
  if (answer !== 'yes') {
    console.log('\n🛑  Aborted — no changes made.\n');
    process.exit(0);
  }

  let conn;
  try {
    conn = await mysql.createConnection(dbUrl);
    console.log('\n✅  Connected to database.\n');

    await conn.query('SET FOREIGN_KEY_CHECKS = 0');

    for (const table of TABLES_TO_TRUNCATE) {
      try {
        // Count rows before wipe so we can report
        const [[{ cnt }]] = await conn.query(`SELECT COUNT(*) as cnt FROM \`${table}\``);
        await conn.query(`TRUNCATE TABLE \`${table}\``);
        console.log(`  🗑️   ${table.padEnd(16)} — cleared ${cnt} row(s)`);
      } catch (err) {
        // Table might not exist in all environments — warn but continue
        console.warn(`  ⚠️   ${table.padEnd(16)} — skipped (${err.message})`);
      }
    }

    await conn.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('\n✅  All test data cleared. Your platform is ready for production.\n');
    console.log('👉  Restart the server now:  pm2 restart hlynk-server\n');
  } catch (err) {
    console.error('\n❌  Error during reset:', err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

main();
