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
      const [totalItemsRes] = await db.query(`SELECT COUNT(*) as total FROM product WHERE tenantId = ? AND IFNULL(type, 'GOOD') != 'SERVICE'`, [tenantId]);
      const [lowStockRes] = await db.query(`SELECT COUNT(*) as total FROM product WHERE tenantId = ? AND IFNULL(type, 'GOOD') != 'SERVICE' AND stockLevel <= minLevel`, [tenantId]);
      const [totalValueRes] = await db.query(`SELECT SUM(buyingPrice * stockLevel) as total FROM product WHERE tenantId = ? AND IFNULL(type, 'GOOD') != 'SERVICE'`, [tenantId]);
      
      const today = getStartOfDay(new Date());
      const [expiringSoonRes] = await db.query(`
        SELECT COUNT(*) as total FROM product 
        WHERE tenantId = ? AND isPerishable = 1 AND expiryDate >= ? AND expiryDate <= DATE_ADD(?, INTERVAL 28 DAY)
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
    // 1. Check Plan Limits
    const [subs] = await db.query(`SELECT planName, status FROM subscription WHERE tenantId = ? LIMIT 1`, [tenantId]);
    const sub = subs[0];
    
    // During trial (status 2), provide MAX-tier access regardless of intended plan
    const plan = (sub?.status === 2) ? 'TRIAL' : (sub?.status === 0 ? sub.planName : 'LITE');

    const [productCountRes] = await db.query(`SELECT COUNT(*) as total FROM product WHERE tenantId = ?`, [tenantId]);
    const currentCount = Number(productCountRes[0]?.total || 0);

    const limits = { 'LITE': 15, 'PLUS': 100, 'MAX': 999999, 'TRIAL': 999999 };
    const limit = limits[plan] || 15;

    if (currentCount >= limit) {
      const msg = sub?.status === 1 
        ? `Your subscription has expired. Please renew to manage more than ${limit} items.` 
        : `Your ${plan} plan is limited to ${limit} items. Please upgrade to manage more product records.`;
      return res.status(403).json({ success: false, message: msg });
    }

    await db.query(
      `INSERT INTO product (id, tenantId, name, category, price, buyingPrice, stockLevel, sku, imageUrl, description, minLevel, isPerishable, type, expiryDate, isActive, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [
        id, tenantId, data.name, data.category || 'General', Number(data.price), 
        data.type === 'SERVICE' ? 0 : (Number(data.buyingPrice) || 0), 
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
    if (data.price !== undefined) { updateQuery += ', price = ?'; updateParams.push(Number(data.price)); }
    if (data.stock !== undefined) { updateQuery += ', stockLevel = ?'; updateParams.push(parseInt(data.stock)); }
    if (data.category) { updateQuery += ', category = ?'; updateParams.push(data.category); }
    if (data.buyingPrice !== undefined) { updateQuery += ', buyingPrice = ?'; updateParams.push(data.type === 'SERVICE' ? 0 : Number(data.buyingPrice)); }
    if (data.type) { updateQuery += ', type = ?'; updateParams.push(data.type); }
    if (data.isPerishable !== undefined) { updateQuery += ', isPerishable = ?'; updateParams.push(data.isPerishable ? 1 : 0); }
    if (data.expiryDate !== undefined) { updateQuery += ', expiryDate = ?'; updateParams.push(data.expiryDate || null); }

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

