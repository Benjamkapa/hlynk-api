import { db } from "../dbms/mysql.js";
import { ulid } from "ulid";
import { createNotification, createAdminNotification } from "./notifications.js";
import { initiateStkPush, queryStkPush } from "../utils/mpesa.js";
import { decrypt } from "../utils/encryption.js";

/**
 * Public endpoint — no auth required.
 * Returns the business profile + available rooms/units + retail products + services for a given tenant slug.
 * Used by the public BnB/Stay and Shop listing pages: /stay/:slug and /shop/:slug
 */
export const getPublicStayListing = async (req, res) => {
  const { slug } = req.params;

  try {
    // 1. Find tenant by slug along with subscription details
    const [tenantRows] = await db.query(
      `SELECT t.id, t.businessName, t.slug, t.businessType,
              p.category, p.location, p.phone as providerPhone, p.businessName as providerName, p.operationalSettings,
              s.planName, s.status as subStatus, s.trialEndDate, s.endDate
       FROM tenant t
       LEFT JOIN provider p ON p.tenantId = t.id
       LEFT JOIN subscription s ON s.tenantId = t.id
       WHERE t.slug = ? AND (t.isActive = 1 OR t.isActive IS NULL)
       LIMIT 1`,
      [slug]
    );

    if (!tenantRows.length) {
      return res.status(404).json({ success: false, message: "Listing not found or not active" });
    }

    const tenant = tenantRows[0];

    // Check subscription plan & trial status
    const isTrial = Number(tenant.subStatus) === 2 || tenant.subStatus === 'TRIAL' || (tenant.trialEndDate && new Date(tenant.trialEndDate) >= new Date());
    const isBusinessPro = (Number(tenant.subStatus) === 0 || tenant.subStatus === 'ACTIVE') && tenant.planName === 'MAX';

    // Public Stay Booking (/stay/:slug) and Public Store / Shop Page (/store/:slug, /shop/:slug) are exclusively available for Business Pro subscribers or active Trial period.
    const isPublicRoute = req.originalUrl?.includes('/stay/') || req.path?.includes('/stay/') ||
      req.originalUrl?.includes('/shop/') || req.path?.includes('/shop/') ||
      req.originalUrl?.includes('/store/') || req.path?.includes('/store/');
    if (isPublicRoute && !isTrial && !isBusinessPro) {
      return res.status(403).json({
        success: false,
        isLocked: true,
        message: "Public Store/Shop and Stay Booking pages are exclusively available on the Business Pro plan or during an active trial period."
      });
    }

    const tenantId = tenant.id;

    // 2. Fetch available rooms/units (status = AVAILABLE only)
    const [resources] = await db.query(
      `SELECT id, type, title, code, parentId, basePrice, status, meta, createdAt
       FROM resource
       WHERE tenantId = ? AND type IN ('ROOM', 'UNIT', 'VEHICLE', 'SPACE')
         AND status = 'AVAILABLE'
       ORDER BY basePrice ASC`,
      [tenantId]
    );

    const formattedRooms = (resources || []).map((r) => ({
      ...r,
      meta: typeof r.meta === "string" ? JSON.parse(r.meta || "{}") : (r.meta || {}),
    }));

    // 3. Fetch property groups (parent resources)
    const [properties] = await db.query(
      `SELECT id, title, meta FROM resource WHERE tenantId = ? AND type = 'PROPERTY'`,
      [tenantId]
    );

    const formattedProperties = (properties || []).map((p) => ({
      id: p.id,
      title: p.title,
      meta: typeof p.meta === "string" ? JSON.parse(p.meta || "{}") : (p.meta || {}),
    }));

    // 4. Fetch retail products from `product` table
    const [dbProducts] = await db.query(
      `SELECT id, name, category, price, stockLevel, imageUrl, description, type
       FROM product
       WHERE tenantId = ? AND (isActive = 1 OR isActive IS NULL)
       ORDER BY category ASC, name ASC`,
      [tenantId]
    ).catch(() => [[]]);

    // 5. Fetch services from `service` table
    const [dbServices] = await db.query(
      `SELECT id, name, 'Services' as category, price, 999 as stockLevel, NULL as imageUrl, description, 'SERVICE' as type
       FROM service
       WHERE tenantId = ? AND (isActive = 1 OR isActive IS NULL)
       ORDER BY name ASC`,
      [tenantId]
    ).catch(() => [[]]);

    // 6. Fetch products/services from `resource` table if any exist there
    const [dbResourceProducts] = await db.query(
      `SELECT id, title as name, 'Inventory' as category, basePrice as price, 999 as stockLevel, meta, type
       FROM resource
       WHERE tenantId = ? AND type IN ('PRODUCT', 'GOOD', 'SERVICE', 'ITEM') AND status = 'AVAILABLE'`,
      [tenantId]
    ).catch(() => [[]]);

    const formattedResourceProds = (dbResourceProducts || []).map(r => {
      const meta = typeof r.meta === "string" ? JSON.parse(r.meta || "{}") : (r.meta || {});
      return {
        id: r.id,
        name: r.name,
        category: meta.category || "Inventory",
        price: Number(r.price || 0),
        stockLevel: meta.stockLevel || 999,
        imageUrl: meta.imageUrl || null,
        description: meta.description || null,
        type: r.type || "PRODUCT"
      };
    });

    // Combine all products, services, and inventory items
    const allProductsAndServices = [
      ...(dbProducts || []).map(p => ({ ...p, price: Number(p.price || 0) })),
      ...(dbServices || []).map(s => ({ ...s, price: Number(s.price || 0) })),
      ...formattedResourceProds
    ];

    // Determine if M-Pesa payment gateway is configured specifically by this merchant
    let hasMpesaGateway = false;
    if (tenant.operationalSettings) {
      try {
        const ops = typeof tenant.operationalSettings === "string"
          ? JSON.parse(tenant.operationalSettings)
          : tenant.operationalSettings;
        const env = ops.mpesa?.env || "sandbox";
        const mpesa = ops.mpesa?.[env] || ops.mpesa?.production || ops.mpesa?.sandbox;
        if (mpesa && mpesa.consumerKey && mpesa.consumerKey.trim() !== "") {
          hasMpesaGateway = true;
        }
      } catch (e) {
        hasMpesaGateway = false;
      }
    }

    return res.json({
      success: true,
      data: {
        tenantId: tenant.id,
        businessName: tenant.businessName || tenant.providerName,
        category: tenant.category,
        location: tenant.location,
        phone: tenant.providerPhone,
        slug: tenant.slug,
        businessType: tenant.businessType,
        hasMpesaGateway: Boolean(hasMpesaGateway),
        properties: formattedProperties,
        rooms: formattedRooms,
        products: allProductsAndServices,
      },
    });
  } catch (err) {
    console.error("[PUBLIC STAY/SHOP] Error:", err);
    return res.status(500).json({ success: false, message: "Failed to load listing" });
  }
};


