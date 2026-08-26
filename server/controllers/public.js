import { db } from "../dbms/mysql.js";

/**
 * Public endpoint — no auth required.
 * Returns the business profile + available rooms/units for a given tenant slug.
 * Used by the public BnB/Stay listing page: /stay/:slug
 */
export const getPublicStayListing = async (req, res) => {
  const { slug } = req.params;

  try {
    // 1. Find tenant by slug
    const [tenantRows] = await db.query(
      `SELECT t.id, t.businessName, t.slug,
              p.category, p.location, p.businessName as providerName
       FROM tenant t
       LEFT JOIN provider p ON p.tenantId = t.id
       WHERE t.slug = ? AND t.isActive = 1
       LIMIT 1`,
      [slug]
    );

    if (!tenantRows.length) {
      return res.status(404).json({ success: false, message: "Listing not found or not active" });
    }

    const tenant = tenantRows[0];
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

    const formatted = resources.map((r) => ({
      ...r,
      meta: typeof r.meta === "string" ? JSON.parse(r.meta || "{}") : (r.meta || {}),
    }));

    // 3. Fetch property groups (parent resources) for display context
    const [properties] = await db.query(
      `SELECT id, title, meta FROM resource WHERE tenantId = ? AND type = 'PROPERTY'`,
      [tenantId]
    );

    const formattedProperties = properties.map((p) => ({
      id: p.id,
      title: p.title,
      meta: typeof p.meta === "string" ? JSON.parse(p.meta || "{}") : (p.meta || {}),
    }));

    return res.json({
      success: true,
      data: {
        businessName: tenant.businessName || tenant.providerName,
        category: tenant.category,
        location: tenant.location,
        slug: tenant.slug,
        properties: formattedProperties,
        rooms: formatted,
      },
    });
  } catch (err) {
    console.error("[PUBLIC STAY] Error:", err);
    return res.status(500).json({ success: false, message: "Failed to load listing" });
  }
};
