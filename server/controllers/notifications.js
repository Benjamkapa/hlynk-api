import { db } from '../dbms/mysql.js';
import webPush from 'web-push';
import { ulid } from 'ulid';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

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
                [userId, tenantId || null, subscription.keys.p256dh, subscription.keys.auth, subscription.endpoint]
            );
        } else {
            // Insert new subscription
            await db.query(
                'INSERT INTO push_subscriptions (id, userId, tenantId, endpoint, p256dh, auth) VALUES (?, ?, ?, ?, ?, ?)',
                [ulid(), userId, tenantId || null, subscription.endpoint, subscription.keys.p256dh, subscription.keys.auth]
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
        
        const dataObj = Object.keys(message.data || {}).length > 0 ? message.data : { url: '/dashboard' };

        const payload = JSON.stringify({
            title: message.title || 'hlynk Alert',
            body: message.body,
            icon: message.icon || '/logo.png',
            type: message.type || 'info',
            data: dataObj
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
                console.error(`sendPushToTenant worker error for ${sub.endpoint}:`, err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                }
            }
        }));
    } catch (error) {
        console.error('sendPushToTenant Error:', error);
    }
};

// Utility to send push to all Super Admins
export const sendPushToAdmins = async (message) => {
    try {
        // Find subscriptions belonging to users with SUPER_ADMIN role
        const [subs] = await db.query(`
            SELECT ps.* 
            FROM push_subscriptions ps
            JOIN user u ON ps.userId = u.id
            WHERE u.role = 'SUPER_ADMIN'
        `);
        
        if (subs.length === 0) return;

        const dataObj = Object.keys(message.data || {}).length > 0 ? message.data : { url: '/admin/dashboard' };

        const payload = JSON.stringify({
            title: message.title || 'hlynk System Alert',
            body: message.body,
            icon: message.icon || '/logo.png',
            type: message.type || 'info',
            data: dataObj
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
                console.error(`sendPushToAdmins worker error for ${sub.endpoint}:`, err);
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await db.query('DELETE FROM push_subscriptions WHERE id = ?', [sub.id]);
                }
            }
        }));
    } catch (error) {
        console.error('sendPushToAdmins Error:', error);
    }
};

/**
 * Utility to create a notification (DB + Push) for a specific tenant
 */
export const createNotification = async ({ tenantId, title, message, type = 'info', data = {} }) => {
  try {
    // 1. Insert into database (for in-app bell)
    await db.query(`
      INSERT INTO notification (id, tenantId, title, message, type, status, createdAt) 
      VALUES (?, ?, ?, ?, ?, 0, NOW())
    `, [ulid(), tenantId, title, message, type]);

    // 2. Send push notification (for OS-level tray)
    await sendPushToTenant(tenantId, { title, body: message, type, data });
    
    return true;
  } catch (err) {
    console.error('createNotification Error:', err);
    return false;
  }
};

/**
 * Utility to notify ALL Super Admins (DB + Push)
 */
export const createAdminNotification = async ({ title, message, type = 'system', data = {} }) => {
  try {
    // 1. Get all admin IDs
    const [admins] = await db.query("SELECT id, tenantId FROM user WHERE role = 'SUPER_ADMIN'");
    
    if (admins.length === 0) return false;

    // 2. Insert DB notifications for each admin
    await Promise.all(admins.map(admin => 
      db.query(`
        INSERT INTO notification (id, tenantId, title, message, type, status, createdAt) 
        VALUES (?, ?, ?, ?, ?, 0, NOW())
      `, [ulid(), admin.tenantId, title, message, type])
    ));

    // 3. Send OS-level push notifications to all admins
    await sendPushToAdmins({ title, body: message, type, data });

    return true;
  } catch (err) {
    console.error('createAdminNotification Error:', err);
    return false;
  }
};

/**
 * Super Admin Broadcast Controller
 */
export const broadcastNotification = async (req, res) => {
    try {
        const { target, emails, title, message, type = 'info' } = req.body;
        
        // Safety check
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'Only Super Admins can broadcast notifications' });
        }

        if (!title || !message) {
            return res.status(400).json({ success: false, message: 'Title and message are required' });
        }

        let targetTenants = [];

        if (target === 'all') {
            const [tenants] = await db.query('SELECT id FROM tenant');
            targetTenants = tenants.map(t => t.id);
        } else if (target === 'specific') {
            // Support both array and comma-separated string
            const emailList = Array.isArray(emails) 
                ? emails 
                : emails.split(',').map(e => e.trim()).filter(e => e.includes('@'));

            if (emailList.length === 0) {
                return res.status(400).json({ success: false, message: 'Invalid or empty email list' });
            }

            const [users] = await db.query('SELECT DISTINCT tenantId FROM user WHERE email IN (?)', [emailList]);
            targetTenants = users.map(u => u.tenantId).filter(id => id !== null);
        }

        if (targetTenants.length === 0) {
            return res.status(404).json({ success: false, message: 'No matching users found' });
        }

        // Send to all targets (createNotification handles both DB and Push)
        await Promise.all(targetTenants.map(tenantId => 
            createNotification({ tenantId, title, message, type })
        ));

        res.status(200).json({ 
            success: true, 
            message: `Successfully sent to ${targetTenants.length} vendors`,
            count: targetTenants.length
        });
    } catch (error) {
        console.error('Broadcast Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error during broadcast' });
    }
};

/**
 * Super Admin User Search (for suggestions)
 */
export const searchUsers = async (req, res) => {
    try {
        if (req.user.role !== 'SUPER_ADMIN') {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }

        const { query = '' } = req.query;
        
        // Find users matching email or name, limited to 50 for performance
        const [users] = await db.query(`
            SELECT id, name, email, role 
            FROM user 
            WHERE email LIKE ? OR name LIKE ?
            LIMIT 50
        `, [`%${query}%`, `%${query}%`]);

        res.status(200).json({ 
            success: true, 
            items: users 
        });
    } catch (error) {
        console.error('Search Users Error:', error);
        res.status(500).json({ success: false, message: 'Failed to search users' });
    }
};
