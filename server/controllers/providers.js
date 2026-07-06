import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';
import { uploadFile } from '../utils/storage.js';

/**
 * Get the current provider's profile and shop settings
 */
export const getMyProfile = async (req, res) => {
  const { userId, tenantId } = req.user;
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id as userId, u.name, u.phone, u.email, u.role, u.photoUrl,
        p.id as providerId, p.businessName, p.category, p.location,
        p.notificationSettings, p.operationalSettings
      FROM user u
      JOIN provider p ON u.tenantId = p.tenantId
      WHERE u.id = ? AND u.tenantId = ?
    `, [userId, tenantId]);

    if (!rows.length) return res.status(404).json({ success: false, message: 'Profile not found' });

    const p = rows[0];
    return res.json({
      success: true,
      data: {
        user: { id: p.userId, name: p.name, email: p.email, role: p.role, photoUrl: p.photoUrl },
        phone: p.phone,
        businessName: p.businessName,
        category: p.category,
        location: p.location,
        notificationSettings: typeof p.notificationSettings === 'string' ? JSON.parse(p.notificationSettings) : p.notificationSettings,
        operationalSettings: typeof p.operationalSettings === 'string' ? JSON.parse(p.operationalSettings) : p.operationalSettings
      }
    });
  } catch (err) {
    console.error('[PROFILE] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

/**
 * Update personal and business settings
 */
export const updateProfile = async (req, res) => {
  const { tenantId, userId } = req.user;
  const { name, phone, businessName, category, location, notificationSettings, operationalSettings } = req.body;

  try {
    // 1. Update User Record — only if user fields were actually sent
    const hasUserFields = name !== undefined || phone !== undefined;
    if (hasUserFields) {
      if (!name) {
        return res.status(400).json({ success: false, message: 'Name is required' });
      }
      await db.query(`
        UPDATE user SET name = ?, phone = ?, updatedAt = NOW() WHERE id = ?
      `, [name, phone || null, userId]);
    }

    // 2. Update Provider Details — only if provider fields were actually sent
    const hasProviderFields = businessName !== undefined || category !== undefined ||
      location !== undefined || notificationSettings !== undefined || operationalSettings !== undefined;

    if (hasProviderFields) {
      // Build a dynamic update to avoid overwriting fields that weren't sent
      const sets = [];
      const vals = [];

      if (businessName !== undefined) { sets.push('businessName = ?'); vals.push(businessName); }
      if (category !== undefined)     { sets.push('category = ?');     vals.push(category); }
      if (location !== undefined)     { sets.push('location = ?');     vals.push(location); }
      if (notificationSettings !== undefined) {
        sets.push('notificationSettings = ?');
        vals.push(JSON.stringify(notificationSettings || {}));
      }
      if (operationalSettings !== undefined) {
        sets.push('operationalSettings = ?');
        vals.push(JSON.stringify(operationalSettings || {}));
      }

      if (sets.length > 0) {
        sets.push('updatedAt = NOW()');
        vals.push(tenantId);
        await db.query(`UPDATE provider SET ${sets.join(', ')} WHERE tenantId = ?`, vals);
      }
    }

    return res.json({ success: true, message: 'Settings saved successfully' });
  } catch (err) {
    console.error('[SETTINGS] Update Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save settings' });
  }
};

/**
 * Main dashboard statistics for the provider
 */
export const getStats = async (req, res) => {
  const { tenantId } = req.user;
  
  try {

    // 1. Daily Sales & Transactions (using EAT timezone so "today" is Kenya time)
    const [[dailyRes]] = await db.query(`
      SELECT IFNULL(SUM(totalAmount), 0) as sales, COUNT(*) as transactions
      FROM sale
      WHERE tenantId = ? AND status = 0
        AND DATE(CONVERT_TZ(createdAt, '+00:00', '+03:00')) = CURDATE()
    `, [tenantId]);

    // 2. New Customers Today (EAT-aware)
    const [[customerRes]] = await db.query(`
      SELECT COUNT(*) as total FROM user
      WHERE tenantId = ? AND role = 'CUSTOMER'
        AND DATE(CONVERT_TZ(createdAt, '+00:00', '+03:00')) = CURDATE()
    `, [tenantId]);

    // 3. Out of Stock Count (based on threshold)
    const [[provider]] = await db.query(`SELECT operationalSettings FROM provider WHERE tenantId = ?`, [tenantId]);
    const ops = typeof provider?.operationalSettings === 'string' ? JSON.parse(provider.operationalSettings) : provider?.operationalSettings;
    const threshold = ops?.lowStockThreshold || 5;

    const [[stockRes]] = await db.query(`
      SELECT COUNT(*) as total FROM product WHERE tenantId = ? AND stockLevel <= ? AND IFNULL(type, 'GOOD') != 'SERVICE'
    `, [tenantId, threshold]);

    // 4. Daily Profit (Revenue - Buying Price, EAT-aware)
    let profit = 0;
    try {
      const [[profitRes]] = await db.query(`
        SELECT IFNULL(SUM((si.price - IFNULL(si.buyingPrice, 0)) * si.quantity), 0) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        WHERE s.tenantId = ? AND s.status = 0
          AND DATE(CONVERT_TZ(s.createdAt, '+00:00', '+03:00')) = CURDATE()
      `, [tenantId]);
      profit = Number(profitRes?.profit || 0);
    } catch (err) {
      console.warn('[STATS] buyingPrice missing in saleitem query, join fallback');
      const [[joinProfitRes]] = await db.query(`
        SELECT IFNULL(SUM((si.price - IFNULL(p.buyingPrice, 0)) * si.quantity), 0) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        LEFT JOIN product p ON si.productId = p.id
        WHERE s.tenantId = ? AND s.status = 0
          AND DATE(CONVERT_TZ(s.createdAt, '+00:00', '+03:00')) = CURDATE()
      `, [tenantId]);
      profit = Number(joinProfitRes?.profit || 0);
    }

    // 5. Cumulative Profit (All-time)
    let cumulativeProfit = 0;
    try {
      const [[cumulativeProfitRes]] = await db.query(`
        SELECT IFNULL(SUM((si.price - IFNULL(si.buyingPrice, 0)) * si.quantity), 0) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        WHERE s.tenantId = ? AND s.status = 0
      `, [tenantId]);
      cumulativeProfit = Number(cumulativeProfitRes?.profit || 0);
    } catch (err) {
      console.warn('[STATS] cumulativeProfit column missing, join fallback');
      const [[joinProfitRes]] = await db.query(`
        SELECT IFNULL(SUM((si.price - IFNULL(p.buyingPrice, 0)) * si.quantity), 0) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        LEFT JOIN product p ON si.productId = p.id
        WHERE s.tenantId = ? AND s.status = 0
      `, [tenantId]);
      cumulativeProfit = Number(joinProfitRes?.profit || 0);
    }

    // 5b. MTD Gross Profit (this calendar month, EAT-aware)
    let mtdProfit = 0;
    try {
      const [[mtdProfitRes]] = await db.query(`
        SELECT IFNULL(SUM((si.price - IFNULL(si.buyingPrice, 0)) * si.quantity), 0) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        WHERE s.tenantId = ? AND s.status = 0
          AND DATE(CONVERT_TZ(s.createdAt, '+00:00', '+03:00')) >= DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+03:00'), '%Y-%m-01')
      `, [tenantId]);
      mtdProfit = Number(mtdProfitRes?.profit || 0);
    } catch (err) {
      console.warn('[STATS] mtdProfit query failed, join fallback');
      const [[joinRes]] = await db.query(`
        SELECT IFNULL(SUM((si.price - IFNULL(p.buyingPrice, 0)) * si.quantity), 0) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        LEFT JOIN product p ON si.productId = p.id
        WHERE s.tenantId = ? AND s.status = 0
          AND DATE(CONVERT_TZ(s.createdAt, '+00:00', '+03:00')) >= DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+03:00'), '%Y-%m-01')
      `, [tenantId]);
      mtdProfit = Number(joinRes?.profit || 0);
    }

    // 6. Sales Chart (Last 7 Days) — grouped and returned as plain 'YYYY-MM-DD' strings
    //    Using DATE_FORMAT instead of DATE() prevents mysql2 from creating JS Date objects
    //    which shift dates by the server's local timezone offset (e.g. EAT midnight → UTC-1day).
    let chartRows = [];
    try {
      [chartRows] = await db.query(`
        SELECT
          DATE_FORMAT(CONVERT_TZ(s.createdAt, '+00:00', '+03:00'), '%Y-%m-%d') as date,
          SUM(s.totalAmount) as sales,
          SUM((si.price - IFNULL(si.buyingPrice, 0)) * si.quantity) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        WHERE s.tenantId = ? AND s.status = 0
          AND DATE(CONVERT_TZ(s.createdAt, '+00:00', '+03:00')) >= CURDATE() - INTERVAL 6 DAY
        GROUP BY DATE_FORMAT(CONVERT_TZ(s.createdAt, '+00:00', '+03:00'), '%Y-%m-%d')
        ORDER BY date ASC
      `, [tenantId]);
    } catch (err) {
      console.warn('[STATS] chartRows query failed, join fallback');
      [chartRows] = await db.query(`
        SELECT
          DATE_FORMAT(CONVERT_TZ(s.createdAt, '+00:00', '+03:00'), '%Y-%m-%d') as date,
          SUM(s.totalAmount) as sales,
          SUM((si.price - IFNULL(p.buyingPrice, 0)) * si.quantity) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        LEFT JOIN product p ON si.productId = p.id
        WHERE s.tenantId = ? AND s.status = 0
          AND DATE(CONVERT_TZ(s.createdAt, '+00:00', '+03:00')) >= CURDATE() - INTERVAL 6 DAY
        GROUP BY DATE_FORMAT(CONVERT_TZ(s.createdAt, '+00:00', '+03:00'), '%Y-%m-%d')
        ORDER BY date ASC
      `, [tenantId]);
    }

    // Build the 7-day skeleton in EAT.
    // DB rows now have date as plain 'YYYY-MM-DD' string (not a Date object),
    // so comparison is a safe exact string match with no timezone shifting.
    const eatNow = new Date(Date.now() + 3 * 60 * 60 * 1000); // shift to EAT
    const salesChart = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(eatNow);
      d.setUTCDate(d.getUTCDate() - (6 - i));
      // dateStr as EAT 'YYYY-MM-DD' — ties to UTC representation of the EAT-shifted Date
      const dateStr = d.toISOString().split('T')[0];
      // r.date is always a plain string like '2026-07-06' thanks to DATE_FORMAT in SQL
      const row = chartRows.find(r => String(r.date) === dateStr);
      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }),
        sales: Number(row?.sales || 0),
        profit: Number(row?.profit || 0)
      };
    });

    // 7. Profit By Source (DYANMIC FIX)
    // We retrieve the configured sources and cross-reference with actual sales
    const configuredSources = ops?.saleSources || ['In-Store', 'Walk-in'];
    let sourceRows = [];
    try {
      [sourceRows] = await db.query(`
        SELECT IFNULL(s.source, 'In-Store') as name, SUM(s.totalAmount) as sales, SUM((si.price - IFNULL(si.buyingPrice, 0)) * si.quantity) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        WHERE s.tenantId = ? AND s.status = 0
        GROUP BY IFNULL(s.source, 'In-Store')
      `, [tenantId]);
    } catch (err) {
      console.warn('[STATS] sourceRows query failed, join fallback');
      [sourceRows] = await db.query(`
        SELECT IFNULL(s.source, 'In-Store') as name, SUM(s.totalAmount) as sales, SUM((si.price - IFNULL(p.buyingPrice, 0)) * si.quantity) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        LEFT JOIN product p ON si.productId = p.id
        WHERE s.tenantId = ? AND s.status = 0
        GROUP BY IFNULL(s.source, 'In-Store')
      `, [tenantId]);
    }

    const profitBySource = configuredSources.map(sourceName => {
      const row = sourceRows.find(r => r.name.toLowerCase() === sourceName.toLowerCase());
      return {
        name: sourceName,
        sales: Number(row?.sales || 0),
        profit: Number(row?.profit || 0)
      };
    });

    // Also include any sources that were used in sales but aren't in the official "configured" list
    sourceRows.forEach(row => {
      const isAlreadyIn = profitBySource.some(p => p.name.toLowerCase() === row.name.toLowerCase());
      if (!isAlreadyIn) {
        profitBySource.push({
          name: row.name,
          sales: Number(row.sales || 0),
          profit: Number(row.profit || 0)
        });
      }
    });

    // 8. MTD Expenses (for net profit calculation)
    const [[mtdExpenseRes]] = await db.query(`
      SELECT IFNULL(SUM(amount), 0) as total
      FROM expense
      WHERE tenantId = ? AND CONVERT_TZ(date, '+00:00', '+03:00') >= DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+03:00'), '%Y-%m-01')
    `, [tenantId]);
    const mtdExpenses = Number(mtdExpenseRes?.total || 0);

    return res.json({
      success: true,
      dailySales: Number(dailyRes?.sales || 0),
      dailyTransactions: Number(dailyRes?.transactions || 0),
      profit: profit,               // daily gross margin (today)
      cumulativeProfit: cumulativeProfit, // all-time gross margin
      mtdProfit,                    // month-to-date gross margin (EAT)
      mtdExpenses,                  // month-to-date expenses
      mtdNetProfit: mtdProfit - Number(mtdExpenseRes?.total || 0), // convenience: gross − expenses
      newCustomers: Number(customerRes?.total || 0),
      outOfStockCount: Number(stockRes?.total || 0),
      salesChart,
      profitBySource: profitBySource,
      updatedAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[STATS] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate statistics' });
  }
};

/**
 * Fetch activity logs for the current tenant
 */
export const getActivityLogs = async (req, res) => {
    const { tenantId } = req.user;
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    try {
        const [logs] = await db.query(`
            SELECT * FROM activitylog WHERE tenantId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?
        `, [tenantId, Number(limit), offset]);
        const [[countRes]] = await db.query(`SELECT COUNT(*) as total FROM activitylog WHERE tenantId = ?`, [tenantId]);
        
        return res.json({ 
            success: true, 
            data: logs, 
            pagination: { total: countRes.total, page: Number(page), limit: Number(limit) } 
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Failed to fetch logs' });
    }
};

/**
 * Hard reset for workshop data (Deletes sales, stock, expenses)
 */
export const clearData = async (req, res) => {
    const { tenantId } = req.user;
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        // 1. Delete Items
        await connection.query(`DELETE FROM saleitem WHERE saleId IN (SELECT id FROM sale WHERE tenantId = ?)`, [tenantId]);
        // 2. Delete Sales
        await connection.query(`DELETE FROM sale WHERE tenantId = ?`, [tenantId]);
        // 3. Delete Products
        await connection.query(`DELETE FROM product WHERE tenantId = ?`, [tenantId]);
        // 4. Delete Expenses
        await connection.query(`DELETE FROM expense WHERE tenantId = ?`, [tenantId]);
        // 5. Delete Customers (User with role CUSTOMER)
        await connection.query(`DELETE FROM user WHERE tenantId = ? AND role = 'CUSTOMER'`, [tenantId]);
        // 6. Delete Logs
        await connection.query(`DELETE FROM activitylog WHERE tenantId = ?`, [tenantId]);
        
        await connection.commit();
        return res.json({ success: true, message: 'Business data cleared successfully' });
    } catch (err) {
        await connection.rollback();
        return res.status(500).json({ success: false, message: 'Failed to clear data' });
    } finally {
        connection.release();
    }
};

/**
 * Upload profile photo to storage
 */
export const uploadPhoto = async (req, res) => {
    const { userId } = req.user;
    if (!req.files || !req.files.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    try {
        const url = await uploadFile(req.files.file, 'avatars');
        await db.query(`UPDATE user SET photoUrl = ?, updatedAt = NOW() WHERE id = ?`, [url, userId]);
        return res.json({ success: true, data: { url } });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Upload failed' });
    }
};
