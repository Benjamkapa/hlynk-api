import crypto from 'crypto';

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
console.log('VAPID_PUBLIC_KEY=' + keys.publicKey);
console.log('VAPID_PRIVATE_KEY=' + keys.privateKey);
