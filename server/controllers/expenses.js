import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

export const listExpenses = async (req, res) => {
  const { tenantId } = req.user;
  const { category, search, limit = 50, page = 1, sortBy = 'date', sortOrder = 'desc' } = req.query;
  try {
    const isStaff = req.user.role === 'STAFF';
    const { userId } = req.user;
    console.log(`[DEBUG] listExpenses: business=${req.user.businessName}, user=${req.user.name}, role=${req.user.role}`);

    let whereQuery = 'WHERE e.tenantId = ?';
    const queryParams = [tenantId];

    if (isStaff) {
      whereQuery += ' AND e.userId = ?';
      queryParams.push(userId);
    }

    if (category) { whereQuery += ' AND e.category = ?'; queryParams.push(category); }
    if (search) { whereQuery += ' AND e.description LIKE ?'; queryParams.push(`%${search}%`); }

    const offset = (Number(page) - 1) * Number(limit);

    const [expenses] = await db.query(`
      SELECT e.*, u.name as recordedBy 
      FROM expense e
      LEFT JOIN user u ON e.userId = u.id
      ${whereQuery} 
      ORDER BY e.${sortBy} ${sortOrder} 
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM expense e ${whereQuery}`, queryParams);
    const total = Number(countRes[0].total);
    const pages = Math.ceil(total / Number(limit));

    const [totalAgg] = await db.query(`SELECT SUM(e.amount) as total FROM expense e ${whereQuery}`, queryParams);
    
    // Get highest category
    const [categoryAgg] = await db.query(`
      SELECT e.category, SUM(e.amount) as total 
      FROM expense e
      ${whereQuery} 
      GROUP BY e.category 
      ORDER BY total DESC 
      LIMIT 1
    `, queryParams);

    const highestCategory = categoryAgg[0]?.category || 'N/A';

    // Calculate burn rate (avg daily spend this month)
    const [burnAgg] = await db.query(`
      SELECT SUM(e.amount) as total 
      FROM expense e
      ${whereQuery} 
      AND CONVERT_TZ(e.date, '+00:00', '+03:00') >= DATE_FORMAT(CONVERT_TZ(NOW(), '+00:00', '+03:00'), '%Y-%m-01')
    `, queryParams);
    
    const eatNow = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const daysSoFar = Math.max(1, eatNow.getUTCDate());
    const burnRate = Math.round((burnAgg[0]?.total || 0) / daysSoFar);

    return res.json({ 
      success: true,
      items: expenses,
      total,
      page: Number(page),
      pages,
      limit: Number(limit),
      stats: { 
        totalExpenses: Number(totalAgg[0].total || 0),
        highestCategory,
        burnRate
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

export const createExpense = async (req, res) => {
  const { tenantId, userId } = req.user;
  const data = req.body;
  const id = ulid();

  try {
    let expenseDate;
    if (data.date) {
      const [y, m, d] = data.date.split('-').map(Number);
      const now = new Date();
      const eatHour = (now.getUTCHours() + 3) % 24;
      const eatMinute = now.getUTCMinutes();
      const eatSecond = now.getUTCSeconds();
      const eatMs = now.getUTCMilliseconds();
      const utcTimestamp = Date.UTC(y, m - 1, d, eatHour, eatMinute, eatSecond, eatMs);
      expenseDate = new Date(utcTimestamp - 3 * 60 * 60 * 1000);
    } else {
      expenseDate = new Date();
    }

    await db.query(
      `INSERT INTO expense (id, tenantId, userId, category, description, amount, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [id, tenantId, userId, data.category, data.description, data.amount, expenseDate]
    );
    return res.json({ success: true, data: { expenseId: id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  const { tenantId, userId, role } = req.user;
  const { id } = req.params;
  try {
    let query = 'DELETE FROM expense WHERE id = ? AND tenantId = ?';
    const params = [id, tenantId];

    if (role === 'STAFF') {
      query += ' AND userId = ?';
      params.push(userId);
    }

    const [result] = await db.query(query, params);
    
    if (result.affectedRows === 0) {
      return res.status(403).json({ success: false, message: 'Unauthorized or record not found' });
    }

    return res.json({ success: true, data: { message: 'Expense deleted' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Delete failed' });
  }
};

// Only PROVIDER/OWNER can access full details of an expense, STAFF can only access their own expenses in list view, not details
export const getExpenseById = async (req, res) => {
  const { tenantId, userId, role } = req.user;
  const { id } = req.params;

  try {
    let query = 'SELECT e.*, u.name as recordedBy FROM expense e LEFT JOIN user u ON e.userId = u.id WHERE e.id = ? AND e.tenantId = ?';
    const params = [id, tenantId];

    if (role === 'STAFF') {
      query += ' AND e.userId = ?';
      params.push(userId);
    }

    const [expenses] = await db.query(query, params);

    if (expenses.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }

    return res.json({ success: true, data: expenses[0] });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch expense details' });
  }
};
