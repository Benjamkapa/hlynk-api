import cron from 'node-cron';
import { db } from '../dbms/mysql.js';
import { createAdminNotification, createNotification } from '../controllers/notifications.js';
import {
  sendSubscriptionReminderEmail,
  sendSubscriptionExpiredEmail,
  sendInactivityReminderEmail,
} from '../utils/email.js';

export const startSubscriptionDaemon = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[Daemon] Running subscription & inactivity checks...');
    try {
      // 1. Mark expired trials and email owners
      const [expiredTrials] = await db.query(`
        SELECT t.id as tenantId, t.businessName, s.planName, u.email, u.name
        FROM subscription s
        JOIN tenant t ON s.tenantId = t.id
        LEFT JOIN user u ON u.tenantId = t.id AND u.role = 'PROVIDER'
        WHERE s.status = 2 AND s.trialEndDate < NOW()
      `);

      const [trials] = await db.query(`
        UPDATE subscription 
        SET status = 1, updatedAt = NOW()
        WHERE status = 2 AND trialEndDate < NOW()
      `);
      if (trials.affectedRows > 0) {
        console.log(`[Daemon] Expired ${trials.affectedRows} trial subscriptions.`);
        for (const tenant of expiredTrials) {
          try {
            await createAdminNotification({
              title: 'Trial Expired',
              message: `${tenant.businessName}'s free trial has ended. Follow up and help them upgrade.`,
              type: 'warning'
            });
            if (tenant.email) {
              await sendSubscriptionExpiredEmail({
                email: tenant.email,
                name: tenant.name,
                businessName: tenant.businessName,
                daysExpired: 0,
                planName: tenant.planName || 'Free Trial'
              });
            }
          } catch (e) {}
        }
      }

      // 2. Mark expired active subscriptions and email owners
      const [expiredSubs] = await db.query(`
        SELECT t.id as tenantId, t.businessName, s.planName, u.email, u.name
        FROM subscription s
        JOIN tenant t ON s.tenantId = t.id
        LEFT JOIN user u ON u.tenantId = t.id AND u.role = 'PROVIDER'
        WHERE s.status = 0 AND s.endDate < NOW()
      `);

      const [active] = await db.query(`
        UPDATE subscription 
        SET status = 1, updatedAt = NOW()
        WHERE status = 0 AND endDate < NOW()
      `);

      if (active.affectedRows > 0) {
        console.log(`[Daemon] Expired ${active.affectedRows} active subscriptions.`);
        for (const tenant of expiredSubs) {
          try {
            await createAdminNotification({
              title: 'Subscription Expired',
              message: `${tenant.businessName}'s paid subscription has expired.`,
              type: 'warning'
            });
            if (tenant.email) {
              await sendSubscriptionExpiredEmail({
                email: tenant.email,
                name: tenant.name,
                businessName: tenant.businessName,
                daysExpired: 0,
                planName: tenant.planName || 'Business Pro'
              });
            }
          } catch (e) {}
        }
      }

      // 3. 3-day pre-expiry reminder to owners (trial or paid ending in 3 days)
      const [expiringIn3Days] = await db.query(`
        SELECT t.id as tenantId, t.businessName, s.planName,
               COALESCE(s.endDate, s.trialEndDate) as expiryDate,
               u.email, u.name
        FROM subscription s
        JOIN tenant t ON s.tenantId = t.id
        JOIN user u ON u.tenantId = t.id AND u.role = 'PROVIDER'
        WHERE s.status IN (0, 2)
          AND DATE(COALESCE(s.endDate, s.trialEndDate)) = CURDATE() + INTERVAL 3 DAY
          AND u.email IS NOT NULL AND u.email != ''
      `);

      for (const tenant of expiringIn3Days) {
        try {
          const [alreadySent] = await db.query(`
            SELECT id FROM notification
            WHERE tenantId = ? AND title LIKE '%Expires in 3 Days%' AND createdAt >= CURDATE() - INTERVAL 5 DAY
            LIMIT 1
          `, [tenant.tenantId]);

          if (alreadySent.length === 0) {
            await createNotification({
              tenantId: tenant.tenantId,
              title: '⏳ Subscription Expires in 3 Days',
              message: `Your ${tenant.planName || 'hlynk'} plan expires in 3 days. Renew early to keep selling without interruption.`,
              type: 'warning'
            });
            await sendSubscriptionReminderEmail({
              email: tenant.email,
              name: tenant.name,
              businessName: tenant.businessName,
              daysRemaining: 3,
              planName: tenant.planName || 'Business Pro',
              expiryDate: tenant.expiryDate
            });
          }
        } catch (e) {
          console.error(`[Daemon] Error sending 3-day pre-expiry reminder for ${tenant.businessName}:`, e);
        }
      }

      // 4. Notify Admin AND email user for accounts expired for 3 days without renewal
      const [unrenewed3Days] = await db.query(`
        SELECT t.id as tenantId, t.businessName, s.planName, u.email, u.name
        FROM subscription s
        JOIN tenant t ON s.tenantId = t.id
        LEFT JOIN user u ON u.tenantId = t.id AND u.role = 'PROVIDER'
        WHERE s.status = 1
          AND DATE(COALESCE(s.endDate, s.trialEndDate)) = CURDATE() - INTERVAL 3 DAY
      `);

      for (const tenant of unrenewed3Days) {
        try {
          const [alreadyNotified] = await db.query(`
            SELECT id FROM notification 
            WHERE relatedTenantId = ? AND title LIKE '%3-Day Unrenewed%' AND createdAt >= CURDATE() - INTERVAL 7 DAY
            LIMIT 1
          `, [tenant.tenantId]);

          if (alreadyNotified.length === 0) {
            await createAdminNotification({
              title: '⚠️ 3-Day Unrenewed Account Alert',
              message: `${tenant.businessName}'s plan expired 3 days ago and has not been renewed yet. Reach out to assist them.`,
              type: 'warning',
              relatedTenantId: tenant.tenantId,
              data: { url: '/admin/tenants' }
            });
            if (tenant.email) {
              await sendSubscriptionExpiredEmail({
                email: tenant.email,
                name: tenant.name,
                businessName: tenant.businessName,
                daysExpired: 3,
                planName: tenant.planName || 'Business Pro'
              });
            }
            console.log(`[Daemon] Sent 3-day unrenewed alert & email for ${tenant.businessName}`);
          }
        } catch (e) {
          console.error(`[Daemon] Error notifying for unrenewed tenant ${tenant.businessName}:`, e);
        }
      }

      // 5. Polite & catchy 3-day inactivity reminder for active providers with no session activity in 3+ days
      const [inactiveProviders] = await db.query(`
        SELECT u.id as userId, u.tenantId, u.name, u.email, t.businessName,
               COALESCE(MAX(ses.lastActive), u.createdAt) as lastSeen,
               TIMESTAMPDIFF(DAY, COALESCE(MAX(ses.lastActive), u.createdAt), NOW()) as daysInactive
        FROM user u
        JOIN tenant t ON u.tenantId = t.id
        LEFT JOIN session ses ON ses.userId = u.id
        WHERE u.role = 'PROVIDER'
          AND u.isActive = 1
          AND t.isActive = 1
          AND u.email IS NOT NULL AND u.email != ''
        GROUP BY u.id, u.tenantId, u.name, u.email, t.businessName, u.createdAt
        HAVING daysInactive >= 3
      `);

      for (const provider of inactiveProviders) {
        try {
          const [recentReminder] = await db.query(`
            SELECT id FROM notification
            WHERE tenantId = ? AND title LIKE '%We Miss You%' AND createdAt >= NOW() - INTERVAL 14 DAY
            LIMIT 1
          `, [provider.tenantId]);

          if (recentReminder.length === 0) {
            await createNotification({
              tenantId: provider.tenantId,
              title: '👋 We Miss You on hlynk',
              message: `It’s been ${provider.daysInactive} days since your last check-in on ${provider.businessName}. Jump back in anytime!`,
              type: 'info'
            });
            await sendInactivityReminderEmail({
              email: provider.email,
              name: provider.name,
              businessName: provider.businessName,
              daysInactive: provider.daysInactive
            });
            console.log(`[Daemon] Sent ${provider.daysInactive}-day inactivity reminder to ${provider.email}`);
          }
        } catch (e) {
          console.error(`[Daemon] Error sending inactivity reminder to ${provider.email}:`, e);
        }
      }

    } catch (err) {
      console.error('[Daemon] Error during subscription & inactivity checks:', err);
    }
  });

  // Run every 2 months on the 1st
  cron.schedule('0 0 1 */2 *', async () => {
    console.log('[Daemon] Running bi-monthly notification cleanup...');
    try {
      const [result] = await db.query(`
        DELETE FROM notification 
        WHERE createdAt < NOW() - INTERVAL 1 MONTH
      `);
      console.log(`[Daemon] Deleted ${result.affectedRows} old notifications.`);
    } catch (err) {
      console.error('[Daemon] Error cleaning up notifications:', err);
    }
  });

  console.log('👿 Subs/Notification Daemon started.');
};
