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

    // 1. Daily Sales & Transactions
    const [[dailyRes]] = await db.query(`
      SELECT IFNULL(SUM(totalAmount), 0) as sales, COUNT(*) as transactions
      FROM sale
      WHERE tenantId = ? AND status = 0 AND createdAt >= CURDATE()
    `, [tenantId]);

    // 2. New Customers Today
    const [[customerRes]] = await db.query(`
      SELECT COUNT(*) as total FROM user WHERE tenantId = ? AND role = 'CUSTOMER' AND createdAt >= CURDATE()
    `, [tenantId]);

    // 3. Out of Stock Count (based on threshold)
    const [[provider]] = await db.query(`SELECT operationalSettings FROM provider WHERE tenantId = ?`, [tenantId]);
    const ops = typeof provider?.operationalSettings === 'string' ? JSON.parse(provider.operationalSettings) : provider?.operationalSettings;
    const threshold = ops?.lowStockThreshold || 5;

    const [[stockRes]] = await db.query(`
      SELECT COUNT(*) as total FROM product WHERE tenantId = ? AND stockLevel <= ? AND IFNULL(type, 'GOOD') != 'SERVICE'
    `, [tenantId, threshold]);

    // 4. Daily Profit (Revenue - Buying Price)
    let profit = 0;
    try {
      const [[profitRes]] = await db.query(`
        SELECT IFNULL(SUM((si.price - IFNULL(si.buyingPrice, 0)) * si.quantity), 0) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        WHERE s.tenantId = ? AND s.status = 0 AND s.createdAt >= CURDATE()
      `, [tenantId]);
      profit = Number(profitRes?.profit || 0);
    } catch (err) {
      console.warn('[STATS] buyingPrice missing in saleitem query, join fallback');
      const [[joinProfitRes]] = await db.query(`
        SELECT IFNULL(SUM((si.price - IFNULL(p.buyingPrice, 0)) * si.quantity), 0) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        LEFT JOIN product p ON si.productId = p.id
        WHERE s.tenantId = ? AND s.status = 0 AND s.createdAt >= CURDATE()
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

    // 6. Sales Chart (Last 7 Days)
    let chartRows = [];
    try {
      [chartRows] = await db.query(`
        SELECT DATE(s.createdAt) as date, SUM(s.totalAmount) as sales, SUM((si.price - IFNULL(si.buyingPrice, 0)) * si.quantity) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        WHERE s.tenantId = ? AND s.status = 0 AND s.createdAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(s.createdAt)
        ORDER BY date ASC
      `, [tenantId]);
    } catch (err) {
      console.warn('[STATS] chartRows query failed, join fallback');
      [chartRows] = await db.query(`
        SELECT DATE(s.createdAt) as date, SUM(s.totalAmount) as sales, SUM((si.price - IFNULL(p.buyingPrice, 0)) * si.quantity) as profit
        FROM sale s
        JOIN saleitem si ON s.id = si.saleId
        LEFT JOIN product p ON si.productId = p.id
        WHERE s.tenantId = ? AND s.status = 0 AND s.createdAt >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
        GROUP BY DATE(s.createdAt)
        ORDER BY date ASC
      `, [tenantId]);
    }

    const salesChart = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      const row = chartRows.find(r => {
          const rDate = new Date(r.date);
          return rDate.toISOString().split('T')[0] === dateStr;
      });
      return {
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
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

    return res.json({
      success: true,
      dailySales: Number(dailyRes?.sales || 0),
      dailyTransactions: Number(dailyRes?.transactions || 0),
      profit: profit, // Frontend expects 'profit' for daily profit
      cumulativeProfit: cumulativeProfit,
      newCustomers: Number(customerRes?.total || 0), // Frontend expects 'newCustomers'
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
