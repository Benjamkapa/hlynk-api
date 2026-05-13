import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

export const listExpenses = async (req, res) => {
  const { tenantId } = req.user;
  const { category, search, limit = 50, page = 1, sortBy = 'date', sortOrder = 'desc' } = req.query;

  try {
    let whereQuery = 'WHERE tenantId = ?';
    const queryParams = [tenantId];

    if (category) { whereQuery += ' AND category = ?'; queryParams.push(category); }
    if (search) { whereQuery += ' AND description LIKE ?'; queryParams.push(`%${search}%`); }

    const offset = (Number(page) - 1) * Number(limit);

    const [expenses] = await db.query(`
      SELECT * FROM Expense 
      ${whereQuery} 
      ORDER BY ${sortBy} ${sortOrder} 
      LIMIT ? OFFSET ?
    `, [...queryParams, Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM Expense ${whereQuery}`, queryParams);
    const total = Number(countRes[0].total);

    const [totalAgg] = await db.query(`SELECT SUM(amount) as total FROM Expense WHERE tenantId = ?`, [tenantId]);
    
    return res.json({ 
      success: true,
      items: expenses,
      total,
      page: Number(page),
      limit: Number(limit),
      stats: { totalExpenses: Number(totalAgg[0].total || 0) }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
};

export const createExpense = async (req, res) => {
  const { tenantId } = req.user;
  const data = req.body;
  const id = ulid();

  try {
    await db.query(
      `INSERT INTO Expense (id, tenantId, category, description, amount, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [id, tenantId, data.category, data.description, data.amount, data.date ? new Date(data.date) : new Date()]
    );
    return res.json({ success: true, data: { expenseId: id } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  const { tenantId } = req.user;
  const { id } = req.params;
  try {
    await db.query(`DELETE FROM Expense WHERE id = ? AND tenantId = ?`, [id, tenantId]);
    return res.json({ success: true, data: { message: 'Expense deleted' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Delete failed' });
  }
};
