import { db } from '../dbms/mysql.js';
import { uploadFile } from '../utils/storage.js';
import { ulid } from 'ulid';

const getStartOfDay = (date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

export const listProducts = async (req, res) => {
  const { tenantId } = req.user;
  const { search, category, limit = 50, page = 1, filter, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  
  let whereQuery = 'WHERE tenantId = ?';
  const queryParams = [tenantId];
  
  if (search) {
    whereQuery += ' AND (name LIKE ? OR sku LIKE ?)';
    queryParams.push(`%${search}%`, `%${search}%`);
  }

  if (category) {
    whereQuery += ' AND category = ?';
    queryParams.push(category);
  }

  const offset = (Number(page) - 1) * Number(limit);

  try {
    const [products] = await db.query(`
      SELECT * FROM product 
      ${whereQuery}
      ORDER BY ${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM product ${whereQuery}`, queryParams);
    const total = Number(countRes[0].total);

    const response = {
      success: true,
      items: products,
      total,
      page: Number(page),
      limit: Number(limit),
      pages: Math.ceil(total / Number(limit))
    };

    // Only calculate expensive stats if specifically requested (e.g. for dashboard/management, not for POS search)
    if (req.query.includeStats === 'true') {
      const [totalItemsRes] = await db.query(`SELECT COUNT(*) as total FROM product WHERE tenantId = ?`, [tenantId]);
      const [lowStockRes] = await db.query(`SELECT COUNT(*) as total FROM product WHERE tenantId = ? AND type != 'SERVICE' AND stockLevel <= minLevel`, [tenantId]);
      const [totalValueRes] = await db.query(`SELECT SUM(price * stockLevel) as total FROM product WHERE tenantId = ?`, [tenantId]);
      
      const today = getStartOfDay(new Date());
      const [expiringSoonRes] = await db.query(`
        SELECT COUNT(*) as total FROM product 
        WHERE tenantId = ? AND isPerishable = 1 AND expiryDate >= ? AND expiryDate <= DATE_ADD(?, INTERVAL 30 DAY)
      `, [tenantId, today, today]);

      response.stats = {
        totalItems: Number(totalItemsRes[0].total),
        lowStock: Number(lowStockRes[0].total),
        totalValue: Number(totalValueRes[0].total || 0),
        expiringSoon: Number(expiringSoonRes[0].total)
      };
    }

    return res.json(response);
  } catch (err) {
    console.error('[INVENTORY] List error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch inventory' });
  }
};

export const createProduct = async (req, res) => {
  const { tenantId } = req.user;
  const data = req.body;
  const id = ulid();
  const sku = data.sku || `HLI-${ulid().slice(-6).toUpperCase()}`;

  try {
    await db.query(
      `INSERT INTO product (id, tenantId, name, category, price, buyingPrice, stockLevel, sku, imageUrl, description, minLevel, isPerishable, type, expiryDate, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        id, tenantId, data.name, data.category || 'General', data.price, data.buyingPrice || 0, 
        parseInt(data.stock) || 0, sku, data.imageUrl || null, data.description || null, 
        parseInt(data.minLevel) || 5, data.isPerishable ? 1 : 0, 
        data.type || 'GOOD', data.expiryDate || null
      ]
    );

    return res.json({ success: true, data: { id, sku } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const updateProduct = async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;
  const data = req.body;

  try {
    let updateQuery = 'UPDATE product SET updatedAt = NOW()';
    const updateParams = [];

    if (data.name) { updateQuery += ', name = ?'; updateParams.push(data.name); }
    if (data.price) { updateQuery += ', price = ?'; updateParams.push(data.price); }
    if (data.stock !== undefined) { updateQuery += ', stockLevel = ?'; updateParams.push(parseInt(data.stock)); }

    updateQuery += ' WHERE id = ? AND tenantId = ?';
    updateParams.push(id, tenantId);

    await db.query(updateQuery, updateParams);
    return res.json({ success: true, data: { id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM product WHERE id = ? AND tenantId = ?`, [id, tenantId]);
    return res.json({ success: true, data: { message: 'Product deleted' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

export const uploadProductImage = async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;

  if (!req.files || !req.files.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }

  try {
    const file = req.files.file;
    const imageUrl = await uploadFile(file, 'products');

    // Update database
    await db.query(`UPDATE product SET imageUrl = ? WHERE id = ? AND tenantId = ?`, [imageUrl, id, tenantId]);

    return res.json({ success: true, data: { imageUrl } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

