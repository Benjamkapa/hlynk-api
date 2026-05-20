import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';
import { initiateStkPush } from '../utils/mpesa.js';
import { decrypt } from '../utils/encryption.js';

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
      SELECT s.*, u.name as userName,
             (SELECT rawPayload FROM mpesalog l WHERE l.checkoutRequestId = s.mpesaRequestId ORDER BY type DESC, createdAt DESC LIMIT 1) as rawPayload
      FROM sale s
      LEFT JOIN user u ON s.userId = u.id
      ${whereQuery}
      ORDER BY s.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    if (sales.length > 0) {
      const saleIds = sales.map((s) => s.id);
      const [items] = await db.query(`SELECT * FROM saleitem WHERE saleId IN (?)`, [saleIds]);
      
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

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM sale s ${whereQuery}`, queryParams);
    const total = Number(countRes[0].total);
    const pages = Math.ceil(total / Number(limit));

    const response = { 
      success: true,
      items: sales,
      total,
      page: Number(page),
      pages,
      limit: Number(limit)
    };

    // Calculate filter-specific stats efficiently
    if (req.query.includeStats === 'true') {
      const [statsRes] = await db.query(`
        SELECT 
          SUM(totalAmount) as totalAmount,
          COUNT(*) as transactions
        FROM sale s
        ${whereQuery}
      `, queryParams);

      const totalAmount = Number(statsRes[0].totalAmount || 0);
      const transactions = Number(statsRes[0].transactions || 0);
      const avgSale = transactions > 0 ? Math.round(totalAmount / transactions) : 0;

      response.stats = {
        totalToday: totalAmount,
        transactions,
        avgSale
      };
    }

    return res.json(response);
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sales' });
  }
};

export const createSale = async (req, res) => {
  const { tenantId, userId } = req.user;
  let { items, totalAmount, paymentMethod, status, mpesaRequestId, customerId, customerName, customerPhone } = req.body;
  const clientIp = req.ip;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Auto-create or resolve customer if phone is provided but no customerId
    if (!customerId && customerPhone) {
      const [existing] = await connection.query(`SELECT id, name FROM user WHERE phone = ? AND role = 'CUSTOMER' AND tenantId = ?`, [customerPhone, tenantId]);
      if (existing.length > 0) {
        customerId = existing[0].id;
        if (!customerName) customerName = existing[0].name;
      } else {
        customerId = ulid();
        await connection.query(
          `INSERT INTO user (id, tenantId, name, phone, role, passwordHash, phoneVerified, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'CUSTOMER', '', 0, 1, NOW(), NOW())`,
          [customerId, tenantId, customerName || 'Walk-in Customer', customerPhone]
        );
      }
    }

    const saleId = ulid();
    await connection.query(
      `INSERT INTO sale (id, tenantId, userId, customerId, customerName, totalAmount, paymentMethod, status, mpesaRequestId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [saleId, tenantId, userId || null, customerId || null, customerName || null, totalAmount, paymentMethod || 'CASH', status !== undefined ? status : 0, mpesaRequestId || null]
    );

    for (const item of items) {
      await connection.query(
        `INSERT INTO saleitem (id, saleId, productId, name, quantity, price) VALUES (?, ?, ?, ?, ?, ?)`,
        [ulid(), saleId, item.productId || null, item.name, item.quantity, item.price]
      );

      // Update inventory (Physical Goods only)
      if (item.productId) {
        await connection.query(`UPDATE product SET stockLevel = stockLevel - ? WHERE id = ? AND tenantId = ? AND type != 'SERVICE'`, [item.quantity, item.productId, tenantId]);
      }
    }

    // IF MPESA, Record in Master Payment Table
    if (paymentMethod === 'MPESA' || mpesaRequestId) {
      try {
        await connection.query(`
          INSERT INTO payment (id, tenantId, amount, status, reference, mpesaRequestId, transactionType, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, 'SALE', NOW())
        `, [ulid(), tenantId, totalAmount, status || 2, saleId, mpesaRequestId || null]);
      } catch (payErr) {
        console.error('[SALE-PAYMENT-LINK] Warning: Failed to link payment record:', payErr.message);
        // We don't throw here to avoid failing the whole sale if just the payment-log fails
      }
    }

    // Activity Log
    try {
      await connection.query(`
        INSERT INTO activitylog (id, tenantId, userId, action, logName, details, ipAddress, actionId, createdAt) 
        VALUES (?, ?, ?, 'Sale recorded', 'Sale recorded', ?, ?, ?, NOW())
      `, [ulid(), tenantId, userId || null, `Sale of ${items.length} items for ${totalAmount}`, clientIp, `#sale-${saleId.slice(-6).toUpperCase()}`]);
    } catch (logErr) {
      console.error('[SALE-ACTIVITY-LOG] Warning: Failed to record activity:', logErr.message);
    }

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
    const [sales] = await db.query(`SELECT s.*, u.name as userName FROM sale s LEFT JOIN user u ON s.userId = u.id WHERE s.id = ? AND s.tenantId = ?`, [id, tenantId]);
    if (sales.length === 0) return res.status(404).json({ success: false, message: 'Sale not found' });
    
    const sale = sales[0];
    const [items] = await db.query(`SELECT * FROM saleitem WHERE saleId = ?`, [id]);
    sale.items = items;
    
    return res.json({ success: true, data: sale });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sale details' });
  }
};

