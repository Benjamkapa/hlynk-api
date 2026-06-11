// Run this with: node gen_vapid.mjs
import webPush from 'web-push';
import { writeFileSync } from 'fs';

const keys = webPush.generateVAPIDKeys();

const webEnvLine = `VAPID_PUBLIC_KEY=${keys.publicKey}`;
const apiEnvLines = `VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}`;

writeFileSync('vapid_output.txt', 
`=== VAPID KEYS GENERATED ===
Public Key (for web/.env):
${webEnvLine}

For api/server/.env, add:
VAPID_PUBLIC_KEY=${keys.publicKey}
VAPID_PRIVATE_KEY=${keys.privateKey}
`);

console.error('Keys written to vapid_output.txt');
