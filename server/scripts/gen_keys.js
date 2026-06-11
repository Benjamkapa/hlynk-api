import webPush from 'web-push';
const keys = webPush.generateVAPIDKeys();
console.log('--- VAPID KEYS ---');
console.log('Public Key:', keys.publicKey);
console.log('Private Key:', keys.privateKey);
console.log('------------------');
