import { db } from '../dbms/mysql.js';
import bcrypt from 'bcryptjs';
import { ulid } from 'ulid';

export const getStaff = async (req, res) => {
  const { tenantId } = req.user;
  try {
    const [staff] = await db.query(`
      SELECT u.id, u.name, u.email, u.phone, u.role, u.permissions, u.commissionType, u.commissionRate, u.baseSalary, u.isActive, u.createdAt, u.photoUrl,
      SUM(s.totalAmount) as totalSales, COUNT(s.id) as salesCount
      FROM user u
      LEFT JOIN sale s ON u.id = s.userId
      WHERE u.tenantId = ? AND u.role = 'STAFF'
      GROUP BY u.id
    `, [tenantId]);

    const formatted = staff.map((s) => ({
      ...s,
      permissions: typeof s.permissions === 'string' ? JSON.parse(s.permissions) : (s.permissions || [])
    }));

    return res.json({ success: true, data: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch staff' });
  }
};

export const createStaff = async (req, res) => {
  const { tenantId } = req.user;
  const { name, phone, email, password, permissions, commissionType, commissionRate, baseSalary } = req.body;

  try {
    const [existing] = await db.query(`SELECT id FROM user WHERE phone = ? OR (email IS NOT NULL AND email = ?) LIMIT 1`, [phone, email || '']);
    if (existing.length > 0) return res.status(409).json({ success: false, message: 'Phone or email already registered' });

    const [subs] = await db.query(`SELECT planName, status FROM subscription WHERE tenantId = ? LIMIT 1`, [tenantId]);
    const sub = subs[0];
    
    // During trial (status 2), provide MAX-tier access regardless of intended plan
    const plan = (sub?.status === 2) ? 'TRIAL' : (sub?.status === 0 ? sub.planName : 'LITE');
    
    const [staffCountRes] = await db.query(`SELECT COUNT(*) as total FROM user WHERE tenantId = ? AND role = 'STAFF'`, [tenantId]);
    const currentCount = Number(staffCountRes[0]?.total || 0);

    const limits = { 'LITE': 0, 'PLUS': 1, 'MAX': 999999, 'TRIAL': 999999 };
    const limit = limits[plan] || 0;

    if (currentCount >= limit) {
      const msg = sub?.status === 1
        ? `Your subscription has expired. Please renew to manage your team.`
        : `Your ${plan} plan is limited to ${limit} team members. Please upgrade to expand your team.`;
      return res.status(403).json({ success: false, message: msg });
    }

    const passwordHash = await bcrypt.hash(password || ulid(), 10);
    const id = ulid();

    await db.query(`
      INSERT INTO user (id, tenantId, name, phone, email, passwordHash, role, permissions, commissionType, commissionRate, baseSalary, phoneVerified, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, 'STAFF', ?, ?, ?, ?, 1, 1, NOW(), NOW())
    `, [id, tenantId, name, phone, email || null, passwordHash, JSON.stringify(permissions || []), commissionType || 'NONE', parseFloat(commissionRate) || 0, parseFloat(baseSalary) || 0]);

    return res.json({ success: true, data: { staffId: id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateStaff = async (req, res) => {
  const { tenantId } = req.user;
  const { staffId } = req.params;
  const data = req.body;

  try {
    let updateQuery = 'UPDATE user SET updatedAt = NOW()';
    const updateParams = [];

    if (data.name !== undefined) { updateQuery += ', name = ?'; updateParams.push(data.name); }
    if (data.email !== undefined) { updateQuery += ', email = ?'; updateParams.push(data.email); }
    if (data.phone !== undefined) { updateQuery += ', phone = ?'; updateParams.push(data.phone); }
    if (data.permissions !== undefined) { updateQuery += ', permissions = ?'; updateParams.push(JSON.stringify(data.permissions)); }
    if (data.isActive !== undefined) { updateQuery += ', isActive = ?'; updateParams.push(data.isActive ? 1 : 0); }

    updateQuery += ' WHERE id = ? AND tenantId = ?';
    updateParams.push(staffId, tenantId);

    await db.query(updateQuery, updateParams);
    return res.json({ success: true, data: { staffId } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteStaff = async (req, res) => {
  const { tenantId } = req.user;
  const { staffId } = req.params;
  try {
    await db.query(`DELETE FROM user WHERE id = ? AND tenantId = ?`, [staffId, tenantId]);
    return res.json({ success: true, data: { message: 'Staff deleted' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Delete failed' });
  }
};
