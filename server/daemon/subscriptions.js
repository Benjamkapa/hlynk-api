import cron from 'node-cron';
import { db } from '../dbms/mysql.js';
import { createAdminNotification } from '../controllers/notifications.js';

export const startSubscriptionDaemon = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[Daemon] Running subscription cleanup...');
    try {
      // 1. Mark expired trials
      const [expiredTrials] = await db.query(`
        SELECT t.businessName FROM subscription s
        JOIN tenant t ON s.tenantId = t.id
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
          } catch(e) {}
        }
      }

      // 2. Mark expired active subscriptions
      const [expiredSubs] = await db.query(`
        SELECT t.businessName FROM subscription s
        JOIN tenant t ON s.tenantId = t.id
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
          } catch(e) {}
        }
      }

      // 3. Notify Admin for accounts expired for 3 days without renewal
      const [unrenewed3Days] = await db.query(`
        SELECT t.id as tenantId, t.businessName, s.planName
        FROM subscription s
        JOIN tenant t ON s.tenantId = t.id
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
            console.log(`[Daemon] Sent 3-day unrenewed notification for ${tenant.businessName}`);
          }
        } catch (e) {
          console.error(`[Daemon] Error notifying admin for unrenewed tenant ${tenant.businessName}:`, e);
        }
      }

    } catch (err) {
      console.error('[Daemon] Error during subscription cleanup:', err);
    }
  });

  console.log('👿 [Daemon] Subscription monitor started.');
};
