import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

export const getMyServices = async (req, res) => {
  const { tenantId } = req.user;
  try {
    const [services] = await db.query(`SELECT * FROM Service WHERE tenantId = ? AND isActive = 1 ORDER BY createdAt DESC`, [tenantId]);
    return res.json({ success: true, data: services });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch services' });
  }
};

export const createService = async (req, res) => {
  const { tenantId, userId } = req.user;
  const { name, description, price, duration } = req.body;
  const id = ulid();

  try {
    // Note: In HudumaLynk, providerId is often the userId of the business owner
    await db.query(`
      INSERT INTO Service (id, tenantId, providerId, name, description, price, duration, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())
    `, [id, tenantId, userId, name, description || null, price || null, duration || null]);
    
    return res.json({ success: true, data: { serviceId: id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateService = async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;
  const data = req.body;

  try {
    let updateQuery = 'UPDATE Service SET updatedAt = NOW()';
    const updateParams = [];

    if (data.name) { updateQuery += ', name = ?'; updateParams.push(data.name); }
    if (data.description !== undefined) { updateQuery += ', description = ?'; updateParams.push(data.description); }
    if (data.price !== undefined) { updateQuery += ', price = ?'; updateParams.push(data.price); }

    updateQuery += ' WHERE id = ? AND tenantId = ?';
    updateParams.push(id, tenantId);

    await db.query(updateQuery, updateParams);
    return res.json({ success: true, data: { id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteService = async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;
  try {
    await db.query(`UPDATE Service SET isActive = 0, updatedAt = NOW() WHERE id = ? AND tenantId = ?`, [id, tenantId]);
    return res.json({ success: true, data: { message: 'Service deactivated' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Delete failed' });
  }
};
