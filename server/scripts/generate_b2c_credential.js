/**
 * generate_b2c_credential.js
 * 
 * Generates the MPESA_SECURITY_CREDENTIAL needed for B2C by encrypting
 * the initiator password with the Daraja sandbox/production certificate.
 * 
 * Usage:
 *   node scripts/generate_b2c_credential.js
 *   node scripts/generate_b2c_credential.js --prod   (uses ProductionCertificate.cer)
 * 
 * Output: base64-encoded RSA-encrypted string — paste into .env as MPESA_SECURITY_CREDENTIAL
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.argv.includes('--prod');

// ── Default sandbox initiator credentials ──────────────────────────────────
// Daraja sandbox: initiator = "testapi", password = "Safaricom999!*!"
// For production replace with your actual initiator name & password from the portal.
const INITIATOR_PASSWORD = process.env.MPESA_INITIATOR_PASSWORD || 'Safaricom999!*!';

const certFile = isProd ? 'ProductionCertificate.cer' : 'SandboxCertificate.cer';
const certPath = path.join(__dirname, '..', certFile);

if (!fs.existsSync(certPath)) {
  console.error(`❌  Certificate not found: ${certPath}`);
  console.error(`    Download it from https://developer.safaricom.co.ke/docs#going-live`);
  process.exit(1);
}

const cert = fs.readFileSync(certPath, 'utf8');

const encrypted = crypto.publicEncrypt(
  {
    key: cert,
    padding: crypto.constants.RSA_PKCS1_PADDING,
  },
  Buffer.from(INITIATOR_PASSWORD)
);

const credential = encrypted.toString('base64');

console.log('\n✅  SecurityCredential generated successfully!\n');
console.log('Env:         ', isProd ? 'PRODUCTION' : 'SANDBOX');
console.log('Initiator:   ', process.env.MPESA_INITIATOR || 'testapi');
console.log('Credential:  ', credential);
console.log('\n──────────────────────────────────────────────────────────────');
console.log('Add this to your .env file:');
console.log(`MPESA_SECURITY_CREDENTIAL=${credential}`);
console.log('──────────────────────────────────────────────────────────────\n');
