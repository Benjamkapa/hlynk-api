import { db } from '../dbms/mysql.js';
import webPush from 'web-push';
import { ulid } from 'ulid';

// Initialize web-push with VAPID keys
const setupWebPush = () => {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = 'mailto:support@hlynk.co.ke'; // Should be in env or config

    if (publicKey && privateKey) {
        webPush.setVapidDetails(email, publicKey, privateKey);
    }
};

setupWebPush();

export const subscribe = async (req, res) => {
    try {
        const { subscription } = req.body;
        const userId = req.user.id;
        const tenantId = req.user.tenantId;

        // Check if subscription already exists for this endpoint
        const [existing] = await db.query('SELECT id FROM push_subscriptions WHERE endpoint = ?', [subscription.endpoint]);

        if (existing.length > 0) {
            // Update existing subscription
            await db.query(
                'UPDATE push_subscriptions SET userId = ?, tenantId = ?, p256dh = ?, auth = ?, updatedAt = NOW() WHERE endpoint = ?',
                [userId, tenantId, subscription.keys.p256dh, subscription.keys.auth, subscription.endpoint]
            );
        } else {
            // Insert new subscription
            await db.query(
                'INSERT INTO push_subscriptions (id, userId, tenantId, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?, ?)',
                [ulid(), userId, tenantId, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
            );
        }

        res.status(201).json({ success: true, message: 'Subscribed successfully' });
    } catch (error) {
        console.error('Push Subscribe Error:', error);
        res.status(500).json({ success: false, message: 'Failed to subscribe' });
    }
};

export const unsubscribe = async (req, res) => {
    try {
        const { endpoint } = req.body;
        await db.query('DELETE FROM push_subscriptions WHERE endpoint = ?', [endpoint]);
        res.status(200).json({ success: true, message: 'Unsubscribed successfully' });
    } catch (error) {
        console.error('Push Unsubscribe Error:', error);
        res.status(500).json({ success: false, message: 'Failed to unsubscribe' });
    }
};

export const sendTestNotification = async (req, res) => {
    try {
        const userId = req.user.id;
        const [subs] = await db.query('SELECT * FROM push_subscriptions WHERE userId = ?', [userId]);

        if (subs.length === 0) {
            return res.status(404).json({ success: false, message: 'No subscriptions found for this user' });
        }

        const payload = JSON.stringify({
            title: 'Test Notification',
            body: 'This is a test push notification from hlynk!',
            icon: '/logo.png',
            data: { url: '/dashboard' }
        });

        const results = await Promise.all(subs.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webPush.sendNotification(pushSubscription, payload);
                return { endpoint: sub.endpoint, success: true };
            } catch (err) {
                console.error(`Failed to send push to ${sub.endpoint}:`, err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    // Subscription expired or no longer valid
                    await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                }
                return { endpoint: sub.endpoint, success: false, error: err.message };
            }
        }));

        res.status(200).json({ success: true, results });
    } catch (error) {
        console.error('Test Push Error:', error);
        res.status(500).json({ success: false, message: 'Failed to send test notification' });
    }
};

// Utility to send push to a specific tenant
export const sendPushToTenant = async (tenantId, message) => {
    try {
        const [subs] = await db.query('SELECT * FROM push_subscriptions WHERE tenantId = ?', [tenantId]);
        
        const payload = JSON.stringify({
            title: message.title || 'hlynk Alert',
            body: message.body,
            icon: message.icon || '/logo.png',
            data: message.data || {}
        });

        await Promise.all(subs.map(async (sub) => {
            const pushSubscription = {
                endpoint: sub.endpoint,
                keys: {
                    p256dh: sub.p256dh,
                    auth: sub.auth
                }
            };

            try {
                await webPush.sendNotification(pushSubscription, payload);
            } catch (err) {
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                }
            }
        }));
    } catch (error) {
        console.error('sendPushToTenant Error:', error);
    }
};
