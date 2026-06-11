import webPush from 'web-push';
import fs from 'fs';
const vapidKeys = webPush.generateVAPIDKeys();
fs.writeFileSync('vapid_keys.json', JSON.stringify(vapidKeys, null, 2));
console.log('Keys written to vapid_keys.json');
