import { db } from '../dbms/mysql.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { uploadFile } from '../utils/storage.js';
import { ulid } from 'ulid';

const decryptOperationalSettings = (operationalSettings) => {
  if (!operationalSettings) return operationalSettings;
  const ops = typeof operationalSettings === 'string' ? JSON.parse(operationalSettings) : { ...operationalSettings };

  const decryptMpesa = (m) => {
    if (!m) return m;
    const res = { ...m };
    if (res.consumerKey) res.consumerKey = decrypt(res.consumerKey);
    if (res.consumerSecret) res.consumerSecret = decrypt(res.consumerSecret);
    if (res.passkey) res.passkey = decrypt(res.passkey);
    return res;
  };

  const decryptKcb = (k) => {
    if (!k) return k;
    const res = { ...k };
    if (res.consumerKey) res.consumerKey = decrypt(res.consumerKey);
    if (res.consumerSecret) res.consumerSecret = decrypt(res.consumerSecret);
    return res;
  };

  if (ops.mpesa) {
    if (ops.mpesa.sandbox) ops.mpesa.sandbox = decryptMpesa(ops.mpesa.sandbox);
    if (ops.mpesa.production) ops.mpesa.production = decryptMpesa(ops.mpesa.production);
    // Backward compatibility
    if (ops.mpesa.consumerKey) ops.mpesa.consumerKey = decrypt(ops.mpesa.consumerKey);
    if (ops.mpesa.consumerSecret) ops.mpesa.consumerSecret = decrypt(ops.mpesa.consumerSecret);
    if (ops.mpesa.passkey) ops.mpesa.passkey = decrypt(ops.mpesa.passkey);
  }

  if (ops.kcb) {
    if (ops.kcb.sandbox) ops.kcb.sandbox = decryptKcb(ops.kcb.sandbox);
    if (ops.kcb.production) ops.kcb.production = decryptKcb(ops.kcb.production);
  }

  if (ops.ai) {
    ops.ai = { ...ops.ai };
    if (ops.ai.apiKey) ops.ai.apiKey = decrypt(ops.ai.apiKey);
  }
  return ops;
};

const encryptOperationalSettings = (operationalSettings) => {
  if (!operationalSettings) return operationalSettings;
  const ops = typeof operationalSettings === 'string' ? JSON.parse(operationalSettings) : { ...operationalSettings };

  const encryptMpesa = (m) => {
    if (!m) return m;
    const res = { ...m };
    if (res.consumerKey && !res.consumerKey.includes(':')) res.consumerKey = encrypt(res.consumerKey);
    if (res.consumerSecret && !res.consumerSecret.includes(':')) res.consumerSecret = encrypt(res.consumerSecret);
    if (res.passkey && !res.passkey.includes(':')) res.passkey = encrypt(res.passkey);
    return res;
  };

  const encryptKcb = (k) => {
    if (!k) return k;
    const res = { ...k };
    if (res.consumerKey && !res.consumerKey.includes(':')) res.consumerKey = encrypt(res.consumerKey);
    if (res.consumerSecret && !res.consumerSecret.includes(':')) res.consumerSecret = encrypt(res.consumerSecret);
    return res;
  };

  if (ops.mpesa) {
    if (ops.mpesa.sandbox) ops.mpesa.sandbox = encryptMpesa(ops.mpesa.sandbox);
    if (ops.mpesa.production) ops.mpesa.production = encryptMpesa(ops.mpesa.production);
    // Backward compatibility
    if (ops.mpesa.consumerKey && !ops.mpesa.consumerKey.includes(':')) ops.mpesa.consumerKey = encrypt(ops.mpesa.consumerKey);
    if (ops.mpesa.consumerSecret && !ops.mpesa.consumerSecret.includes(':')) ops.mpesa.consumerSecret = encrypt(ops.mpesa.consumerSecret);
    if (ops.mpesa.passkey && !ops.mpesa.passkey.includes(':')) ops.mpesa.passkey = encrypt(ops.mpesa.passkey);
  }

  if (ops.kcb) {
    if (ops.kcb.sandbox) ops.kcb.sandbox = encryptKcb(ops.kcb.sandbox);
    if (ops.kcb.production) ops.kcb.production = encryptKcb(ops.kcb.production);
  }

  if (ops.ai) {
    ops.ai = { ...ops.ai };
    if (ops.ai.apiKey && !ops.ai.apiKey.includes(':')) ops.ai.apiKey = encrypt(ops.ai.apiKey);
  }
  return ops;
};

