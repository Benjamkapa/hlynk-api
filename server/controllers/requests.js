import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

export const getProviderRequests = async (req, res) => {
  const { tenantId } = req.user;
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereQuery = 'WHERE r.tenantId = ?';
    const queryParams = [tenantId];

    if (status) {
      whereQuery += ' AND r.status = ?';
      queryParams.push(status);
    }

    const [requests] = await db.query(`
      SELECT r.*, s.name as serviceName, s.price as servicePrice
      FROM Request r
      LEFT JOIN Service s ON r.serviceId = s.id
      ${whereQuery}
      ORDER BY r.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM Request r ${whereQuery}`, queryParams);
    const total = Number(countRes[0].total);

    return res.json({ success: true, requests, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch requests' });
  }
};

export const createRequest = async (req, res) => {
  const { tenantId, userId } = req.user;
  const { providerId, serviceId, customerName, customerPhone, message } = req.body;
  const id = ulid();

  try {
    await db.query(`
      INSERT INTO Request (id, tenantId, customerId, providerId, serviceId, customerName, customerPhone, message, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())
    `, [id, tenantId, userId, providerId, serviceId || null, customerName, customerPhone, message || null]);
    
    return res.json({ success: true, data: { requestId: id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateRequestStatus = async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;
  const { status } = req.body;

  try {
    await db.query(`UPDATE Request SET status = ?, updatedAt = NOW() WHERE id = ? AND tenantId = ?`, [status, id, tenantId]);
    return res.json({ success: true, data: { id, status } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Status update failed' });
  }
};
