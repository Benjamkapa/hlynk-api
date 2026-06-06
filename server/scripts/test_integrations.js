/**
 * eTIMS & KCB Buni Integration Test Script
 * =========================================
 * Tests both integrations against their SANDBOX environments
 * before going live. Run this from the server directory.
 *
 * Usage:
 *   npm run test:integrations
 *
 * What it tests:
 *   eTIMS — Device Init (get Communication Key from KRA sandbox)
 *   eTIMS — Submit a mock invoice to KRA sandbox
 *   KCB   — OAuth token generation from Buni sandbox
 *   KCB   — STK Push to a test phone number
 */

import 'dotenv/config';
import { initDevice, submitInvoice } from '../utils/etims.js';
import { initiateKcbStkPush } from '../utils/kcb.js';
import { db } from '../dbms/mysql.js';

// ─────────────────────────────────────────────────────────
// CONFIG — Edit these before running
// ─────────────────────────────────────────────────────────

const ETIMS_CONFIG = {
  kra_pin:              'P000000000A',       // ← Your KRA test PIN from sandbox portal
  branch_id:            '00',
  device_serial_number: 'TEST00000001',      // ← Device S/N registered on KRA sandbox
  env:                  'sandbox',
};

const KCB_CREDENTIALS = {
  consumerKey:    process.env.KCB_CONSUMER_KEY    || '',  // ← From Buni portal
  consumerSecret: process.env.KCB_CONSUMER_SECRET || '',  // ← From Buni portal
  env:            'sandbox',
};

const KCB_TEST_PHONE  = '0712345678';   // ← The Safaricom test number (yours or sandbox number)
const KCB_TEST_AMOUNT = 1;              // Keep it KES 1 during testing

// ─────────────────────────────────────────────────────────
// Helper
// ─────────────────────────────────────────────────────────
function log(icon, label, message, success = true) {
  const status = success ? '✅' : '❌';
  console.log(`${status} [${icon}] ${label}: ${message}`);
}

function section(title) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(50));
}

// ─────────────────────────────────────────────────────────
// eTIMS Tests
// ─────────────────────────────────────────────────────────
async function testEtims() {
  section('🧾 KRA eTIMS SANDBOX TESTS');

  // --- Test 1: Device Initialization ---
  console.log('\n[1/2] Testing Device Initialization (selectInitOsdcInfo)...');
  let communicationKey = null;

  try {
    const result = await initDevice(ETIMS_CONFIG);
    communicationKey = result.communicationKey;
    log('eTIMS', 'Device Init', `OK — Communication Key received: ${communicationKey.slice(0, 20)}...`);
    console.log(`      → resultCd:  ${result.resultCd}`);
    console.log(`      → resultMsg: ${result.resultMsg}`);
  } catch (err) {
    log('eTIMS', 'Device Init', err.message, false);
    console.log('\n  ⚠️  Cannot proceed to invoice test without a Communication Key.');
    console.log('  Check: KRA PIN, Device Serial Number, and sandbox access.');
    return;
  }

  // --- Test 2: Submit a Mock Invoice ---
  console.log('\n[2/2] Testing Invoice Submission (saveTrnsSalesOsdc)...');

  const mockSale = {
    id:            'TEST' + Date.now(),
    totalAmount:   100,
    customerName:  'Test Customer',
    paymentMethod: 'CASH',
    items: [
      { productId: 'ITEM001', name: 'Test Bread',  quantity: 2, price: 30 },
      { productId: 'ITEM002', name: 'Test Mandazi', quantity: 4, price: 10 },
    ],
  };

  try {
    const result = await submitInvoice(
      {
        kra_pin:           ETIMS_CONFIG.kra_pin,
        branch_id:         ETIMS_CONFIG.branch_id,
        communication_key: communicationKey,
        env:               ETIMS_CONFIG.env,
      },
      mockSale,
      9999 // Test invoice number
    );

    log('eTIMS', 'Invoice Submit', `OK — KRA Receipt: ${result.kraReceiptNumber}`);
    console.log(`      → resultCd:  ${result.resultCd}`);
    console.log(`      → resultMsg: ${result.resultMsg}`);
    if (result.qrCode) {
      console.log(`      → QR Code:  ${result.qrCode.slice(0, 40)}...`);
    }
  } catch (err) {
    log('eTIMS', 'Invoice Submit', err.message, false);
  }
}

