import { db } from '../dbms/mysql.js';
import 'dotenv/config';

/**
 * Grant Special Access Script
 * ==========================
 * Usage: node scripts/grant_special_access.js <phone_or_business_name> <days>
 * 
 * Sets the provider's subscription status to 'Trial' (2) for a specified 
 * number of days, granting them full system access while keeping their 
 * current plan name intact.
 */

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('❌ Usage: node scripts/grant_special_access.js <phone_or_business_name> <days>');
        process.exit(1);
    }

    const identifier = args[0];
    const days = parseInt(args[1]);

    if (isNaN(days)) {
        console.log('❌ Error: Days must be a number.');
        process.exit(1);
    }

    try {
        // 1. Find the provider
        const [rows] = await db.query(`
            SELECT t.id, t.businessName, p.phone, u.email
            FROM tenant t
            JOIN provider p ON t.id = p.tenantId
            JOIN user u ON t.id = u.tenantId AND u.role = 'PROVIDER'
            WHERE p.phone = ? OR t.businessName LIKE ? OR u.email = ?
            LIMIT 1
        `, [identifier, `%${identifier}%`, identifier]);

        if (rows.length === 0) {
            console.log(`❌ No provider found for: ${identifier}`);
            process.exit(1);
        }

        const tenant = rows[0];
        console.log(`🔍 Found: ${tenant.businessName} (${tenant.phone})`);

        // 2. Grant access
        await db.query(`
            UPDATE subscription 
            SET status = 2, 
                trialEndDate = DATE_ADD(NOW(), INTERVAL ? DAY),
                updatedAt = NOW()
            WHERE tenantId = ?
        `, [days, tenant.id]);

        console.log(`✅ Success! ${tenant.businessName} now has FULL ACCESS for the next ${days} days.`);
        console.log(`📜 Status set to 'TRIAL' (2). Original plan name remains preserved.`);

    } catch (error) {
        console.error('❌ Database Error:', error.message);
    } finally {
        process.exit(0);
    }
}

main();
