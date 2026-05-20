import cron from 'node-cron';
import { db } from '../dbms/mysql.js';

export const startSubscriptionDaemon = () => {
  // Run every day at midnight
  cron.schedule('0 0 * * *', async () => {
    console.log('[Daemon] Running subscription cleanup...');
    try {
      // 1. Mark expired trials
      const [trials] = await db.query(`
        UPDATE subscription 
        SET status = 1, updatedAt = NOW()
        WHERE status = 2 AND trialEndDate < NOW()
      `);
      if (trials.affectedRows > 0) {
        console.log(`[Daemon] Expired ${trials.affectedRows} trial subscriptions.`);
      }

      // 2. Mark expired active subscriptions
      const [active] = await db.query(`
        UPDATE subscription 
        SET status = 1, updatedAt = NOW()
        WHERE status = 0 AND endDate < NOW()
      `);

      if (active.affectedRows > 0) {
        console.log(`[Daemon] Expired ${active.affectedRows} active subscriptions.`);
      }

    } catch (err) {
      console.error('[Daemon] Error during subscription cleanup:', err);
    }
  });

  console.log('👿 [Daemon] Subscription monitor started.');
};
