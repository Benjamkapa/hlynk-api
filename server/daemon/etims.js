import cron from 'node-cron';
import { db } from '../dbms/mysql.js';
import { pushSaleToEtims } from '../controllers/etims.js';

/**
 * eTIMS Auto-Retry Daemon
 * =======================
 * Periodically searches for invoices that are 'pending' or 'failed'
 * and attempts to re-push them to KRA.
 */
export const startEtimsDaemon = () => {
    // Run once every day at 2355HRS
    cron.schedule('55 23 * * *', async () => {
        console.log('[Daemon] 🔄 Starting scheduled eTIMS daily retry cycle (23:55)...');
        
        try {
            // Find invoices that failed or are pending, limited to 5 retries to avoid wasting resources on permanent errors
            const [pending] = await db.query(`
                SELECT provider_id, payment_id, retry_count 
                FROM etims_invoices 
                WHERE status IN ('pending', 'failed') 
                  AND retry_count < 5
                ORDER BY created_at ASC
                LIMIT 20
            `);

            if (pending.length === 0) {
                console.log('[Daemon] ✅ No pending eTIMS invoices to retry.');
                return;
            }

            console.log(`[Daemon] 📦 Found ${pending.length} invoices to retry pusing to KRA.`);

            for (const item of pending) {
                try {
                    await pushSaleToEtims(item.provider_id, item.payment_id);
                } catch (err) {
                    console.error(`[Daemon] ❌ Retry failed for Sale ${item.payment_id}:`, err.message);
                }
            }
            
            console.log('[Daemon] 🏁 eTIMS retry cycle complete.');

        } catch (err) {
            console.error('[Daemon] 🔴 Error during eTIMS auto-retry:', err.message);
        }
    });

    // console.log('👿 [Daemon] eTIMS Auto-Retry monitor started (30m interval).');
};
