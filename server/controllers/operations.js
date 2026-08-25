import { db } from "../dbms/mysql.js";
import { v4 as uuidv4 } from "uuid";

// Get all operations for tenant (filtered by opType, status, resourceId)
export const getOperations = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { opType, status, resourceId } = req.query;

    let sql = `
      SELECT o.*, r.title as resourceTitle, r.type as resourceType, u.name as assignedUserName
      FROM operation o
      LEFT JOIN resource r ON o.resourceId = r.id
      LEFT JOIN user u ON o.assignedToUserId = u.id
      WHERE o.tenantId = ?
    `;
    const params = [tenantId];

    if (opType) {
      sql += " AND o.opType = ?";
      params.push(opType);
    }
    if (status) {
      sql += " AND o.status = ?";
      params.push(status);
    }
    if (resourceId) {
      sql += " AND o.resourceId = ?";
      params.push(resourceId);
    }

    sql += " ORDER BY o.createdAt DESC";

    const [rows] = await db.query(sql, params);

    const formatted = rows.map(r => ({
      ...r,
      meta: typeof r.meta === 'string' ? JSON.parse(r.meta) : (r.meta || {})
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching operations:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single operation details
export const getOperationById = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT o.*, r.title as resourceTitle, r.type as resourceType
       FROM operation o
       LEFT JOIN resource r ON o.resourceId = r.id
       WHERE o.id = ? AND o.tenantId = ?`,
      [id, tenantId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Operation not found" });
    }

    const op = rows[0];
    op.meta = typeof op.meta === 'string' ? JSON.parse(op.meta) : (op.meta || {});

    res.status(200).json({ success: true, data: op });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create operation (Cleaning task, Maintenance work order, Repair, Inspection)
export const createOperation = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { resourceId, opType, title, status, assignedToUserId, estimatedCost, meta } = req.body;

    if (!resourceId || !opType) {
      return res.status(400).json({ success: false, message: "resourceId and opType are required" });
    }

    const id = `op_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const opStatus = status || 'PENDING';
    const estCost = parseFloat(estimatedCost) || 0.00;
    
    // Store title inside meta if present
    const metaObj = meta || {};
    if (title) metaObj.title = title;
    const jsonMeta = JSON.stringify(metaObj);

    await db.query(
      `INSERT INTO operation (id, tenantId, resourceId, opType, status, assignedToUserId, estimatedCost, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tenantId, resourceId, opType, opStatus, assignedToUserId || null, estCost, jsonMeta]
    );

    // Update resource status if operation requires it (e.g. MAINTENANCE or CLEANING)
    if (opType === 'MAINTENANCE' || opType === 'REPAIR') {
      await db.query("UPDATE resource SET status = 'MAINTENANCE' WHERE id = ? AND tenantId = ?", [resourceId, tenantId]);
    } else if (opType === 'CLEANING') {
      await db.query("UPDATE resource SET status = 'CLEANING' WHERE id = ? AND tenantId = ?", [resourceId, tenantId]);
    }

    const [row] = await db.query("SELECT * FROM operation WHERE id = ?", [id]);
    const r = row[0];
    r.meta = typeof r.meta === 'string' ? JSON.parse(r.meta) : (r.meta || {});

    res.status(201).json({
      success: true,
      message: "Operation task created successfully",
      data: r
    });
  } catch (error) {
    console.error("Error creating operation:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update operation task & automatically record cost in Core Expense engine upon resolution
export const updateOperation = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId || req.user.id || null;
    const { id } = req.params;
    const { status, actualCost, assignedToUserId, meta } = req.body;

    const [existing] = await db.query("SELECT * FROM operation WHERE id = ? AND tenantId = ?", [id, tenantId]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: "Operation not found" });
    }

    const op = existing[0];
    const newStatus = status !== undefined ? status : op.status;
    const newCost = actualCost !== undefined ? parseFloat(actualCost) : op.actualCost;

    let currentMetaObj = {};
    if (typeof op.meta === 'string') {
      try { currentMetaObj = JSON.parse(op.meta || '{}'); } catch (_) {}
    } else if (op.meta && typeof op.meta === 'object') {
      currentMetaObj = op.meta;
    }

    if (meta !== undefined && typeof meta === 'object' && meta !== null) {
      currentMetaObj = { ...currentMetaObj, ...meta };
    }
    const finalMetaJson = JSON.stringify(currentMetaObj);

    let expenseId = op.expenseId;

    // If operation is marked COMPLETED and has an actualCost > 0, sync to Core Expense table!
    if (newStatus === 'COMPLETED' && newCost > 0 && !expenseId) {
      expenseId = `exp_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      const expenseTitle = currentMetaObj.title || `${op.opType} for Resource`;

      await db.query(
        `INSERT INTO expense (id, tenantId, userId, category, description, amount, date, createdAt)
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          expenseId,
          tenantId,
          userId,
          op.opType === 'CLEANING' ? 'Cleaning' : 'Repairs & Maintenance',
          expenseTitle,
          newCost
        ]
      );
    }

    await db.query(
      `UPDATE operation SET status = ?, actualCost = ?, assignedToUserId = ?, expenseId = ?, meta = ? WHERE id = ? AND tenantId = ?`,
      [newStatus, newCost, assignedToUserId || op.assignedToUserId, expenseId, finalMetaJson, id, tenantId]
    );

    // If operation completed (e.g. CLEANING or REPAIR completed), free up resource to AVAILABLE!
    if (newStatus === 'COMPLETED') {
      await db.query("UPDATE resource SET status = 'AVAILABLE' WHERE id = ? AND tenantId = ?", [op.resourceId, tenantId]);
    }

    res.status(200).json({
      success: true,
      message: "Operation updated successfully",
      data: {
        status: newStatus,
        actualCost: newCost,
        expenseId
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete operation
export const deleteOperation = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM operation WHERE id = ? AND tenantId = ?", [id, tenantId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Operation not found" });
    }

    res.status(200).json({ success: true, message: "Operation deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
