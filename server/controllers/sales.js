import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

export const listSales = async (req, res) => {
  const { tenantId } = req.user;
  const { search, date, limit = 50, page = 1, sortBy = 'createdAt', sortOrder = 'desc', status } = req.query;

  try {
    let whereQuery = 'WHERE s.tenantId = ?';
    const queryParams = [tenantId];

    // STAFF RESTRICTION: Staff only see their own sales
    if (req.user.role === 'STAFF') {
      whereQuery += ' AND s.userId = ?';
      queryParams.push(req.user.userId);
    }
    
    if (search) {
      whereQuery += ' AND (s.customerName LIKE ? OR s.paymentMethod LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      whereQuery += ' AND s.createdAt >= ? AND s.createdAt <= ?';
      queryParams.push(start, end);
    }

    if (status) {
      whereQuery += ' AND s.status = ?';
      queryParams.push(status);
    }

    const offset = (Number(page) - 1) * Number(limit);

    const [sales] = await db.query(`
      SELECT s.*, u.name as userName 
      FROM Sale s
      LEFT JOIN User u ON s.userId = u.id
      ${whereQuery}
      ORDER BY s.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    if (sales.length > 0) {
      const saleIds = sales.map((s) => s.id);
      const [items] = await db.query(`SELECT * FROM SaleItem WHERE saleId IN (?)`, [saleIds]);
      
      const itemsBySale = items.reduce((acc, item) => {
        if (!acc[item.saleId]) acc[item.saleId] = [];
        acc[item.saleId].push(item);
        return acc;
      }, {});

      for (const sale of sales) {
        sale.items = itemsBySale[sale.id] || [];
        sale.user = sale.userName ? { name: sale.userName } : null;
      }
    }

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM Sale s ${whereQuery}`, queryParams);
    const total = Number(countRes[0].total);
    const pages = Math.ceil(total / Number(limit));

    // Stats for the current filter (which is usually a specific date)
    const [statsRes] = await db.query(`
      SELECT 
        SUM(totalAmount) as totalAmount,
        COUNT(*) as transactions
      FROM Sale s
      ${whereQuery}
    `, queryParams);

    const totalToday = Number(statsRes[0].totalAmount || 0);
    const transactions = Number(statsRes[0].transactions || 0);
    const avgSale = transactions > 0 ? Math.round(totalToday / transactions) : 0;

    return res.json({ 
      success: true,
      items: sales,
      total,
      page: Number(page),
      pages,
      limit: Number(limit),
      stats: {
        totalToday,
        transactions,
        avgSale
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sales' });
  }
};

export const createSale = async (req, res) => {
  const { tenantId, userId } = req.user;
  const { items, totalAmount, paymentMethod, status, mpesaRequestId, customerName, customerPhone } = req.body;
  const clientIp = req.ip;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const saleId = ulid();
    await connection.query(
      `INSERT INTO Sale (id, tenantId, userId, customerName, totalAmount, paymentMethod, status, mpesaRequestId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [saleId, tenantId, userId || null, customerName || null, totalAmount, paymentMethod || 'CASH', status || 'COMPLETED', mpesaRequestId || null]
    );

    for (const item of items) {
      await connection.query(
        `INSERT INTO SaleItem (id, saleId, productId, name, quantity, price) VALUES (?, ?, ?, ?, ?, ?)`,
        [ulid(), saleId, item.productId || null, item.name, item.quantity, item.price]
      );

      // Update inventory
      if (item.productId) {
        await connection.query(`UPDATE Product SET stockLevel = stockLevel - ? WHERE id = ? AND tenantId = ?`, [item.quantity, item.productId, tenantId]);
      }
    }

    // Activity Log
    await connection.query(`
      INSERT INTO ActivityLog (id, tenantId, userId, action, logName, details, ipAddress, actionId, createdAt) 
      VALUES (?, ?, ?, 'Sale recorded', 'Sale recorded', ?, ?, ?, NOW())
    `, [ulid(), tenantId, userId || null, `Sale of ${items.length} items for ${totalAmount}`, clientIp, `#sale-${saleId.slice(-6).toUpperCase()}`]);

    await connection.commit();
    return res.json({ success: true, data: { saleId } });
  } catch (err) {
    await connection.rollback();
    return res.status(500).json({ success: false, message: err.message });
  } finally {
    connection.release();
  }
};

export const getSaleDetails = async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;
  try {
    const [sales] = await db.query(`SELECT s.*, u.name as userName FROM Sale s LEFT JOIN User u ON s.userId = u.id WHERE s.id = ? AND s.tenantId = ?`, [id, tenantId]);
    if (sales.length === 0) return res.status(404).json({ success: false, message: 'Sale not found' });
    
    const sale = sales[0];
    const [items] = await db.query(`SELECT * FROM SaleItem WHERE saleId = ?`, [id]);
    sale.items = items;
    
    return res.json({ success: true, data: sale });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sale details' });
  }
};
