import crypto from 'crypto';
import fs from 'fs';

function generateVAPIDKeys() {
    const curve = crypto.createECDH('prime256v1');
    curve.generateKeys();
    const publicKey = curve.getPublicKey();
    const privateKey = curve.getPrivateKey();
    return {
        publicKey: publicKey.toString('base64url'),
        privateKey: privateKey.toString('base64url')
    };
}

const keys = generateVAPIDKeys();
const envPath = '.env';
let envContent = fs.readFileSync(envPath, 'utf8');

if (!envContent.includes('VAPID_PUBLIC_KEY')) {
    envContent += `\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\n`;
    fs.writeFileSync(envPath, envContent);
    console.log('Keys added to .env');
} else {
    console.log('Keys already exist in .env');
}
