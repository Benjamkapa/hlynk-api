import { db } from '../dbms/mysql.js';

export const getSystemStats = async (req, res) => {
  try {
    const [providersCount] = await db.query(`SELECT COUNT(*) as total FROM Tenant`);
    const [payingProviders] = await db.query(`SELECT COUNT(*) as total FROM Subscription WHERE status = 'ACTIVE'`);
    const [totalRevenue] = await db.query(`SELECT SUM(amount) as total FROM Payment WHERE status = 'PAID'`);
    
    return res.json({
      success: true,
      data: {
        overview: {
          totalProviders: Number(providersCount[0].total),
          payingProviders: Number(payingProviders[0].total),
        },
        revenue: {
          total: Number(totalRevenue[0].total || 0),
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch system stats' });
  }
};

export const listTenants = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const [tenants] = await db.query(`
      SELECT t.*, s.planName, s.status as subscriptionStatus
      FROM Tenant t
      LEFT JOIN Subscription s ON t.id = s.tenantId
      ORDER BY t.createdAt DESC
      LIMIT ? OFFSET ?
    `, [Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM Tenant`);
    const total = Number(countRes[0].total);

    return res.json({ 
      success: true, 
      data: {
        tenants, 
        pagination: { total, pages: Math.ceil(total / Number(limit)), page: Number(page), limit: Number(limit) } 
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch tenants' });
  }
};

export const getSystemHealth = async (req, res) => {
  try {
    const start = Date.now();
    await db.query(`SELECT 1`);
    const dbLatency = Date.now() - start;

    return res.json({
      success: true,
      data: {
        status: 'Healthy',
        dbLatency: `${dbLatency}ms`,
        uptime: process.uptime(),
        memoryUsage: `${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`
      }
    });
  } catch (err) {
    return res.json({ success: true, data: { status: 'Degraded', message: 'Database connection issue' } });
  }
};
