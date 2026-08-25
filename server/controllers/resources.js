import { db } from "../dbms/mysql.js";
import { v4 as uuidv4 } from "uuid";

// Get all resources for provider/tenant (filtered by type/status optional)
export const getResources = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { type, status, parentId } = req.query;

    let sql = "SELECT * FROM resource WHERE tenantId = ?";
    const params = [tenantId];

    if (type) {
      sql += " AND type = ?";
      params.push(type);
    }
    if (status) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (parentId) {
      sql += " AND parentId = ?";
      params.push(parentId);
    }

    sql += " ORDER BY title ASC";

    const [rows] = await db.query(sql, params);

    // Parse JSON meta field
    const formatted = rows.map(r => ({
      ...r,
      meta: typeof r.meta === 'string' ? JSON.parse(r.meta) : (r.meta || {})
    }));

    res.status(200).json({
      success: true,
      data: formatted
    });
  } catch (error) {
    console.error("Error fetching resources:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single resource by ID
export const getResourceById = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const [rows] = await db.query(
      "SELECT * FROM resource WHERE id = ? AND tenantId = ?",
      [id, tenantId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const r = rows[0];
    r.meta = typeof r.meta === 'string' ? JSON.parse(r.meta) : (r.meta || {});

    res.status(200).json({ success: true, data: r });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create a new resource (Room, Product, Vehicle, Chair, Service, etc.)
export const createResource = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { type, title, code, parentId, basePrice, status, meta } = req.body;

    if (!type || !title) {
      return res.status(400).json({ success: false, message: "Type and Title are required" });
    }

    const id = `res_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const resourceStatus = status || 'AVAILABLE';
    const jsonMeta = meta ? JSON.stringify(meta) : null;

    await db.query(
      `INSERT INTO resource (id, tenantId, type, title, code, parentId, basePrice, status, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, type, title, code || null, parentId || null, basePrice || 0.00, resourceStatus, jsonMeta]
    );

    const [newRow] = await db.query("SELECT * FROM resource WHERE id = ?", [id]);
    const r = newRow[0];
    r.meta = typeof r.meta === 'string' ? JSON.parse(r.meta) : (r.meta || {});

    res.status(201).json({
      success: true,
      message: "Resource created successfully",
      data: r
    });
  } catch (error) {
    console.error("Error creating resource:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update existing resource
export const updateResource = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { title, code, parentId, basePrice, status, meta } = req.body;

    const [existing] = await db.query(
      "SELECT * FROM resource WHERE id = ? AND tenantId = ?",
      [id, tenantId]
    );

    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    const updatedTitle = title !== undefined ? title : existing[0].title;
    const updatedCode = code !== undefined ? code : existing[0].code;
    const updatedParentId = parentId !== undefined ? parentId : existing[0].parentId;
    const updatedBasePrice = basePrice !== undefined ? basePrice : existing[0].basePrice;
    const updatedStatus = status !== undefined ? status : existing[0].status;
    
    let currentMetaObj = {};
    if (typeof existing[0].meta === 'string') {
      try { currentMetaObj = JSON.parse(existing[0].meta || '{}'); } catch (_) {}
    } else if (existing[0].meta && typeof existing[0].meta === 'object') {
      currentMetaObj = existing[0].meta;
    }

    if (meta !== undefined && typeof meta === 'object' && meta !== null) {
      currentMetaObj = { ...currentMetaObj, ...meta };
    }
    const finalMetaJson = JSON.stringify(currentMetaObj);

    await db.query(
      `UPDATE resource 
       SET title = ?, code = ?, parentId = ?, basePrice = ?, status = ?, meta = ?
       WHERE id = ? AND tenantId = ?`,
      [updatedTitle, updatedCode, updatedParentId, updatedBasePrice, updatedStatus, finalMetaJson, id, tenantId]
    );

    const [updatedRow] = await db.query("SELECT * FROM resource WHERE id = ?", [id]);
    const r = updatedRow[0];
    r.meta = typeof r.meta === 'string' ? JSON.parse(r.meta || '{}') : (r.meta || {});

    res.status(200).json({
      success: true,
      message: "Resource updated successfully",
      data: r
    });
  } catch (error) {
    console.error("Error updating resource:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete resource
export const deleteResource = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const [result] = await db.query(
      "DELETE FROM resource WHERE id = ? AND tenantId = ?",
      [id, tenantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Resource not found" });
    }

    res.status(200).json({
      success: true,
      message: "Resource deleted successfully"
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