/**
 * Public STK Push Trigger — no auth required.
 * Allows storefront end-customers to trigger an M-Pesa STK Push prompt to their phone.
 */
export const publicMpesaStkPush = async (req, res) => {
  const { slug, phone, amount, customerName } = req.body;

  if (!slug || !phone || !amount) {
    return res.status(400).json({ success: false, message: "Missing required details (slug, phone, or amount)" });
  }

  try {
    const [tenantRows] = await db.query(
      `SELECT t.id, t.businessName, p.operationalSettings
       FROM tenant t
       LEFT JOIN provider p ON p.tenantId = t.id
       WHERE t.slug = ? AND (t.isActive = 1 OR t.isActive IS NULL)
       LIMIT 1`,
      [slug]
    );

    if (!tenantRows.length) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    const tenant = tenantRows[0];
    const tenantId = tenant.id;

    // ── Read & decrypt tenant's M-Pesa credentials ──
    let customCredentials = null;
    let isRented = false;
    if (tenant.operationalSettings) {
      try {
        const ops = typeof tenant.operationalSettings === "string"
          ? JSON.parse(tenant.operationalSettings)
          : tenant.operationalSettings;

        const env = ops.mpesa?.env || 'sandbox';
        const mpesa = ops.mpesa?.[env];

        if (mpesa && mpesa.consumerKey && mpesa.consumerKey.trim() !== '') {
          customCredentials = { ...mpesa, env };
          if (customCredentials.consumerKey?.includes(':')) {
            try { customCredentials.consumerKey = decrypt(customCredentials.consumerKey); } catch (_) { }
          }
          if (customCredentials.consumerSecret?.includes(':')) {
            try { customCredentials.consumerSecret = decrypt(customCredentials.consumerSecret); } catch (_) { }
          }
          if (customCredentials.passkey?.includes(':')) {
            try { customCredentials.passkey = decrypt(customCredentials.passkey); } catch (_) { }
          }
        }
      } catch (opsErr) {
        console.warn('[PUBLIC MPESA PUSH] Operational settings parse warning:', opsErr.message);
      }
    }

    if (!customCredentials || !customCredentials.consumerKey || !customCredentials.consumerSecret) {
      customCredentials = null;
      isRented = true;
    }

    // Use provided reference (saleId from frontend) so the Safaricom callback can reconcile
    const reference = req.body.reference || req.body.saleId || `PUB-${ulid().slice(-8)}`;

    const result = await initiateStkPush(
      { phone, amount, reference },
      customCredentials,
      {
        customerName: customerName || 'Store Customer',
        initiatorName: customerName || 'Store Customer',
        tenantName: tenant.businessName,
        tenantId,
        isRented
      }
    );

    // CRITICAL: Link CheckoutRequestID back to sale, payment & request records (same as vendorMpesaPush)
    const saleId = req.body.saleId || req.body.reference || null;
    if (saleId && result.CheckoutRequestID) {
      try {
        await db.query(`UPDATE sale SET mpesaRequestId = ? WHERE id = ? AND tenantId = ?`, [result.CheckoutRequestID, saleId, tenantId]);
        await db.query(`UPDATE payment SET mpesaRequestId = ? WHERE reference = ? AND tenantId = ?`, [result.CheckoutRequestID, saleId, tenantId]);
        const [reqs] = await db.query(`SELECT id, message FROM request WHERE (message LIKE ? OR id = ?) AND tenantId = ? LIMIT 1`, [`%${saleId}%`, saleId, tenantId]);
        if (reqs.length > 0) {
          try {
            const parsed = JSON.parse(reqs[0].message);
            parsed.checkoutRequestId = result.CheckoutRequestID;
            await db.query(`UPDATE request SET message = ? WHERE id = ?`, [JSON.stringify(parsed), reqs[0].id]);
          } catch (_) {}
        }
        // console.log(`[PUBLIC-STK-LINK] Linked CheckoutRequestID ${result.CheckoutRequestID} to Sale ${saleId}`);
      } catch (linkErr) {
        // console.error('[PUBLIC-STK-LINK] Failed to link CheckoutRequestID:', linkErr.message);
      }
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error("[PUBLIC MPESA PUSH] Error:", err);
    return res.status(400).json({ success: false, message: err.message || "Failed to initiate M-Pesa push prompt" });
  }
};

/**
 * Public Order Submission Endpoint — no auth required.
 * Allows clients to submit an order or booking inquiry.
 * Also records as a pending sale for revenue/profit tracking.
 */
export const submitPublicOrder = async (req, res) => {
  const {
    slug,
    customerName,
    customerPhone,
    customerEmail,
    deliveryAddress,
    notes,
    items,
    paymentOption = "PAY_ON_DELIVERY",
    checkoutRequestId
  } = req.body;

  if (!slug || !customerName || !customerPhone || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Please provide your name, phone number, and at least one item to order.",
    });
  }

  try {
    const [tenantRows] = await db.query(
      `SELECT t.id, t.businessName, s.planName, s.status as subStatus, s.trialEndDate
       FROM tenant t
       LEFT JOIN subscription s ON s.tenantId = t.id
       WHERE t.slug = ? AND (t.isActive = 1 OR t.isActive IS NULL)
       LIMIT 1`,
      [slug]
    );
    if (!tenantRows.length) {
      return res.status(404).json({ success: false, message: "Business not found" });
    }

    const tenant = tenantRows[0];
    const isTrial = Number(tenant.subStatus) === 2 || tenant.subStatus === 'TRIAL' || (tenant.trialEndDate && new Date(tenant.trialEndDate) >= new Date());
    const isBusinessPro = (Number(tenant.subStatus) === 0 || tenant.subStatus === 'ACTIVE') && tenant.planName === 'MAX';

    if (!isTrial && !isBusinessPro) {
      return res.status(403).json({
        success: false,
        isLocked: true,
        message: "Public Store and Stay ordering is exclusively available for Business Pro plan subscribers or during an active trial period."
      });
    }

    const tenantId = tenant.id;
    const orderId = ulid();
    const saleId = ulid();

    const totalAmount = items.reduce((acc, item) => acc + (Number(item.price || 0) * (Number(item.quantity || 1))), 0);

    const messageData = JSON.stringify({
      orderId,
      saleId,
      items: items.map(i => ({
        id: i.id,
        name: i.name || i.title,
        price: Number(i.price || 0),
        quantity: Number(i.quantity || 1),
        type: i.type || 'PRODUCT'
      })),
      totalAmount,
      deliveryAddress: deliveryAddress || null,
      notes: notes || null,
      customerEmail: customerEmail || null,
      paymentOption,
      paymentMethod: paymentOption === 'PAY_UPFRONT' ? 'ONLINE_MPESA' : 'CASH_ON_DELIVERY',
      checkoutRequestId: checkoutRequestId || null,
      source: 'PUBLIC_LINK'
    });

    // 0. Auto-create or resolve customer record in `user` table so they appear in Customer management
    let customerId = null;
    if (customerPhone) {
      const trimmedPhone = customerPhone.trim();
      const trimmedName = customerName.trim();
      const trimmedEmail = customerEmail ? customerEmail.trim() : null;

      try {
        const [existing] = await db.query(
          `SELECT id, name FROM user WHERE phone = ? AND tenantId = ? LIMIT 1`,
          [trimmedPhone, tenantId]
        );

        if (existing.length > 0) {
          customerId = existing[0].id;
        } else {
          const [globalExisting] = await db.query(
            `SELECT id, name FROM user WHERE phone = ? LIMIT 1`,
            [trimmedPhone]
          );
          if (globalExisting.length > 0) {
            customerId = globalExisting[0].id;
          } else {
            customerId = ulid();
            await db.query(
              `INSERT INTO user (id, tenantId, name, phone, email, role, passwordHash, phoneVerified, isActive, createdAt, updatedAt) 
               VALUES (?, ?, ?, ?, ?, 'CUSTOMER', '', 0, 1, NOW(), NOW())`,
              [customerId, tenantId, trimmedName, trimmedPhone, trimmedEmail]
            );
          }
        }
      } catch (custErr) {
        console.error('[PUBLIC ORDER] Customer resolution warning:', custErr.message);
      }
    }

    // 1. Insert into request table (order queue / notification)
    await db.query(
      `INSERT INTO request (id, tenantId, customerId, customerName, customerPhone, message, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, 'PENDING', NOW(), NOW())`,
      [orderId, tenantId, customerId, customerName.trim(), customerPhone.trim(), messageData]
    );

    // 2. Record as a sale so it flows into revenue reports and customer transaction history
    const dbPaymentMethod = paymentOption === 'PAY_UPFRONT' ? 'ONLINE_MPESA' : 'CASH_ON_DELIVERY';
    const saleStatus = paymentOption === 'PAY_UPFRONT' ? 2 : 1; // 2 = Pending Payment (M-Pesa STK), 1 = Pay on Delivery

    try {
      await db.query(
        `INSERT INTO sale (id, tenantId, userId, customerId, customerName, totalAmount, paymentMethod, status, mpesaRequestId, source, createdAt, updatedAt)
           VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, 'Online Store', NOW(), NOW())`,
        [saleId, tenantId, customerId, customerName.trim(), totalAmount, dbPaymentMethod, saleStatus, checkoutRequestId || null]
      );

      for (const item of items) {
        try {
          await db.query(
            `INSERT INTO saleitem (id, saleId, productId, name, quantity, price, buyingPrice) VALUES (?, ?, ?, ?, ?, ?, 0)`,
            [ulid(), saleId, item.id || null, item.name || item.title || 'Item', Number(item.quantity || 1), Number(item.price || 0)]
          );
        } catch (itemErr) {
          if (itemErr.code === 'ER_BAD_FIELD_ERROR') {
            await db.query(
              `INSERT INTO saleitem (id, saleId, productId, name, quantity, price) VALUES (?, ?, ?, ?, ?, ?)`,
              [ulid(), saleId, item.id || null, item.name || item.title || 'Item', Number(item.quantity || 1), Number(item.price || 0)]
            );
          }
        }
      }

      // Record in Master Payment Table (matching createSale pattern in sales.js)
      if (paymentOption === 'PAY_UPFRONT' || checkoutRequestId) {
        try {
          let isRented = 0;
          if (checkoutRequestId) {
            const [log] = await db.query(`SELECT isRented FROM mpesalog WHERE checkoutRequestId = ? LIMIT 1`, [checkoutRequestId]);
            if (log.length > 0) isRented = log[0].isRented;
          }

          await db.query(`
              INSERT INTO payment (id, tenantId, amount, status, reference, mpesaRequestId, transactionType, isRented, createdAt)
              VALUES (?, ?, ?, ?, ?, ?, 'SALE', ?, NOW())
            `, [ulid(), tenantId, totalAmount, saleStatus, saleId, checkoutRequestId || null, isRented]);
        } catch (payErr) {
          console.error('[PUBLIC ORDER] Master payment link warning:', payErr.message);
        }
      }
    } catch (saleErr) {
      console.error('[PUBLIC ORDER] Sale recording skipped:', saleErr.message);
    }

    // 3. Send notification to tenant & Super Admin ONLY IF Pay on Delivery
    // For Pay Upfront (M-Pesa STK), notification is deferred until STK push callback completes (Success, Cancelled, or Failed)
    if (paymentOption !== 'PAY_UPFRONT') {
      const payLabel = 'Pay on Delivery / Arrival';

      await createNotification({
        tenantId,
        title: `📦 New Order (${payLabel}) from ${customerName.trim()}`,
        message: `${customerName.trim()} (${customerPhone.trim()}) ordered ${items.length} item(s) — total KES ${totalAmount.toLocaleString()} [${payLabel}]`,
        type: "order",
        data: { url: "/dashboard/products" }
      });

      createAdminNotification({
        title: `🛒 Client Purchase: KES ${totalAmount.toLocaleString()} (Pay on Delivery)`,
        message: `${customerName.trim()} (${customerPhone.trim()}) bought ${items.length} item(s) from vendor '${tenantRows[0].businessName}'. Payment: ${payLabel}.`,
        type: 'order',
        relatedTenantId: tenantId,
        data: { url: '/admin/businesses' }
      }).catch(adminErr => console.error('[PUBLIC ORDER] Admin notification skipped:', adminErr.message));
    }

    return res.status(201).json({
      success: true,
      message: "Order placed successfully! The business owner will contact you shortly.",
      data: { orderId, saleId, totalAmount, paymentOption, checkoutRequestId }
    });
  } catch (err) {
    console.error("[PUBLIC ORDER] Error:", err);
    return res.status(500).json({ success: false, message: "Failed to submit order" });
  }
};

