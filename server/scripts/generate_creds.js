import crypto from 'crypto';
import fs from 'fs';

// 1. Path to your certificate (.cer)
const certPath = './sandbox_cert.cer'; 
// 2. Your Initiator Password
const password = 'Safaricom157!'; 

try {
    const cert = fs.readFileSync(certPath, 'utf8');
    const buffer = Buffer.from(password);
    const encrypted = crypto.publicEncrypt({
        key: cert,
        padding: crypto.constants.RSA_PKCS1_PADDING
    }, buffer);

    console.log('\n--- YOUR SECURITY CREDENTIAL ---');
    console.log(encrypted.toString('base64'));
    console.log('-------------------------------\n');
} catch (err) {
    console.error('Error:', err.message);
}
