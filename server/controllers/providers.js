import { db } from '../dbms/mysql.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { uploadFile } from '../utils/storage.js';

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

  if (ops.mpesa) {
    if (ops.mpesa.sandbox) ops.mpesa.sandbox = decryptMpesa(ops.mpesa.sandbox);
    if (ops.mpesa.production) ops.mpesa.production = decryptMpesa(ops.mpesa.production);
    // Backward compatibility
    if (ops.mpesa.consumerKey) ops.mpesa.consumerKey = decrypt(ops.mpesa.consumerKey);
    if (ops.mpesa.consumerSecret) ops.mpesa.consumerSecret = decrypt(ops.mpesa.consumerSecret);
    if (ops.mpesa.passkey) ops.mpesa.passkey = decrypt(ops.mpesa.passkey);
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

  if (ops.mpesa) {
    if (ops.mpesa.sandbox) ops.mpesa.sandbox = encryptMpesa(ops.mpesa.sandbox);
    if (ops.mpesa.production) ops.mpesa.production = encryptMpesa(ops.mpesa.production);
    // Backward compatibility
    if (ops.mpesa.consumerKey && !ops.mpesa.consumerKey.includes(':')) ops.mpesa.consumerKey = encrypt(ops.mpesa.consumerKey);
    if (ops.mpesa.consumerSecret && !ops.mpesa.consumerSecret.includes(':')) ops.mpesa.consumerSecret = encrypt(ops.mpesa.consumerSecret);
    if (ops.mpesa.passkey && !ops.mpesa.passkey.includes(':')) ops.mpesa.passkey = encrypt(ops.mpesa.passkey);
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
      FROM Provider p
      JOIN User u ON p.userId = u.id
      JOIN Tenant t ON p.tenantId = t.id
      LEFT JOIN Subscription s ON t.id = s.tenantId
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
    if (data.email !== undefined) { userUpdates.push('email = ?'); userParams.push(data.email); }
    if (data.phone !== undefined) { userUpdates.push('phone = ?'); userParams.push(data.phone); }
    
    if (userUpdates.length > 0) {
      userUpdates.push('updatedAt = NOW()');
      await connection.query(`UPDATE User SET ${userUpdates.join(', ')} WHERE id = ?`, [...userParams, userId]);
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
      await connection.query(`UPDATE Provider SET ${provUpdates.join(', ')} WHERE userId = ?`, [...provParams, userId]);
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

    const [
      [salesToday],
      [totalCustomers],
      [lowStock]
    ] = await Promise.all([
      db.query(`SELECT SUM(totalAmount) as total FROM Sale WHERE tenantId = ? ${saleFilter} AND createdAt >= CURDATE()`, saleParams),
      db.query(`
        SELECT COUNT(DISTINCT u.id) as total 
        FROM User u 
        WHERE u.tenantId = ? AND u.role = 'CUSTOMER'
        ${isStaff ? 'AND EXISTS (SELECT 1 FROM Sale s WHERE s.customerId = u.id AND s.userId = ?)' : ''}
      `, isStaff ? [tenantId, userId] : [tenantId]),
      db.query(`SELECT COUNT(*) as total FROM Product WHERE tenantId = ? AND stockLevel <= 5`, [tenantId])
    ]);

    // Calculate Estimated Profit (Simplified for demonstration, normally would be revenue - COGS)
    // For staff, profit is also filtered by their sales
    const [profitRes] = await db.query(`SELECT SUM(totalAmount) * 0.25 as profit FROM Sale WHERE tenantId = ? ${saleFilter} AND MONTH(createdAt) = MONTH(CURRENT_DATE())`, saleParams);

    // REAL aggregation for chart data (Last 7 Days)
    const [chartRows] = await db.query(`
      SELECT 
        DATE_FORMAT(createdAt, '%a') as name,
        SUM(totalAmount) as sales,
        SUM(totalAmount) * 0.25 as profit
      FROM Sale 
      WHERE tenantId = ? ${saleFilter}
      AND createdAt >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
      GROUP BY DATE(createdAt), name
      ORDER BY DATE(createdAt) ASC
    `, saleParams);

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
      newCustomers: Number(totalCustomers[0]?.total || 0),
      outOfStockCount: Number(lowStock[0]?.total || 0),
      profit: Number(profitRes[0]?.profit || 0),
      salesChart,
      rating: 4.8
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

export const getActivityLogs = async (req, res) => {
  const { tenantId } = req.user;
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  const isStaff = req.user.role === 'STAFF';
  const { userId } = req.user;

  try {
    let whereQuery = 'WHERE l.tenantId = ?';
    const queryParams = [tenantId];

    if (isStaff) {
      whereQuery += ' AND l.userId = ?';
      queryParams.push(userId);
    }

    const [logs] = await db.query(`
      SELECT l.*, u.name as userName
      FROM ActivityLog l
      LEFT JOIN User u ON l.userId = u.id
      ${whereQuery}
      ORDER BY l.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM ActivityLog l ${whereQuery}`, queryParams);
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
    await db.query(`UPDATE User SET photoUrl = ? WHERE id = ?`, [photoUrl, userId]);

    return res.json({ success: true, data: { photoUrl } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