/**
 * Public Order Status Check — no auth required.
 * Allows public storefronts (StayPage / StorePage) to poll real-time status of an order/sale.
 */
export const getPublicOrderStatus = async (req, res) => {
  const { saleId } = req.params;
  try {
    const [sales] = await db.query(
      `SELECT id, status, mpesaReceipt, paymentMethod, totalAmount, createdAt, mpesaRequestId FROM sale WHERE id = ? OR mpesaRequestId = ? LIMIT 1`,
      [saleId, saleId]
    );
    if (!sales.length) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }
    const sale = sales[0];
    let status = sale.status;
    let mpesaReceipt = sale.mpesaReceipt;

    // Active STK Push status check: If status is still PENDING_STK (2) and checkoutRequestId exists
    if (status === 2 && sale.mpesaRequestId) {
      try {
        const queryRes = await queryStkPush(sale.mpesaRequestId);
        if (queryRes && queryRes.ResultCode !== undefined) {
          const resultCode = String(queryRes.ResultCode);
          const resultDesc = String(queryRes.ResultDesc || '');

          if (resultCode === '0') {
            // Explicit Success: Customer entered correct PIN
            status = 0; // PAID
            mpesaReceipt = queryRes.MpesaReceiptNumber || sale.mpesaRequestId;
            await db.query(`UPDATE sale SET status = 0, mpesaReceipt = ?, updatedAt = NOW() WHERE id = ?`, [mpesaReceipt, sale.id]);
            await db.query(`UPDATE payment SET status = 0, mpesaReceipt = ?, updatedAt = NOW() WHERE reference = ? OR mpesaRequestId = ?`, [mpesaReceipt, sale.id, sale.mpesaRequestId]);
            await db.query(`UPDATE request SET status = 'CONFIRMED', updatedAt = NOW() WHERE message LIKE ? OR id = ?`, [`%${sale.id}%`, sale.id]);
          } else if (resultCode === '1032' || resultDesc.toLowerCase().includes('cancel')) {
            // Explicit User Cancellation on phone
            status = 3; // CANCELLED
            await db.query(`UPDATE sale SET status = 3, updatedAt = NOW() WHERE id = ?`, [sale.id]);
            await db.query(`UPDATE payment SET status = 3, updatedAt = NOW() WHERE reference = ? OR mpesaRequestId = ?`, [sale.id, sale.mpesaRequestId]);
            await db.query(`UPDATE request SET status = 'CANCELLED', updatedAt = NOW() WHERE message LIKE ? OR id = ?`, [`%${sale.id}%`, sale.id]);
          } else if (resultCode === '2001' || resultDesc.toLowerCase().includes('wrong pin') || resultDesc.toLowerCase().includes('invalid pin')) {
            // Explicit Invalid PIN error
            status = 4; // FAILED
            await db.query(`UPDATE sale SET status = 4, updatedAt = NOW() WHERE id = ?`, [sale.id]);
            await db.query(`UPDATE payment SET status = 4, updatedAt = NOW() WHERE reference = ? OR mpesaRequestId = ?`, [sale.id, sale.mpesaRequestId]);
            await db.query(`UPDATE request SET status = 'FAILED', updatedAt = NOW() WHERE message LIKE ? OR id = ?`, [`%${sale.id}%`, sale.id]);
          }
          // Note: "The transaction is being processed", code 500.001.1001, 1037 (Timeout), 1, etc.
          // are IN-PROGRESS states — keep status as 2 (PENDING_STK) so polling continues!
        }
      } catch (qErr) {
        // Query in-progress / API error — keep status as 2 (PENDING_STK) and do not fail prematurely
        console.log('[PUBLIC ORDER STATUS] STK in-progress check:', qErr.message);
      }
    }

    const statusMap = { 0: 'PAID', 1: 'PENDING_DELIVERY', 2: 'PENDING_STK', 3: 'CANCELLED', 4: 'FAILED' };
    return res.json({
      success: true,
      data: {
        id: sale.id,
        status: status,
        statusLabel: statusMap[status] || 'UNKNOWN',
        mpesaReceipt: mpesaReceipt,
        paymentMethod: sale.paymentMethod,
        totalAmount: sale.totalAmount
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};


