import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

export const listCustomers = async (req, res) => {
  const { tenantId } = req.user;
  const { search, page = 1, limit = 50, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;

  try {
    // STAFF RESTRICTION: Staff only see their own handled customers
    let whereClause = `WHERE u.role = 'CUSTOMER' AND u.tenantId = ?`;
    const queryParams = [tenantId];
    
    if (req.user.role === 'STAFF') {
      whereClause += ` AND EXISTS (SELECT 1 FROM sale s WHERE s.customerId = u.id AND s.userId = ? AND s.tenantId = ?)`;
      queryParams.push(req.user.userId, tenantId);
    } else {
      whereClause += ` AND (u.tenantId = ? OR EXISTS (SELECT 1 FROM sale s WHERE s.customerId = u.id AND s.tenantId = ?))`;
      queryParams.push(tenantId, tenantId);
    }

    if (search) {
      whereClause += ` AND (u.name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const offset = (Number(page) - 1) * Number(limit);

    const [users] = await db.query(`
      SELECT u.*, 
        (SELECT SUM(totalAmount) FROM sale s WHERE s.customerId = u.id AND s.tenantId = ?) as totalSpend,
        (SELECT MAX(createdAt) FROM sale s WHERE s.customerId = u.id AND s.tenantId = ?) as lastVisit
      FROM user u
      ${whereClause}
      ORDER BY u.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [tenantId, tenantId, ...queryParams, Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM user u ${whereClause}`, queryParams);
    const total = Number(countRes[0].total);

    const [activeRes] = await db.query(`SELECT COUNT(DISTINCT customerId) as activeToday FROM sale WHERE tenantId = ? AND DATE(createdAt) = CURDATE() AND customerId IS NOT NULL`, [tenantId]);
    
    const [topSpenderRes] = await db.query(`
      SELECT customerName as name, SUM(totalAmount) as total 
      FROM sale 
      WHERE tenantId = ? AND customerName IS NOT NULL
      GROUP BY customerName 
      ORDER BY total DESC 
      LIMIT 1
    `, [tenantId]);

    const stats = {
      total,
      activeToday: Number(activeRes[0]?.activeToday || 0),
      topSpender: topSpenderRes.length > 0 ? topSpenderRes[0].name : 'N/A'
    };

    return res.json({ 
      success: true,
      items: users,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit)),
      stats
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch customers' });
  }
};

export const createCustomer = async (req, res) => {
  const { tenantId } = req.user;
  const { name, phone, email } = req.body;

  try {
    // 1. Check globally if this phone number exists
    const [existing] = await db.query(`SELECT id FROM user WHERE phone = ? LIMIT 1`, [phone]);
    
    if (existing.length > 0) {
      // If they exist anywhere, just return their existing ID to avoid duplicate error
      return res.json({ success: true, data: { customerId: existing[0].id } });
    }

    const id = ulid();
    await db.query(
      `INSERT INTO user (id, tenantId, name, phone, email, role, passwordHash, phoneVerified, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'CUSTOMER', '', 0, 1, NOW(), NOW())`,
      [id, tenantId, name, phone, email || null]
    );
    return res.json({ success: true, data: { customerId: id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
