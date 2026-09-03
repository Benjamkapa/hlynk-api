import { db } from "../dbms/mysql.js";
import { ulid } from "ulid";
import { createNotification, createAdminNotification } from "./notifications.js";

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
              p.category, p.location, p.phone as providerPhone, p.businessName as providerName,
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
 * Public Order Submission Endpoint — no auth required.
 * Allows clients to submit an order or booking inquiry.
 * Also records as a pending sale for revenue/profit tracking.
 */
export const submitPublicOrder = async (req, res) => {
  const { slug, customerName, customerPhone, customerEmail, deliveryAddress, notes, items } = req.body;

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

    const totalAmount = items.reduce((acc, item) => acc + (Number(item.price || 0) * (Number(item.quantity || 1))), 0);

    const messageData = JSON.stringify({
      orderId,
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
      source: 'PUBLIC_LINK'
    });

    // 1. Insert into request table (order queue / notification)
    await db.query(
      `INSERT INTO request (id, tenantId, customerId, customerName, customerPhone, message, status, createdAt, updatedAt)
       VALUES (?, ?, NULL, ?, ?, ?, 'PENDING', NOW(), NOW())`,
      [orderId, tenantId, customerName.trim(), customerPhone.trim(), messageData]
    );

    // 2. Record as a pending sale so it flows into revenue reports
    try {
      const saleId = ulid();
      await db.query(
        `INSERT INTO sale (id, tenantId, userId, customerId, customerName, totalAmount, paymentMethod, status, source, createdAt, updatedAt)
         VALUES (?, ?, NULL, NULL, ?, ?, 'PENDING_ONLINE', 1, 'Online Store', NOW(), NOW())`,
        [saleId, tenantId, customerName.trim(), totalAmount]
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
    } catch (saleErr) {
      console.error('[PUBLIC ORDER] Sale recording skipped:', saleErr.message);
    }

    // 3. Send notification to tenant
    await createNotification({
      tenantId,
      title: `📦 New Order from ${customerName.trim()}`,
      message: `${customerName.trim()} (${customerPhone.trim()}) ordered ${items.length} item(s) — total KES ${totalAmount.toLocaleString()}`,
      type: "order",
      data: { url: "/dashboard/products" }
    });

    // 4. Send Web Push + In-App notification to Super Admin
    createAdminNotification({
      title: `🛒 Client Purchase: KES ${totalAmount.toLocaleString()}`,
      message: `${customerName.trim()} (${customerPhone.trim()}) bought ${items.length} item(s) from vendor '${tenantRows[0].businessName}'.`,
      type: 'order',
      relatedTenantId: tenantId,
      data: { url: '/admin/businesses' }
    }).catch(adminErr => console.error('[PUBLIC ORDER] Admin notification skipped:', adminErr.message));

    return res.status(201).json({
      success: true,
      message: "Order placed successfully! The business owner will contact you shortly.",
      data: { orderId, totalAmount }
    });
  } catch (err) {
    console.error("[PUBLIC ORDER] Error:", err);
    return res.status(500).json({ success: false, message: "Failed to submit order" });
  }
};


