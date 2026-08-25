import { db } from "../dbms/mysql.js";
import { v4 as uuidv4 } from "uuid";

// Get all events for tenant (filtered by eventType, status, resourceId, dates)
export const getEvents = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { eventType, status, resourceId, customerId, startDate, endDate } = req.query;

    let sql = `
      SELECT e.*, r.title as resourceTitle, r.type as resourceType, c.name as customerName, c.phone as customerPhone
      FROM event e
      LEFT JOIN resource r ON e.resourceId = r.id
      LEFT JOIN user c ON e.customerId = c.id
      WHERE e.tenantId = ?
    `;
    const params = [tenantId];

    if (eventType) {
      sql += " AND e.eventType = ?";
      params.push(eventType);
    }
    if (status) {
      sql += " AND e.status = ?";
      params.push(status);
    }
    if (resourceId) {
      sql += " AND e.resourceId = ?";
      params.push(resourceId);
    }
    if (customerId) {
      sql += " AND e.customerId = ?";
      params.push(customerId);
    }
    if (startDate) {
      sql += " AND e.startTime >= ?";
      params.push(startDate);
    }
    if (endDate) {
      sql += " AND e.endTime <= ?";
      params.push(endDate);
    }

    sql += " ORDER BY e.startTime DESC, e.createdAt DESC";

    const [rows] = await db.query(sql, params);

    const formatted = rows.map(r => ({
      ...r,
      meta: typeof r.meta === 'string' ? JSON.parse(r.meta) : (r.meta || {})
    }));

    res.status(200).json({ success: true, data: formatted });
  } catch (error) {
    console.error("Error fetching events:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single event details
export const getEventById = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const [rows] = await db.query(
      `SELECT e.*, r.title as resourceTitle, r.type as resourceType, c.name as customerName, c.phone as customerPhone
       FROM event e
       LEFT JOIN resource r ON e.resourceId = r.id
       LEFT JOIN user c ON e.customerId = c.id
       WHERE e.id = ? AND e.tenantId = ?`,
      [id, tenantId]
    );

    if (!rows.length) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const event = rows[0];
    event.meta = typeof event.meta === 'string' ? JSON.parse(event.meta) : (event.meta || {});

    // Fetch linked Core payments
    const [payments] = await db.query(
      `SELECT * FROM payment WHERE referenceType = 'EVENT' AND referenceId = ? AND tenantId = ? ORDER BY createdAt DESC`,
      [id, tenantId]
    );

    res.status(200).json({
      success: true,
      data: {
        ...event,
        payments
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new event (Booking, Sale, Appointment, Rental) & integrate with Core Revenue
export const createEvent = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const {
      resourceId,
      customerId,
      guestName,
      guestPhone,
      eventType,
      status,
      startTime,
      endTime,
      totalAmount,
      paidAmount,
      paymentMethod,
      meta
    } = req.body;

    if (!resourceId || !eventType) {
      return res.status(400).json({ success: false, message: "resourceId and eventType are required" });
    }

    let linkedCustomerId = customerId;

    // Auto-create/sync guest or customer if guestName & guestPhone provided
    if (!linkedCustomerId && (guestName || guestPhone)) {
      const [existingCust] = await db.query(
        "SELECT id FROM user WHERE tenantId = ? AND role = 'CUSTOMER' AND (phone = ? OR name = ?)",
        [tenantId, guestPhone || '', guestName || '']
      );

      if (existingCust.length) {
        linkedCustomerId = existingCust[0].id;
      } else {
        linkedCustomerId = `cust_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
        await db.query(
          "INSERT INTO user (id, tenantId, name, phone, role, passwordHash, phoneVerified, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'CUSTOMER', '', 0, 1, NOW(), NOW())",
          [linkedCustomerId, tenantId, guestName || 'Guest', guestPhone || '']
        );
      }
    }

    const eventId = `evt_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    const eventStatus = status || 'CONFIRMED';
    const total = parseFloat(totalAmount) || 0;
    const paid = parseFloat(paidAmount) || 0;
    const balance = Math.max(0, total - paid);
    const jsonMeta = meta ? JSON.stringify(meta) : null;

    await db.query(
      `INSERT INTO event (id, tenantId, resourceId, customerId, eventType, status, startTime, endTime, totalAmount, paidAmount, balance, meta)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [eventId, tenantId, resourceId, linkedCustomerId || null, eventType, eventStatus, startTime || null, endTime || null, total, paid, balance, jsonMeta]
    );

    // If initial payment was made, create financial entry in Core Payment engine
    if (paid > 0) {
      const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      await db.query(
        `INSERT INTO payment (id, tenantId, amount, status, referenceType, referenceId, meta)
         VALUES (?, ?, ?, 1, 'EVENT', ?, ?)`,
        [
          paymentId,
          tenantId,
          paid,
          eventId,
          JSON.stringify({ customerId: linkedCustomerId || null, userId: userId || null, paymentMethod: paymentMethod || 'MPESA', eventType, resourceId, note: `Initial deposit for ${eventType}` })
        ]
      );
    }

    // Auto update resource status if event is active (e.g. check-in or occupied)
    if (eventStatus === 'CHECKED_IN' || eventStatus === 'OCCUPIED') {
      await db.query("UPDATE resource SET status = 'OCCUPIED' WHERE id = ? AND tenantId = ?", [resourceId, tenantId]);
    } else if (eventStatus === 'RESERVED' || eventStatus === 'CONFIRMED') {
      await db.query("UPDATE resource SET status = 'RESERVED' WHERE id = ? AND tenantId = ?", [resourceId, tenantId]);
    }

    const [eventRow] = await db.query("SELECT * FROM event WHERE id = ?", [eventId]);
    const result = eventRow[0];
    result.meta = typeof result.meta === 'string' ? JSON.parse(result.meta) : (result.meta || {});

    res.status(201).json({
      success: true,
      message: `${eventType} created successfully`,
      data: result
    });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Record subsequent payment against an event (e.g. deposit top-up or checkout balance settlement)
export const recordEventPayment = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    const { id } = req.params;
    const { amount, paymentMethod, notes } = req.body;

    const [events] = await db.query("SELECT * FROM event WHERE id = ? AND tenantId = ?", [id, tenantId]);
    if (!events.length) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const event = events[0];
    const paymentAmount = parseFloat(amount);
    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid payment amount is required" });
    }

    const newPaidAmount = parseFloat(event.paidAmount) + paymentAmount;
    const newBalance = Math.max(0, parseFloat(event.totalAmount) - newPaidAmount);

    // Update event paid & balance
    await db.query(
      "UPDATE event SET paidAmount = ?, balance = ? WHERE id = ? AND tenantId = ?",
      [newPaidAmount, newBalance, id, tenantId]
    );

    // Insert record in Core Payment table
    const paymentId = `pay_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
    await db.query(
      `INSERT INTO payment (id, tenantId, amount, status, referenceType, referenceId, meta)
       VALUES (?, ?, ?, 1, 'EVENT', ?, ?)`,
      [
        paymentId,
        tenantId,
        paymentAmount,
        id,
        JSON.stringify({ customerId: event.customerId || null, userId: userId || null, paymentMethod: paymentMethod || 'MPESA', notes: notes || 'Event payment topup', eventType: event.eventType })
      ]
    );

    res.status(200).json({
      success: true,
      message: "Payment recorded successfully",
      data: {
        paidAmount: newPaidAmount,
        balance: newBalance
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update event status (e.g., CONFIRMED -> CHECKED_IN -> CHECKED_OUT -> CANCELLED)
export const updateEventStatus = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;
    const { status } = req.body;

    const [events] = await db.query("SELECT * FROM event WHERE id = ? AND tenantId = ?", [id, tenantId]);
    if (!events.length) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    const event = events[0];
    await db.query("UPDATE event SET status = ? WHERE id = ? AND tenantId = ?", [status, id, tenantId]);

    // Handle automated resource state transitions
    if (status === 'CHECKED_OUT') {
      // Transition resource to CLEANING for housekeeping
      await db.query("UPDATE resource SET status = 'CLEANING' WHERE id = ? AND tenantId = ?", [event.resourceId, tenantId]);
    } else if (status === 'CANCELLED') {
      // Revert resource to AVAILABLE
      await db.query("UPDATE resource SET status = 'AVAILABLE' WHERE id = ? AND tenantId = ?", [event.resourceId, tenantId]);
    } else if (status === 'CHECKED_IN' || status === 'OCCUPIED') {
      await db.query("UPDATE resource SET status = 'OCCUPIED' WHERE id = ? AND tenantId = ?", [event.resourceId, tenantId]);
    }

    res.status(200).json({
      success: true,
      message: `Event status updated to ${status}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete event
export const deleteEvent = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM event WHERE id = ? AND tenantId = ?", [id, tenantId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    res.status(200).json({ success: true, message: "Event deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
