import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';
import { initiateStkPush } from '../utils/mpesa.js';
import { initiateKcbStkPush } from '../utils/kcb.js';
import { decrypt } from '../utils/encryption.js';
import { pushSaleToEtims } from './etims.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _params = JSON.parse(fs.readFileSync(path.join(__dirname, '../configs/params.json'), 'utf8'));
const SYSTEM_SHORTCODE = (process.env.MPESA_C2B_SHORTCODE || _params.mpesa_c2b_shortcode || '').trim();
const SYSTEM_CONSUMER_KEY = (process.env.MPESA_CONSUMER_KEY || _params.mpesa_consumer_key || '').trim();

export const listSales = async (req, res) => {
  const { tenantId } = req.user;
  const { search, date, limit = 50, page = 1, sortBy = 'createdAt', sortOrder = 'desc', status, customerId } = req.query;

  try {
    let whereQuery = 'WHERE s.tenantId = ?';
    const queryParams = [tenantId];

    if (customerId) {
      whereQuery += ' AND s.customerId = ?';
      queryParams.push(customerId);
    }

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
        WHERE s.tenantId = ? AND s.status = 0
        ${req.user.role === 'STAFF' ? 'AND s.userId = ?' : ''}
      `, req.user.role === 'STAFF' ? [tenantId, req.user.userId] : [tenantId]);

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
      // 1. Check if this customer already exists for THIS tenant
      const [existing] = await connection.query(`SELECT id, name FROM user WHERE phone = ? AND tenantId = ? LIMIT 1`, [customerPhone, tenantId]);
      
      if (existing.length > 0) {
        customerId = existing[0].id;
        if (!customerName) customerName = existing[0].name;
      } else {
        // 2. Check if the user exists GLOBALLY (in another tenant or as a different role)
        const [globalExisting] = await connection.query(`SELECT id, name FROM user WHERE phone = ? LIMIT 1`, [customerPhone]);
        
        if (globalExisting.length > 0) {
          // Found them globally - reuse their ID to avoid duplicate entry error
          customerId = globalExisting[0].id;
          if (!customerName) customerName = globalExisting[0].name;
        } else {
          // 3. Truly new user - Create them
          customerId = ulid();
          await connection.query(
            `INSERT INTO user (id, tenantId, name, phone, role, passwordHash, phoneVerified, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'CUSTOMER', '', 0, 1, NOW(), NOW())`,
            [customerId, tenantId, customerName || 'Walk-in Customer', customerPhone]
          );
        }
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
    if (paymentMethod && paymentMethod.startsWith('MPESA') || mpesaRequestId) {
      try {
        let isRented = 0;
        if (mpesaRequestId) {
          const [log] = await connection.query(`SELECT isRented FROM mpesalog WHERE checkoutRequestId = ? LIMIT 1`, [mpesaRequestId]);
          if (log.length > 0) isRented = log[0].isRented;
        }

        await connection.query(`
          INSERT INTO payment (id, tenantId, amount, status, reference, mpesaRequestId, transactionType, isRented, createdAt)
          VALUES (?, ?, ?, ?, ?, ?, 'SALE', ?, NOW())
        `, [ulid(), tenantId, totalAmount, status || 2, saleId, mpesaRequestId || null, isRented]);
      } catch (payErr) {
        console.error('[SALE-PAYMENT-LINK] Warning: Failed to link payment record:', payErr.message);
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

    // ─── eTIMS Auto-Push (fire-and-forget, never blocks the sale) ───
    // Only push immediately for completed sales (status=0 = paid).
    if (status === 0 || status === undefined || status === null) {
      setImmediate(() => {
        pushSaleToEtims(tenantId, saleId).catch(err =>
          console.error(`[eTIMS] Background push failed for sale ${saleId}:`, err.message)
        );
      });
    }

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

    // ──────────────────────────────────────────────────────────────────────
    // RENTED PAYBILL DETECTION
    // A provider is "renting" the system paybill if:
    //   a) They have no custom credentials configured, OR
    //   b) Their stored credentials match the system-level shortcode/consumerKey
    //      (i.e. the super-admin vendor account saved the platform's own keys)
    // ──────────────────────────────────────────────────────────────────────
    let isRented = false;
    if (!customCredentials || !customCredentials.consumerKey) {
      isRented = true;
      console.log(`[SALES] Tenant ${tenantId} is renting system paybill (no custom credentials).`);
    } else {
      // Check if they're using the system's own shortcode or consumer key
      const providerShortcode = (customCredentials.shortcode || '').trim();
      const providerKey = (customCredentials.consumerKey || '').trim();
      const shortcodeMatchesSystem = SYSTEM_SHORTCODE && providerShortcode === SYSTEM_SHORTCODE;
      const keyMatchesSystem = SYSTEM_CONSUMER_KEY && providerKey === SYSTEM_CONSUMER_KEY;

      if (shortcodeMatchesSystem || keyMatchesSystem) {
        isRented = true;
        customCredentials = null; // Use system credentials — don't duplicate
        console.log(`[SALES] Tenant ${tenantId} configured the SYSTEM paybill as their own — treating as rented.`);
      }
    }

    const result = await initiateStkPush(
      { phone, amount, reference }, 
      isRented ? null : customCredentials,
      {
        customerName: req.body.customerName || 'Walk-in Customer',
        initiatorName: req.user.name || 'Staff',
        tenantName: provider.businessName || 'Business',
        tenantId: tenantId,
        isRented: isRented
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

export const vendorKcbPush = async (req, res) => {
  const { tenantId } = req.user;
  const { phone, amount, reference } = req.body;

  try {
    const [[provider]] = await db.query(`SELECT businessName, operationalSettings FROM provider WHERE tenantId = ?`, [tenantId]);
    
    let customCredentials = null;
    if (provider?.operationalSettings) {
      const ops = typeof provider.operationalSettings === 'string' 
        ? JSON.parse(provider.operationalSettings) 
        : provider.operationalSettings;
      
      const env = ops.kcb?.env || 'sandbox';
      const kcb = ops.kcb?.[env];

      if (kcb && kcb.consumerKey) {
        customCredentials = { ...kcb, env };
        if (customCredentials.consumerKey && customCredentials.consumerKey.includes(':')) {
          customCredentials.consumerKey = decrypt(customCredentials.consumerKey);
        }
        if (customCredentials.consumerSecret && customCredentials.consumerSecret.includes(':')) {
          customCredentials.consumerSecret = decrypt(customCredentials.consumerSecret);
        }
      }
    }

    if (!customCredentials || !customCredentials.consumerKey) {
      throw new Error('KCB integration not configured for this workshop.');
    }

    const result = await initiateKcbStkPush(
      { phone, amount, reference }, 
      customCredentials,
      {
        customerName: req.body.customerName || 'Walk-in Customer',
        initiatorName: req.user.name || 'Staff',
        tenantName: provider.businessName || 'Business',
        tenantId: tenantId
      }
    );

    // Link the request ID to the Sale immediately if saleId provided
    if (req.body.saleId && result.CheckoutRequestID) {
      try {
        await db.query(`UPDATE sale SET mpesaRequestId = ? WHERE id = ? AND tenantId = ?`, [result.CheckoutRequestID, req.body.saleId, tenantId]);
        await db.query(`UPDATE payment SET mpesaRequestId = ? WHERE reference = ? AND tenantId = ?`, [result.CheckoutRequestID, req.body.saleId, tenantId]);
        console.log(`[KCB-LINK] Linked CheckoutRequestID ${result.CheckoutRequestID} to Sale ${req.body.saleId}`);
      } catch (linkErr) {
        console.error('[KCB-LINK] Failed to link CheckoutRequestID:', linkErr.message);
      }
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[SALES] KCB Push Error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};
