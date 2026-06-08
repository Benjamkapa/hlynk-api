import crypto from 'crypto';
import fs from 'fs';
import https from 'https';

const certUrl = 'https://developer.safaricom.co.ke/SandboxCertificate.cer';
const certPath = './SandboxCertificate.cer';
const password = 'Safaricom999!*';

async function downloadCert() {
  return new Promise((resolve, reject) => {
    https.get(certUrl, (response) => {
      if (response.statusCode === 200) {
        let certData = '';
        response.on('data', chunk => certData += chunk);
        response.on('end', () => {
          fs.writeFileSync(certPath, certData);
          resolve(certData);
        });
      } else {
        reject(new Error(`Failed to download certificate. Status Code: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function run() {
  try {
    let cert;
    if (fs.existsSync(certPath)) {
      cert = fs.readFileSync(certPath, 'utf8');
      console.log('Using existing SandboxCertificate.cer');
    } else {
      console.log('Downloading SandboxCertificate.cer from Daraja...');
      cert = await downloadCert();
      console.log('Downloaded successfully.');
    }

    const encrypted = crypto.publicEncrypt({
      key: cert,
      padding: crypto.constants.RSA_PKCS1_PADDING
    }, Buffer.from(password));

    const credential = encrypted.toString('base64');
    
    console.log('\n--- MPESA SANDBOX CREDENTIALS ---');
    console.log('MPESA_INITIATOR="testapi"');
    console.log('MPESA_SECURITY_CREDENTIAL="' + credential + '"');
    console.log('---------------------------------\n');

  } catch (error) {
    console.error('Error:', error.message);
    console.log('\nYou might need to download the certificate manually from the Daraja portal and place it here as "SandboxCertificate.cer"');
  }
}

run();
