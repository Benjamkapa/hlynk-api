import { db } from '../dbms/mysql.js';
import { encrypt, decrypt } from '../utils/encryption.js';

const decryptOperationalSettings = (operationalSettings) => {
  if (!operationalSettings) return operationalSettings;
  const ops = typeof operationalSettings === 'string' ? JSON.parse(operationalSettings) : { ...operationalSettings };

  if (ops.mpesa) {
    ops.mpesa = { ...ops.mpesa };
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

  if (ops.mpesa) {
    ops.mpesa = { ...ops.mpesa };
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
  const { tenantId } = req.user;
  // This is a simplified version of the stats logic
  try {
    const [
      [salesToday],
      [totalCustomers],
      [lowStock]
    ] = await Promise.all([
      db.query(`SELECT SUM(totalAmount) as total FROM Sale WHERE tenantId = ? AND createdAt >= CURDATE()`, [tenantId]),
      db.query(`SELECT COUNT(*) as total FROM User WHERE tenantId = ? AND role = 'CUSTOMER'`, [tenantId]),
      db.query(`SELECT COUNT(*) as total FROM Product WHERE tenantId = ? AND stockLevel <= 5`, [tenantId])
    ]);

    return res.json({
      success: true,
      dailySales: Number(salesToday[0]?.total || 0),
      newCustomers: Number(totalCustomers[0]?.total || 0),
      outOfStockCount: Number(lowStock[0]?.total || 0),
      rating: 4.8
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};
