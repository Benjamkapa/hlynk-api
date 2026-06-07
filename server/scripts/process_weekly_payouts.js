import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

async function processWeeklyPayouts() {
  console.log('--- Starting Weekly Payout Processing ---');
  const PLATFORM_SHARE_RATE = 0.15;

  try {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // 1. Find all successful, un-payout-ed rented payments older than 7 days
      // (or all if we just want to sweep them)
      const [payments] = await connection.query(`
        SELECT p.*, t.payoutMethod, t.payoutAccount, s.trialEndDate
        FROM payment p
        JOIN tenant t ON p.tenantId = t.id
        LEFT JOIN subscription s ON s.tenantId = t.id
        WHERE p.isRented = 1 AND p.status = 0 AND p.payoutStatus = 0
        ORDER BY p.tenantId, p.createdAt ASC
      `);

      if (payments.length === 0) {
        console.log('No pending payouts found.');
        return;
      }

      // 2. Group by tenant
      const groups = {};
      for (const p of payments) {
        if (!groups[p.tenantId]) {
          groups[p.tenantId] = {
            tenantId: p.tenantId,
            payoutMethod: p.payoutMethod || 'MPESA',
            payoutAccount: p.payoutAccount || p.phone, // fallback to last used phone
            trialEndDate: p.trialEndDate ? new Date(p.trialEndDate) : null,
            items: [],
            totalGross: 0,
            totalNet: 0,
          };
        }
        
        const created = new Date(p.createdAt);
        const isTrialMatch = groups[p.tenantId].trialEndDate && created <= groups[p.tenantId].trialEndDate;
        const rate = isTrialMatch ? 0 : PLATFORM_SHARE_RATE;
        const amount = Number(p.amount);
        const net = amount * (1 - rate);

        groups[p.tenantId].items.push(p.id);
        groups[p.tenantId].totalGross += amount;
        groups[p.tenantId].totalNet += net;
      }

      // 3. Create Payout Records
      for (const tenantId in groups) {
        const g = groups[tenantId];
        if (g.totalNet <= 0) continue;

        const payoutId = ulid();
        console.log(`Processing payout for ${tenantId}: Gross ${g.totalGross}, Net ${g.totalNet}`);

        // Create Payout Record
        await connection.query(`
          INSERT INTO payout (id, tenantId, amount, status, type, message, createdAt)
          VALUES (?, ?, ?, 'PENDING', 'VENDOR_PAYOUT', ?, NOW())
        `, [
          payoutId, 
          tenantId, 
          g.totalNet, 
          `Weekly payout for rented paybill. Gross: ${g.totalGross}, Share: ${PLATFORM_SHARE_RATE*100}%`
        ]);

        // Update Payment status
        await connection.query(`
          UPDATE payment 
          SET payoutStatus = 1, updatedAt = NOW() 
          WHERE id IN (?)
        `, [g.items]);

        // Create notification for tenant
        await connection.query(`
          INSERT INTO notification (id, tenantId, title, message, type, status, createdAt)
          VALUES (?, ?, 'Payout Processed', ?, 'success', 0, NOW())
        `, [
          ulid(), 
          tenantId, 
          `Your weekly payout of KES ${g.totalNet.toLocaleString()} is being processed via ${g.payoutMethod}.`
        ]);
      }
      // 4. Notify Superadmins of aggregate dues
      const totalDue = Object.values(groups).reduce((acc, g) => acc + g.totalNet, 0);
      if (totalDue > 0) {
        const [admins] = await connection.query(`SELECT tenantId FROM user WHERE role = 'SUPER_ADMIN'`);
        for (const admin of admins) {
          await connection.query(`
            INSERT INTO notification (id, tenantId, title, message, type, status, createdAt)
            VALUES (?, ?, 'Weekly Payouts Ready', ?, 'SYSTEM', 0, NOW())
          `, [
            ulid(), 
            admin.tenantId, 
            `A total of KES ${totalDue.toLocaleString()} is due for disbursement across ${Object.keys(groups).length} vendors.`
          ]);
        }
      }

      await connection.commit();
      console.log('✅ Weekly payouts processed successfully.');
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('❌ Payout processing failed:', err.message);
  } finally {
    process.exit(0);
  }
}

processWeeklyPayouts();