export const vendorMpesaPush = async (req, res) => {
  const { tenantId } = req.user;
  const { phone, amount, reference } = req.body;

  try {
    const [[provider]] = await db.query(`SELECT operationalSettings FROM provider WHERE tenantId = ?`, [tenantId]);
    
    let customCredentials = null;
    if (provider?.operationalSettings) {
      const ops = typeof provider.operationalSettings === 'string' 
        ? JSON.parse(provider.operationalSettings) 
        : provider.operationalSettings;
      
      const env = ops.mpesa?.env || 'sandbox';
      const mpesa = ops.mpesa?.[env];

      if (mpesa && mpesa.consumerKey) {
        customCredentials = { ...mpesa, env };
        if (customCredentials.consumerKey && customCredentials.consumerKey.includes(':')) {
          customCredentials.consumerKey = decrypt(customCredentials.consumerKey);
        }
        if (customCredentials.consumerSecret && customCredentials.consumerSecret.includes(':')) {
          customCredentials.consumerSecret = decrypt(customCredentials.consumerSecret);
        }
        if (customCredentials.passkey && customCredentials.passkey.includes(':')) {
          customCredentials.passkey = decrypt(customCredentials.passkey);
        }
      }
    }

    if (!customCredentials || !customCredentials.consumerKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'M-Pesa credentials not configured. Please visit the Developer Console to set up your Paybill/Till integration.' 
      });
    }

    const result = await initiateStkPush(
      { phone, amount, reference }, 
      customCredentials,
      {
        customerName: req.body.customerName || 'Walk-in Customer',
        initiatorName: req.user.name || 'Staff',
        tenantName: provider.businessName || 'Business',
        tenantId: tenantId
      }
    );

    // CRITICAL: Link the request ID to the Sale immediately if saleId provided
    if (req.body.saleId && result.CheckoutRequestID) {
      try {
        await db.query(`UPDATE sale SET mpesaRequestId = ? WHERE id = ? AND tenantId = ?`, [result.CheckoutRequestID, req.body.saleId, tenantId]);
        await db.query(`UPDATE payment SET mpesaRequestId = ? WHERE reference = ? AND tenantId = ?`, [result.CheckoutRequestID, req.body.saleId, tenantId]);
        console.log(`[SALES-LINK] Linked CheckoutRequestID ${result.CheckoutRequestID} to Sale ${req.body.saleId}`);
      } catch (linkErr) {
        console.error('[SALES-LINK] Failed to link CheckoutRequestID:', linkErr.message);
      }
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[SALES] M-Pesa Push Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

