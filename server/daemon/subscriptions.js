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

    } catch (err) {
      console.error('[Daemon] Error during subscription cleanup:', err);
    }
  });

  console.log('👿 [Daemon] Subscription monitor started.');
};