// ─────────────────────────────────────────────────────────
// KCB Buni Tests
// ─────────────────────────────────────────────────────────
async function testKcb() {
  section('🏦 KCB BUNI SANDBOX TESTS');

  if (!KCB_CREDENTIALS.consumerKey) {
    log('KCB', 'Config Check', 'KCB_CONSUMER_KEY is not set. Add it to .env or edit this script.', false);
    console.log('  ℹ️  Get credentials from: https://sandbox.buni.kcbgroup.com');
    return;
  }

  // --- Test 1: STK Push ---
  console.log('\n[1/1] Testing KCB STK Push (v1/mobilecheckout)...');
  console.log(`      Phone:  ${KCB_TEST_PHONE}`);
  console.log(`      Amount: KES ${KCB_TEST_AMOUNT}`);

  try {
    const result = await initiateKcbStkPush(
      {
        phone:     KCB_TEST_PHONE,
        amount:    KCB_TEST_AMOUNT,
        reference: `TEST-${Date.now()}`,
      },
      KCB_CREDENTIALS,
      {
        customerName:  'Test Customer',
        initiatorName: 'Admin Test',
        tenantName:    'Hlynk Test',
        tenantId:      'TEST_TENANT',
      }
    );

    log('KCB', 'STK Push', `OK — CheckoutRequestID: ${result.CheckoutRequestID}`);
    console.log(`      → Full Response:`, JSON.stringify(result, null, 6).split('\n').slice(0,8).join('\n'));
  } catch (err) {
    log('KCB', 'STK Push', err.message, false);
    console.log('\n  Common causes:');
    console.log('  · Wrong consumerKey / consumerSecret');
    console.log('  · App not approved on Buni sandbox portal');
    console.log('  · Callback URL not whitelisted on Buni');
  }
}

// ─────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────
async function printChecklist() {
  section('📋 PRE-PRODUCTION CHECKLIST');

  const checks = [
    ['Have KRA sandbox PIN & device serial',   'Register at https://etims-sbx.kra.go.ke'],
    ['eTIMS Device Init returns cmcKey',        'Above test [1/2] must pass'],
    ['eTIMS Invoice Submit returns resultCd 000', 'Above test [2/2] must pass'],
    ['KCB Buni sandbox app created',            'Register at https://sandbox.buni.kcbgroup.com'],
    ['KCB consumerKey + Secret in .env',        'KCB_CONSUMER_KEY, KCB_CONSUMER_SECRET'],
    ['Callback URL whitelisted on Buni',        `Your BACKEND_URL/api/v1/payments/kcb/callback`],
    ['KCB STK Push returns CheckoutRequestID',  'Above test [1/1] must pass'],
    ['Switch env to production in DB settings', "Update etims_credentials.env = 'production' & KCB_ENV=production"],
  ];

  console.log('');
  checks.forEach(([item, hint], i) => {
    console.log(`  ${i + 1}. ☐  ${item}`);
    console.log(`       ↳ ${hint}`);
  });
  console.log('');
}

// ─────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────
async function run() {
  console.log('\n🔬 Hlynk Integration Test Suite');
  console.log('   eTIMS (KRA Sandbox) + KCB Buni (Sandbox)');
  console.log('   ' + new Date().toLocaleString());

  await testEtims();
  await testKcb();
  await printChecklist();

  process.exit(0);
}

run().catch(err => {
  console.error('\n💥 Fatal Error:', err.message);
  process.exit(1);
});
