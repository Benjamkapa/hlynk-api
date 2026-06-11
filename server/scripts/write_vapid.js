import webPush from 'web-push';
import fs from 'fs';
const vapidKeys = webPush.generateVAPIDKeys();
fs.writeFileSync('vapid_keys.txt', `Public Key: ${vapidKeys.publicKey}\nPrivate Key: ${vapidKeys.privateKey}`);
