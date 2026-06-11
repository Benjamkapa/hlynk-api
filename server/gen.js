import crypto from 'crypto';
import fs from 'fs';
const curve = crypto.createECDH('prime256v1');
curve.generateKeys();
const keys = {
    publicKey: curve.getPublicKey().toString('base64url'),
    privateKey: curve.getPrivateKey().toString('base64url')
};
fs.writeFileSync('keys.txt', JSON.stringify(keys));