export const getMyProfile = async (req, res) => {
  const { userId } = req.user;
  try {
    const [profiles] = await db.query(`
      SELECT p.*, u.name as userName, u.email, u.phone as userPhone, u.role, u.photoUrl,
      t.businessName as tenantName, s.planName as subscriptionPlan, s.status as subscriptionStatus
      FROM provider p
      JOIN user u ON p.userId = u.id
      JOIN tenant t ON p.tenantId = t.id
      LEFT JOIN subscription s ON t.id = s.tenantId
      WHERE p.userId = ?
    `, [userId]);

    if (profiles.length === 0) return res.status(404).json({ success: false, message: 'Profile not found' });

    const profile = profiles[0];
    if (profile.operationalSettings) {
      profile.operationalSettings = decryptOperationalSettings(profile.operationalSettings);
    }
    
    return res.json({ success: true, data: profile });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

export const updateProfile = async (req, res) => {
  const { userId, tenantId } = req.user;
  const data = req.body;

  if (data.operationalSettings) {
    data.operationalSettings = encryptOperationalSettings(data.operationalSettings);
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // User updates
    let userUpdates = [];
    let userParams = [];
    if (data.name !== undefined) { userUpdates.push('name = ?'); userParams.push(data.name); }
    if (data.phone !== undefined) { userUpdates.push('phone = ?'); userParams.push(data.phone); }
    
    if (userUpdates.length > 0) {
      userUpdates.push('updatedAt = NOW()');
      await connection.query(`UPDATE user SET ${userUpdates.join(', ')} WHERE id = ?`, [...userParams, userId]);
    }

    // Provider updates
    let provUpdates = [];
    let provParams = [];
    if (data.businessName !== undefined) { provUpdates.push('businessName = ?'); provParams.push(data.businessName); }
    if (data.category !== undefined) { provUpdates.push('category = ?'); provParams.push(data.category); }
    if (data.description !== undefined) { provUpdates.push('description = ?'); provParams.push(data.description); }
    if (data.location !== undefined) { provUpdates.push('location = ?'); provParams.push(data.location); }
    if (data.operationalSettings !== undefined) { provUpdates.push('operationalSettings = ?'); provParams.push(JSON.stringify(data.operationalSettings)); }

    if (provUpdates.length > 0) {
      provUpdates.push('updatedAt = NOW()');
      await connection.query(`UPDATE provider SET ${provUpdates.join(', ')} WHERE userId = ?`, [...provParams, userId]);
    }

    await connection.commit();
    return res.json({ success: true, data: { message: 'Profile updated' } });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};

export const getStats = async (req, res) => {
  const { tenantId, userId, role } = req.user;
  try {
    // If user is STAFF, we only show stats related to them
    const isStaff = role === 'STAFF';
    const saleFilter = isStaff ? 'AND userId = ?' : '';
    const saleParams = isStaff ? [tenantId, userId] : [tenantId];

    const [providerRes] = await db.query(`SELECT operationalSettings FROM provider WHERE tenantId = ?`, [tenantId]);
    const ops = typeof providerRes[0]?.operationalSettings === 'string' 
      ? JSON.parse(providerRes[0].operationalSettings) 
      : providerRes[0]?.operationalSettings || {};
    const threshold = ops.lowStockThreshold || 5;

    const [
      [salesToday],
      [totalCustomers],
      [lowStock],
      [txToday]
    ] = await Promise.all([
      db.query(`SELECT SUM(totalAmount) as total FROM sale WHERE tenantId = ? ${saleFilter} AND status = 0 AND createdAt >= CURDATE()`, saleParams),
      db.query(`
        SELECT COUNT(DISTINCT u.id) as total 
        FROM user u 
        WHERE u.tenantId = ? AND u.role = 'CUSTOMER'
        ${isStaff ? 'AND EXISTS (SELECT 1 FROM sale s WHERE s.customerId = u.id AND s.userId = ?)' : ''}
      `, isStaff ? [tenantId, userId] : [tenantId]),
      db.query(`SELECT COUNT(*) as total FROM product WHERE tenantId = ? AND type != 'SERVICE' AND stockLevel <= ?`, [tenantId, threshold]),
      db.query(`SELECT COUNT(*) as total FROM sale WHERE tenantId = ? ${saleFilter} AND status = 0 AND createdAt >= CURDATE()`, saleParams)
    ]);

    // Calculate Estimated Profit (Revenue - COGS)
    const [profitRes] = await db.query(`
      SELECT 
        (SELECT SUM(totalAmount) FROM sale WHERE tenantId = ? ${saleFilter} AND status = 0 AND DATE(createdAt) = CURDATE()) 
        - IFNULL((SELECT SUM(IFNULL(si.buyingPrice, IF(IFNULL(p.type, 'GOOD') = 'SERVICE', 0, IFNULL(p.buyingPrice, 0))) * si.quantity)
          FROM sale s
          JOIN saleitem si ON s.id = si.saleId
          LEFT JOIN product p ON si.productId = p.id
          WHERE s.tenantId = ? ${saleFilter} AND s.status = 0 AND DATE(s.createdAt) = CURDATE()), 0) as dailyProfit,
          
        (SELECT SUM(totalAmount) FROM sale WHERE tenantId = ? ${saleFilter} AND status = 0) 
        - IFNULL((SELECT SUM(IFNULL(si.buyingPrice, IF(IFNULL(p.type, 'GOOD') = 'SERVICE', 0, IFNULL(p.buyingPrice, 0))) * si.quantity)
          FROM sale s
          JOIN saleitem si ON s.id = si.saleId
          LEFT JOIN product p ON si.productId = p.id
          WHERE s.tenantId = ? ${saleFilter} AND s.status = 0), 0) as cumulativeProfit
    `, [...saleParams, ...saleParams, ...saleParams, ...saleParams]);

    const [profitBySourceRes] = await db.query(`
      SELECT 
        IFNULL(s.source, 'In-Store') as name,
        SUM(s.totalAmount) as sales,
        SUM(s.totalAmount) - IFNULL(SUM(
          IFNULL(si.buyingPrice, IF(IFNULL(p.type, 'GOOD') = 'SERVICE', 0, IFNULL(p.buyingPrice, 0))) * si.quantity
        ), 0) as profit
      FROM sale s
      LEFT JOIN saleitem si ON si.saleId = s.id
      LEFT JOIN product p ON si.productId = p.id
      WHERE s.tenantId = ? ${saleFilter.replace('userId = ?', 's.userId = ?')} AND s.status = 0
      GROUP BY IFNULL(s.source, 'In-Store')
      ORDER BY profit DESC
    `, saleParams);

    // REAL aggregation for chart data (Last 7 Days)
    const [chartRows] = await db.query(`
      SELECT 
        DATE_FORMAT(s.createdAt, '%a') as name,
        COUNT(DISTINCT s.id) as nothing_just_grouping,
        (SELECT SUM(s2.totalAmount) FROM sale s2 WHERE DATE(s2.createdAt) = DATE(s.createdAt) AND s2.tenantId = ? ${saleFilter.replace('userId = ?', 's2.userId = ?')} AND s2.status = 0) as sales,
        (SELECT SUM(s2.totalAmount) FROM sale s2 WHERE DATE(s2.createdAt) = DATE(s.createdAt) AND s2.tenantId = ? ${saleFilter.replace('userId = ?', 's2.userId = ?')} AND s2.status = 0) -
        IFNULL((
          SELECT SUM(IFNULL(si.buyingPrice, IF(IFNULL(p.type, 'GOOD') = 'SERVICE', 0, IFNULL(p.buyingPrice, 0))) * si.quantity)
          FROM sale s3 
          JOIN saleitem si ON s3.id = si.saleId 
          LEFT JOIN product p ON si.productId = p.id
          WHERE DATE(s3.createdAt) = DATE(s.createdAt) AND s3.tenantId = ? ${saleFilter.replace('userId = ?', 's3.userId = ?')} AND s3.status = 0
        ), 0) as profit
      FROM sale s
      WHERE s.tenantId = ? ${saleFilter.replace('userId = ?', 's.userId = ?')} AND s.status = 0
      AND s.createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(s.createdAt), name
      ORDER BY DATE(s.createdAt) ASC
    `, [...saleParams, ...saleParams, ...saleParams, ...saleParams]);

    // Generate last 7 days array with 0 values
    const salesChart = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const name = d.toLocaleDateString('en-US', { weekday: 'short' });
      const row = chartRows.find(r => r.name === name);
      return {
        name,
        sales: Number(row?.sales || 0),
        profit: Number(row?.profit || 0)
      };
    });

    return res.json({
      success: true,
      dailySales: Number(salesToday[0]?.total || 0),
      dailyTransactions: Number(txToday[0]?.total || 0),
      newCustomers: Number(totalCustomers[0]?.total || 0),
      outOfStockCount: Number(lowStock[0]?.total || 0),
      profit: Number(profitRes[0]?.dailyProfit || 0),
      cumulativeProfit: Number(profitRes[0]?.cumulativeProfit || 0),
      profitBySource: profitBySourceRes.map(row => ({
        name: row.name,
        sales: Number(row.sales),
        profit: Number(row.profit)
      })),
      salesChart,
      rating: 4.8
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

export const getActivityLogs = async (req, res) => {
  const { tenantId, userId, role } = req.user;

  try {
    // Feature gate: Activity logs only for MAX plan or SUPER_ADMINs
    if (role !== 'SUPER_ADMIN') {
      const [subs] = await db.query('SELECT planName, status FROM subscription WHERE tenantId = ? LIMIT 1', [tenantId]);
      const sub = subs[0];
      
      // During trial (status 2), provide MAX-tier access (Activity Logs) regardless of intended plan
      const plan = (sub?.status === 2) ? 'TRIAL' : (sub?.status === 0 ? sub.planName : 'LITE');

      if (!['MAX', 'TRIAL'].includes(plan)) {
        const msg = sub?.status === 1 
          ? 'Your subscription has expired. Please renew to access activity logs.'
          : 'Activity logs are only available on the Business Pro (MAX) package.';
        return res.status(403).json({ success: false, message: msg });
      }
    }

    const { page = 1, limit = 10 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    const isStaff = role === 'STAFF';

    let whereQuery = 'WHERE l.tenantId = ?';
    const queryParams = [tenantId];

    if (isStaff) {
      whereQuery += ' AND l.userId = ?';
      queryParams.push(userId);
    }

    const [logs] = await db.query(`
      SELECT l.*, u.name as userName
      FROM activitylog l
      LEFT JOIN user u ON l.userId = u.id
      ${whereQuery}
      ORDER BY l.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM activitylog l ${whereQuery}`, queryParams);
    const total = Number(countRes[0].total);

    return res.json({
      success: true,
      data: {
        items: logs,
        pagination: { total, totalPages: Math.ceil(total / Number(limit)), page: Number(page), limit: Number(limit) }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch logs' });
  }
};

export const uploadPhoto = async (req, res) => {
  const { userId } = req.user;

  if (!req.files || !req.files.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const file = req.files.file;
    const photoUrl = await uploadFile(file, 'profiles');

    // Update database
    await db.query(`UPDATE user SET photoUrl = ? WHERE id = ?`, [photoUrl, userId]);

    return res.json({ success: true, data: { photoUrl } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


export const clearData = async (req, res) => {
  const { tenantId, userId, role } = req.user;
  
  if (role !== 'PROVIDER' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Unauthorized: Only business owners can clear data.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Delete Sales & Items
    await connection.query('DELETE FROM saleitem WHERE saleId IN (SELECT id FROM sale WHERE tenantId = ?)', [tenantId]);
    await connection.query('DELETE FROM sale WHERE tenantId = ?', [tenantId]);

    // 2. Delete Inventory & Products
    await connection.query('DELETE FROM product WHERE tenantId = ?', [tenantId]);

    // 3. Delete Services
    await connection.query('DELETE FROM service WHERE tenantId = ?', [tenantId]);

    // 4. Delete Expenses
    await connection.query('DELETE FROM expense WHERE tenantId = ?', [tenantId]);

    // 5. Delete Activity Logs (except for the clear action itself shortly)
    await connection.query('DELETE FROM activitylog WHERE tenantId = ?', [tenantId]);

    // 6. Delete Notifications
    await connection.query('DELETE FROM notification WHERE tenantId = ?', [tenantId]);

    // 7. Delete Customers (related to this tenant)
    await connection.query("DELETE FROM user WHERE tenantId = ? AND role = 'CUSTOMER'", [tenantId]);

    // Log the clear action
    await connection.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, ipAddress, createdAt)
      VALUES (?, ?, ?, 'Workshop cleared', 'Workshop cleared', ?, ?, NOW())
    `, [ulid(), tenantId, userId, 'The user reset their business data to zero.', req.ip || 'Unknown']);

    await connection.commit();
    return res.json({ success: true, message: 'All business data cleared successfully.' });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};
