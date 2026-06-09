import { db } from '../dbms/mysql.js';
import { minioClient, bucketName } from '../utils/storage.js';
import { initiateB2C } from '../utils/mpesa.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ulid } from 'ulid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, '../configs/params.json'), 'utf8'));
const JWT_SECRET = params.jwt_secret || 'default_secret';
const REFRESH_SECRET = (params.refresh_secret || JWT_SECRET) + '_refresh';
const JWT_EXPIRES_IN = '15m'; 
const IS_PROD = params.env !== 'LOCAL';
export const getSystemStats = async (req, res) => {
  try {
    const [providersCount] = await db.query(`SELECT COUNT(*) as total FROM tenant`);
    const [payingProviders] = await db.query(`SELECT COUNT(*) as total FROM subscription WHERE status = 0`);
    const [totalRevenue] = await db.query(`SELECT SUM(amount) as total FROM payment WHERE status = 0`);
    
    // Add global platform volume
    const [platformVolume] = await db.query(`SELECT SUM(totalAmount) as total FROM sale WHERE status = 0`);
    const [mpesaCollections] = await db.query(`SELECT SUM(totalAmount) as total FROM sale WHERE paymentMethod = 'MPESA' AND status = 0`);
    
    // New exact data fetches for Financials Page
    const [ytdVolumeRes] = await db.query(`SELECT SUM(totalAmount) as total FROM sale WHERE status = 0 AND YEAR(createdAt) = YEAR(NOW())`);
    
    // NEW: Payouts for Rented Paybills (Status 0 = Success, payoutStatus 0 = Unpaid)
    const [pendingPayouts] = await db.query(`SELECT SUM(amount) as total FROM payment WHERE isRented = 1 AND status = 0 AND payoutStatus = 0`);
    
    const [newProvidersToday] = await db.query(`SELECT COUNT(*) as total FROM tenant WHERE DATE(createdAt) = CURDATE()`);
    const [expiringSoonRes] = await db.query(`SELECT COUNT(*) as total FROM subscription WHERE status = 0 AND endDate BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 7 DAY)`);
    
    // Check if any payout is "old" (more than 7 days)
    const [overduePayouts] = await db.query(`SELECT COUNT(*) as cnt FROM payment WHERE isRented = 1 AND status = 0 AND payoutStatus = 0 AND createdAt <= DATE_SUB(NOW(), INTERVAL 7 DAY)`);
    
    // NEW: Security markers for Forensic Audit
    const [failedLogins] = await db.query(`SELECT COUNT(*) as total FROM activitylog WHERE action LIKE '%Failed%' OR action LIKE '%Unauthorized%'`);
    const [securityAlerts] = await db.query(`SELECT COUNT(*) as total FROM activitylog WHERE logName = 'Security' OR logName = 'SafeGuard'`);
    const activeProtocolsCount = 12; // Static or derived from system settings
    
    const activeAlerts = [];
    if (Number(pendingPayouts[0].total || 0) > 1000) {
      activeAlerts.push({
        id: 'payout-pending',
        type: 'FINANCIAL',
        severity: 'URGENT',
        message: `Total pending payouts for rented paybills stands at KES ${Number(pendingPayouts[0].total).toLocaleString()}.`
      });
    }
    if (overduePayouts[0].cnt > 0) {
      activeAlerts.push({
        id: 'payout-overdue',
        type: 'FINANCIAL',
        severity: 'CRITICAL',
        message: `${overduePayouts[0].cnt} transactions are overdue for payout (more than 7 days).`
      });
    }

    // Trends: fallback to a default zero array if no data
    const timeframe = req.query.timeframe || 'HOURLY';
    let trendsQuery = '';
    if (timeframe === 'HOURLY') {
      trendsQuery = `
        SELECT DATE_FORMAT(createdAt, '%H:00') as name, SUM(amount) as value 
        FROM payment 
        WHERE status = 0 AND createdAt >= NOW() - INTERVAL 24 HOUR
        GROUP BY name ORDER BY name ASC
      `;
    } else {
      trendsQuery = `
        SELECT DATE_FORMAT(createdAt, '%b %d') as name, SUM(amount) as value 
        FROM payment 
        WHERE status = 0 AND createdAt >= NOW() - INTERVAL 28 DAY
        GROUP BY name ORDER BY MIN(createdAt) ASC
      `;
    }
    const [trendRows] = await db.query(trendsQuery);
    
    // Ensure the graph is never blank plain, give it zero fallback values if completely empty
    let revenueTrend = trendRows;
    if (revenueTrend.length === 0) {
      if (timeframe === 'HOURLY') {
        revenueTrend = Array.from({length: 6}).map((_, i) => ({ name: `${(new Date().getHours() - (5-i) + 24) % 24}:00`, value: 0 }));
      } else {
        revenueTrend = Array.from({length: 7}).map((_, i) => {
           let d = new Date(); d.setDate(d.getDate() - (6-i));
           return { name: d.toLocaleDateString('en-US', {month:'short', day:'numeric'}), value: 0 };
        });
      }
    }

    // Weekly Growth Trajectory (8 Weeks)
    const [weeklyGrowthRes] = await db.query(`
      SELECT 
        CONCAT('W', WEEK(createdAt)) as name, 
        COUNT(*) as value 
      FROM tenant 
      WHERE createdAt >= NOW() - INTERVAL 8 WEEK
      GROUP BY name 
      ORDER BY MIN(createdAt) ASC
    `);

    let weeklyGrowth = weeklyGrowthRes;
    if (weeklyGrowth.length === 0) {
      weeklyGrowth = Array.from({length: 8}).map((_, i) => ({
        name: `W${i+1}`,
        value: 0
      }));
    }

    // Recent Transactions (Global Ledger)
    const [recentTransactions] = await db.query(`
      SELECT transactionType as type, id, amount, status, createdAt as time, tenantId
      FROM payment 
      ORDER BY createdAt DESC LIMIT 50
    `);

    // Populate with dummy entity names since we didn't join
    const enrichedTx = await Promise.all(recentTransactions.map(async (tx) => {
      const [t] = await db.query(`SELECT businessName, slug FROM tenant WHERE id = ? LIMIT 1`, [tx.tenantId]);
      return {
        id: tx.id,
        businessName: t.length > 0 ? t[0].businessName : 'Unknown',
        user: t.length > 0 ? t[0].slug : 'system',
        type: tx.type,
        status: tx.status,
        amount: tx.amount,
        createdAt: tx.time
      };
    }));

    // Recent Activity (Live Intelligence)
    const [recentActivity] = await db.query(`
      SELECT id, action as event, logName as entity, details as user, createdAt as time 
      FROM activitylog 
      ORDER BY createdAt DESC LIMIT 5
    `);

    // Fetch recent users for the "Cloud Active" avatars
    const [recentUsers] = await db.query(`
      SELECT name, photoUrl 
      FROM user 
      WHERE photoUrl IS NOT NULL 
        AND photoUrl != '' 
        AND photoUrl NOT LIKE '%ui-avatars%'
      ORDER BY createdAt DESC LIMIT 5
    `);
    
    // Only return users who actually have REAL images
    const activeAvatars = recentUsers.map(u => ({
      name: u.name,
      photoUrl: u.photoUrl
    }));

    return res.json({
      success: true,
      data: {
        overview: {
          totalProviders: Number(providersCount[0].total),
          payingProviders: Number(payingProviders[0].total),
          activeToday: Number(newProvidersToday[0].total || 0),
          revenueThisMonth: Number(ytdVolumeRes[0].total || 0),
          totalPendingPayouts: Number(pendingPayouts[0].total || 0),
          totalGrossFees: Number(ytdVolumeRes[0].total || 0) * 0.05,
          expiringSoon: Number(expiringSoonRes[0].total || 0),
          securityAlertsCount: Number(securityAlerts[0].total || 0),
          failedLoginsCount: Number(failedLogins[0].total || 0),
          activeProtocolsCount,
          activeAvatars,
          activeAlerts
        },
        revenue: {
          total: Number(totalRevenue[0].total || 0), // Platform Revenue
          platformVolume: Number(platformVolume[0].total || 0), // Gross Volume (GMV)
          mpesaCollections: Number(mpesaCollections[0].total || 0)
        },
        trends: {
          revenueTrend,
          weeklyGrowth
        },
        recentTransactions: enrichedTx,
        recentActivity
      }
    });
  } catch (err) {
    console.error('❌ SYSTEM STATS ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch system stats: ' + err.message });
  }
};

export const listTenants = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const [tenants] = await db.query(`
      SELECT t.*, s.planName, s.status as subscriptionStatus, (SELECT id FROM user WHERE tenantId = t.id AND role = 'PROVIDER' LIMIT 1) as primaryUserId
      FROM tenant t
      LEFT JOIN subscription s ON t.id = s.tenantId
      ORDER BY t.createdAt DESC
      LIMIT ? OFFSET ?
    `, [Number(limit), offset]);

    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM tenant`);
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
    const dbLatencyMs = Date.now() - start;

    // Get actual system statistics for a more accurate health report
    const cpus = os.cpus();
    const cpuLoad = Math.round((os.loadavg()[0] / cpus.length) * 100);
    const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    // For historical performance, since we don't store OS metrics in DB, 
    // let's query the ActivityLog to get actual system usage load over the last 12 hours
    const [loadHistory] = await db.query(`
      SELECT DATE_FORMAT(createdAt, '%H:00') as time, COUNT(*) as api_calls
      FROM activitylog
      WHERE createdAt >= NOW() - INTERVAL 12 HOUR
      GROUP BY HOUR(createdAt)
      ORDER BY createdAt ASC
    `);
    
    // Map the actual DB activity to our performance chart
    let performanceData = loadHistory.map(row => ({
      time: row.time,
      api: Math.max(10, dbLatencyMs + Math.floor(Math.random() * 5)), // Simulate API latency correlated to DB
      load: Math.min(100, Math.round((row.api_calls / 10) * 100)) // Normalize load based on activity volume (approx 10 calls per hr as baseline)
    }));
    
    // Fallback if no activity in last 12 hours
    if (performanceData.length === 0) {
       performanceData = Array.from({length: 6}).map((_, i) => ({
         time: `${(new Date().getHours() - (5-i) + 24) % 24}:00`,
         api: dbLatencyMs + 5,
         load: cpuLoad
       }));
    }

    const nodes = [
      { 
        name: os.hostname(), 
        region: 'primary-server', 
        status: dbLatencyMs < 200 ? 'Healthy' : 'Degraded', 
        load: `${cpuLoad}%` 
      }
    ];

    // Simulate Safaricom API latency (normally you'd ping an endpoint)
    const safaricomLatency = Math.floor(Math.random() * 40) + 15; // 15-55ms
    const safaricomStatus = safaricomLatency < 50 ? 'Healthy' : 'Degraded';

    // Get Memory Capacity
    const totalMem = Math.round(os.totalmem() / 1024 / 1024); // MB
    const freeMem = Math.round(os.freemem() / 1024 / 1024); // MB
    const usedMem = totalMem - freeMem;

    // Get Disk Details (Cross-Platform)
    let diskStats = { total: 'N/A', used: 'N/A', free: 'N/A', percent: 0 };
    try {
      const isWin = os.platform() === 'win32';
      if (isWin) {
        // Windows command
        const drive = process.cwd().slice(0, 2); // e.g. "C:"
        const diskOutput = execSync(`powershell -Command "Get-CimInstance Win32_LogicalDisk | Where-Object { $_.DeviceID -eq '${drive}' } | Select-Object Size, FreeSpace | ConvertTo-Json"`).toString();
        const diskData = JSON.parse(diskOutput);
        const totalDisk = Math.round(diskData.Size / 1024 / 1024 / 1024);
        const freeDisk = Math.round(diskData.FreeSpace / 1024 / 1024 / 1024);
        const usedDisk = totalDisk - freeDisk;
        diskStats = {
          total: `${totalDisk} GB`,
          used: `${usedDisk} GB`,
          free: `${freeDisk} GB`,
          percent: Math.round((usedDisk / totalDisk) * 100)
        };
      } else {
        // POSIX / Linux command
        const diskOutput = execSync("df -k . | tail -1 | awk '{print $2, $3, $4, $5}'").toString().trim();
        const [totalK, usedK, freeK, percentStr] = diskOutput.split(/\s+/);
        const totalDisk = Math.round(parseInt(totalK) / 1024 / 1024);
        const usedDisk = Math.round(parseInt(usedK) / 1024 / 1024);
        const freeDisk = Math.round(parseInt(freeK) / 1024 / 1024);
        diskStats = {
          total: `${totalDisk} GB`,
          used: `${usedDisk} GB`,
          free: `${freeDisk} GB`,
          percent: parseInt(percentStr?.replace('%', '')) || 0
        };
      }
    } catch (e) {
      // Sliently fail stats instead of crashing logs
    }

    return res.json({
      success: true,
      data: {
        status: dbLatencyMs < 500 ? 'Healthy' : 'Degraded',
        version: 'v1.4.2',
        dbLatency: `${dbLatencyMs}ms`,
        apiLatency: `${dbLatencyMs + 5}ms`,
        safaricomLatency: `${safaricomLatency}ms`,
        safaricomStatus,
        cpuLoad: `${cpuLoad}%`,
        incidentRate: '0%',
        uptime: process.uptime(),
        memoryUsage: `${memoryUsage}MB`,
        memoryCapacity: {
          total: `${totalMem} MB`,
          used: `${usedMem} MB`,
          free: `${freeMem} MB`,
          percent: Math.round((usedMem / totalMem) * 100)
        },
        diskCapacity: diskStats,
        performanceData,
        nodes
      }
    });
  } catch (err) {
    return res.json({ success: true, data: { status: 'Degraded', message: 'Database connection issue' } });
  }
};

export const getSubscriptions = async (req, res) => {
  const { search = '', status = '', planName = '', page = 1, limit = 10 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

    try {
      let query = `
        SELECT 
          s.*, 
          ANY_VALUE(t.businessName) as businessName, 
          ANY_VALUE(t.slug) as slug, 
          ANY_VALUE(u.email) as email, 
          ANY_VALUE(u.phone) as phone 
        FROM subscription s
        JOIN tenant t ON s.tenantId = t.id
        LEFT JOIN user u ON u.tenantId = t.id AND u.role = 'PROVIDER'
        WHERE 1=1
      `;

    const queryParams = [];

    if (search) {
      query += ` AND (t.businessName LIKE ? OR t.slug LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`);
    }
    
    // Admin uses 'status' text, convert to our db codes
    if (status) {
      let statusCode;
      if (status === 'ACTIVE') statusCode = 0;
      else if (status === 'INACTIVE' || status === 'EXPIRED') statusCode = 1;
      else if (status === 'TRIAL') statusCode = 2;
      
      if (statusCode !== undefined) {
        query += ` AND s.status = ?`;
        queryParams.push(statusCode);
      }
    }

    if (planName) {
      query += ` AND s.planName = ?`;
      queryParams.push(planName);
    }

    query += ` GROUP BY s.id ORDER BY s.createdAt DESC LIMIT ? OFFSET ?`;
    queryParams.push(Number(limit), offset);

    const [items] = await db.query(query, queryParams);

    // Format for frontend
    const formattedItems = items.map(i => ({
      id: i.id,
      tenantId: i.tenantId,
      planName: i.planName,
      status: i.status === 0 ? 'ACTIVE' : i.status === 2 ? 'TRIAL' : 'EXPIRED',
      endDate: i.endDate,
      trialEndDate: i.trialEndDate,
      tenant: { businessName: i.businessName, slug: i.slug, email: i.email, phone: i.phone }
    }));

    let countQuery = `
      SELECT COUNT(DISTINCT s.id) as total 
      FROM subscription s
      JOIN tenant t ON s.tenantId = t.id
      WHERE 1=1
    `;
    const countParams = [];
    if (search) { countQuery += ` AND (t.businessName LIKE ? OR t.slug LIKE ?)`; countParams.push(`%${search}%`, `%${search}%`); }
    if (status) { 
      let statusCode = status === 'ACTIVE' ? 0 : status === 'TRIAL' ? 2 : 1;
      countQuery += ` AND s.status = ?`; countParams.push(statusCode); 
    }
    if (planName) { countQuery += ` AND s.planName = ?`; countParams.push(planName); }

    const [countRes] = await db.query(countQuery, countParams);
    const total = countRes[0].total;

    return res.json({
      success: true,
      data: {
        items: formattedItems,
        pagination: { total, pages: Math.ceil(total / Number(limit)), page: Number(page), limit: Number(limit) }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch subscriptions' });
  }
};

export const impersonateUser = async (req, res) => {
  const { id } = req.params; // Target user ID
  const adminId = req.user.userId;

  try {
    const [users] = await db.query(`SELECT * FROM user WHERE id = ? LIMIT 1`, [id]);
    if (users.length === 0) return res.status(404).json({ success: false, message: 'User not found' });
    const targetUser = users[0];

    // Log the impersonation event for security
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, ?, ?, ?, 'Security', ?, NOW())
    `, [ulid(), targetUser.tenantId, adminId, 'Impersonation Access', `Super Admin access ${targetUser.email}`]);

    const sessionId = ulid();
    const payload = { userId: targetUser.id, tenantId: targetUser.tenantId, role: targetUser.role, sessionId };
    
    const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' });

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    await db.query(
      `INSERT INTO session (id, userId, token, userAgent, ipAddress, isActive, createdAt, lastActive) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [sessionId, targetUser.id, tokenHash, req.get('user-agent') || 'Admin Impersonation', req.ip || '0.0.0.0']
    );

    res.cookie('__hlynk_rt', refreshToken, {
      httpOnly: true,
      secure: IS_PROD,
      sameSite: IS_PROD ? 'strict' : 'lax',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return res.json({
      success: true,
      data: {
        accessToken,
        refreshToken, // backward-compat body field
        user: {
          id: targetUser.id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          tenantId: targetUser.tenantId,
          photoUrl: targetUser.photoUrl
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const getUsers = async (req, res) => {
  const { search = '', role = '', page = 1, limit = 5 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let query = `SELECT id, name, email, phone, role, photoUrl FROM user WHERE 1=1`;
    const queryParams = [];

    if (search) {
      query += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`;
      queryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (role) {
      query += ` AND role = ?`;
      queryParams.push(role);
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    queryParams.push(Number(limit), offset);

    const [items] = await db.query(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM user WHERE 1=1`;
    const countParams = [];
    if (search) { countQuery += ` AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)`; countParams.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    if (role) { countQuery += ` AND role = ?`; countParams.push(role); }

    const [countRes] = await db.query(countQuery, countParams);
    const total = countRes[0].total;

    return res.json({
      success: true,
      data: {
        items,
        pagination: { total, pages: Math.ceil(total / Number(limit)), page: Number(page), limit: Number(limit) }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

export const deleteUser = async (req, res) => {
  try {
    const [u] = await db.query(`SELECT role FROM user WHERE id = ?`, [req.params.id]);
    if (u.length > 0 && u[0].role === 'SUPER_ADMIN') {
      return res.status(403).json({ success: false, message: 'Cannot delete Super Admin' });
    }
    await db.query(`DELETE FROM user WHERE id = ?`, [req.params.id]);
    // Log Action
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, NULL, ?, 'User Deleted', 'Danger', ?, NOW())
    `, [ulid(), req.user.userId, `Deleted user ID: ${req.params.id}`]);

    return res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete user' });
  }
};

export const getSessions = async (req, res) => {
  try {
    const [sessions] = await db.query(`
      SELECT 
        s.id, s.ipAddress, s.userAgent, s.isActive, 
        u.id as userId, u.name, u.email, u.role, u.photoUrl,
        s.lastActive
      FROM session s
      JOIN user u ON s.userId = u.id
      WHERE s.isActive = 1 AND s.lastActive >= NOW() - INTERVAL 30 MINUTE
      ORDER BY s.lastActive DESC
      LIMIT 100
    `);

    
    // Group by userId manually to ensure we keep the MOST recent session object properly
    const latestSessionsMap = new Map();
    sessions.forEach(s => {
      if (!latestSessionsMap.has(s.userId)) {
        latestSessionsMap.set(s.userId, {
          id: s.id,
          ipAddress: s.ipAddress,
          userAgent: s.userAgent,
          isActive: s.isActive,
          lastActive: s.lastActive,
          user: {
            id: s.userId,
            name: s.name,
            email: s.email,
            role: s.role,
            photoUrl: s.photoUrl
          }
        });
      }
    });
    
    const formattedSessions = Array.from(latestSessionsMap.values());
    // console.log(`📡 SESSIONS_FETCHED: Found ${sessions.length} total, ${formattedSessions.length} unique active users.`);
    
    return res.json({ success: true, data: formattedSessions });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch sessions' });
  }
};

export const terminateSession = async (req, res) => {
  try {
    await db.query(`UPDATE session SET isActive = 0 WHERE id = ?`, [req.params.id]);
    return res.json({ success: true, message: 'Session terminated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to terminate session' });
  }
};

export const getUserActivity = async (req, res) => {
  try {
    const [user] = await db.query(`SELECT email FROM user WHERE id = ?`, [req.params.id]);
    let logs = [];
    if (user.length > 0) {
      [logs] = await db.query(`
        SELECT id, action, details, createdAt 
        FROM activitylog 
        WHERE details LIKE ? OR logName LIKE ?
        ORDER BY createdAt DESC LIMIT 50
      `, [`%${user[0].email}%`, `%${user[0].email}%`]);
    }
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch activity' });
  }
};

export const upgradePlan = async (req, res) => {
  const { id } = req.params; // tenantId
  const { planName } = req.body;

  try {
    const [sub] = await db.query(`SELECT * FROM subscription WHERE tenantId = ? LIMIT 1`, [id]);
    if (sub.length === 0) {
      return res.status(404).json({ success: false, message: 'Subscription not found for this tenant' });
    }

    // Force switch to active status with new plan
    await db.query(`
      UPDATE subscription 
      SET planName = ?, status = 0, updatedAt = NOW()
      WHERE tenantId = ?
    `, [planName, id]);

    // Also notify the tenant
    await db.query(`
      INSERT INTO notification (id, tenantId, title, message, type, status, createdAt) 
      VALUES (?, ?, ?, ?, 'SYSTEM', 0, NOW())
    `, [
      ulid(), 
      id, 
      'Subscription Upgraded', 
      `Your subscription has been manually upgraded to ${planName} by the Super Admin.`
    ]);

    // 3. Log Action
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, ?, ?, 'Plan Upgrade', 'Billing', ?, NOW())
    `, [ulid(), id, req.user.userId, `Upgraded to ${planName}`]);

    return res.json({ success: true, message: 'Subscription upgraded' });
  } catch (err) {
    console.error('Upgrade Plan Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to upgrade plan' });
  }
};

export const suspendTenant = async (req, res) => {
  try {
    await db.query(`UPDATE tenant SET isActive = 0 WHERE id = ?`, [req.params.id]);
    await db.query(`UPDATE user SET isActive = 0 WHERE tenantId = ?`, [req.params.id]);
    // Log Action
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, ?, ?, 'Tenant Suspended', 'Security', ?, NOW())
    `, [ulid(), req.params.id, req.user.userId, 'Tenant and all associated users suspended by Admin']);

    return res.json({ success: true, message: 'Tenant suspended' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to suspend tenant' });
  }
};

export const activateTenant = async (req, res) => {
  try {
    await db.query(`UPDATE tenant SET isActive = 1 WHERE id = ?`, [req.params.id]);
    await db.query(`UPDATE user SET isActive = 1 WHERE tenantId = ?`, [req.params.id]);
    // Log Action
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, ?, ?, 'Tenant Activated', 'Security', ?, NOW())
    `, [ulid(), req.params.id, req.user.userId, 'Tenant and all associated users activated by Admin']);

    return res.json({ success: true, message: 'Tenant activated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to activate tenant' });
  }
};

export const deleteTenant = async (req, res) => {
  try {
    await db.query(`DELETE FROM tenant WHERE id = ?`, [req.params.id]);
    // Log Action
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, ?, ?, 'Tenant Deleted', 'Danger', ?, NOW())
    `, [ulid(), req.params.id, req.user.userId, 'Tenant deleted permanently by Admin']);

    return res.json({ success: true, message: 'Tenant deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete tenant' });
  }
};

export const updateTenant = async (req, res) => {
  const { businessName, slug } = req.body;
  try {
    await db.query(`UPDATE tenant SET businessName = ?, slug = ?, updatedAt = NOW() WHERE id = ?`, [businessName, slug, req.params.id]);
    await db.query(`UPDATE provider SET businessName = ?, updatedAt = NOW() WHERE tenantId = ?`, [businessName, req.params.id]);
    // Log Action
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, ?, ?, 'Tenant Updated', 'Management', ?, NOW())
    `, [ulid(), req.params.id, req.user.userId, `Updated tenant: ${businessName} (${slug})`]);

    return res.json({ success: true, message: 'Tenant updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update tenant' });
  }
};

export const getActivityLogs = async (req, res) => {
  const { page = 1, limit = 5, search = '', category = '' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let q = `
      SELECT 
        a.*, 
        ANY_VALUE(u.name) as userName, 
        ANY_VALUE(u.email) as userEmail, 
        ANY_VALUE(u.photoUrl) as photoUrl, 
        ANY_VALUE(t.businessName) as businessName 
      FROM activitylog a
      LEFT JOIN user u ON u.id = a.userId OR a.details LIKE CONCAT('%', u.email, '%')
      LEFT JOIN tenant t ON t.id = a.tenantId
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      q += ` AND (a.action LIKE ? OR a.details LIKE ? OR u.name LIKE ? OR t.businessName LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (category) {
      q += ` AND a.action LIKE ?`;
      params.push(`%${category}%`);
    }

    // Since LEFT JOIN with LIKE might return duplicates, use GROUP BY a.id to prevent duplicates
    q += ` GROUP BY a.id ORDER BY a.createdAt DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const [items] = await db.query(q, params);

    // Count
    let cQ = `
      SELECT COUNT(DISTINCT a.id) as total 
      FROM activitylog a
      LEFT JOIN user u ON u.id = a.userId OR a.details LIKE CONCAT('%', u.email, '%')
      LEFT JOIN tenant t ON t.id = a.tenantId
      WHERE 1=1
    `;
    const cParams = [];
    if (search) {
      cQ += ` AND (a.action LIKE ? OR a.details LIKE ? OR u.name LIKE ? OR t.businessName LIKE ?)`;
      cParams.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    if (category) {
      cQ += ` AND a.action LIKE ?`;
      cParams.push(`%${category}%`);
    }
    const [counts] = await db.query(cQ, cParams);
    const total = counts[0].total;

    // Transform
    const formatted = items.map(log => ({
      ...log,
      user: {
        name: log.userName || (log.logName && log.logName !== 'SYSTEM' ? log.logName : null),
        email: log.userEmail,
        photoUrl: log.photoUrl
      },
      tenant: {
        businessName: log.businessName
      }
    }));

    return res.json({
      success: true,
      data: {
        items: formatted,
        pagination: { total, pages: Math.ceil(total / Number(limit)) }
      }
    });
  } catch (err) {
    console.error('getActivityLogs Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch global activity logs' });
  }
};

export const resolveAllTickets = async (req, res) => {
  try {
    // Dummy function since tickets aren't implemented in the backend yet
    return res.json({ success: true, message: 'Tickets resolved' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to resolve tickets' });
  }
};

export const getSettings = async (req, res) => {
  try {
    const [settings] = await db.query(`SELECT * FROM systemsetting`);
    return res.json({ success: true, data: settings });
  } catch (err) {
    const defaultSettings = [
      { key: 'APP_NAME', value: 'HudumaLynk' },
      { key: 'SUPPORT_EMAIL', value: 'support@hlynk.co.ke' },
      { key: 'DEFAULT_CURRENCY', value: 'KES - Kenya Shilling' },
      { key: 'TIMEZONE', value: 'Africa/Nairobi (UTC+3)' },
      { key: 'ENFORCE_2FA', value: 'false' },
      { key: 'INTRUSION_DETECT', value: 'true' },
      { key: 'SESSION_PERSISTENCE', value: 'false' },
    ];
    return res.json({ success: true, data: defaultSettings });
  }
};

export const updateSettings = async (req, res) => {
  try {
    let settings = req.body;
    
    // Handle both legacy array format [{key, value}] and modern flat object format
    if (Array.isArray(settings)) {
      const flat = {};
      settings.forEach(item => {
        if (item.key) flat[item.key] = item.value;
      });
      settings = flat;
    } else if (settings.settings && Array.isArray(settings.settings)) {
       // Handle { settings: [...] } wrapper
       const flat = {};
       settings.settings.forEach(item => {
         if (item.key) flat[item.key] = item.value;
       });
       settings = flat;
    }

    // Sanitize: only allow valid columns to avoid "Unknown column '0'" error
    const validKeys = [
      'maintenanceMode', 
      'allowNewProviders', 
      'platformFeePercentage', 
      'supportEmail'
    ];
    const sanitized = {};
    validKeys.forEach(k => {
      if (settings[k] !== undefined) {
        // Convert 'true'/'false' strings to boolean for numbers if necessary
        if (k === 'maintenanceMode' || k === 'allowNewProviders') {
          sanitized[k] = settings[k] === 'true' || settings[k] === true ? 1 : 0;
        } else {
          sanitized[k] = settings[k];
        }
      }
    });

    if (Object.keys(sanitized).length === 0) {
       return res.status(400).json({ success: false, message: 'No valid setting fields provided' });
    }

    // Auto-create table if missing
    await db.query(`
      CREATE TABLE IF NOT EXISTS systemsettings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        maintenanceMode TINYINT(1) DEFAULT 0,
        allowNewProviders TINYINT(1) DEFAULT 1,
        platformFeePercentage DECIMAL(5,2) DEFAULT 5.00,
        supportEmail VARCHAR(255),
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [existing] = await db.query(`SELECT id FROM systemsettings LIMIT 1`);
    if (existing.length > 0) {
      await db.query(`UPDATE systemsettings SET ? WHERE id = ?`, [sanitized, existing[0].id]);
    } else {
      await db.query(`INSERT INTO systemsettings SET ?`, [sanitized]);
    }
    
    return res.json({ success: true, message: 'Settings updated successfully' });
  } catch (err) {
    console.error('SETTING_UPDATE_ERR:', err);
    return res.status(500).json({ success: false, message: 'Failed to update settings: ' + err.message });
  }
};



export const getSchedules = async (req, res) => {
  return res.json({ success: true, data: [] });
};

export const runReportQuery = async (req, res) => {
  const { table, columns } = req.body;
  try {
    const allowedTables = ['user', 'tenant', 'sale', 'subscription', 'payment', 'activitylog', 'notification', 'customer', 'product'];
    if (!allowedTables.includes(table)) return res.status(400).json({ success: false, message: 'Invalid table' });
    
    const validColumns = columns.filter(c => /^[a-zA-Z0-9_]+$/.test(c));
    if (validColumns.length === 0) return res.status(400).json({ success: false, message: 'Invalid columns' });

    const q = `SELECT ${validColumns.join(', ')} FROM ${table} LIMIT 500`;
    const [rows] = await db.query(q);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to run query' });
  }
};
export const getGlobalTransactions = async (req, res) => {
  const { page = 1, limit = 10, status, type, method, search } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    let whereQuery = 'WHERE 1=1';
    const params = [];

    if (status !== undefined && status !== '') {
      whereQuery += ' AND p.status = ?';
      params.push(status);
    }
    if (type) {
      whereQuery += ' AND p.transactionType = ?';
      params.push(type);
    }
    if (method) {
      if (method === 'MPESA') whereQuery += ' AND p.mpesaRequestId IS NOT NULL';
      else if (method === 'CASH') whereQuery += ' AND p.mpesaRequestId IS NULL';
    }
    if (search) {
      whereQuery += ' AND (t.businessName LIKE ? OR p.reference LIKE ? OR p.mpesaRequestId LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const [transactions] = await db.query(`
      SELECT p.*, t.businessName, t.slug,
             (SELECT resultCode FROM mpesalog WHERE checkoutRequestId = p.mpesaRequestId AND type = 1 LIMIT 1) as mpesaResultCode,
             (SELECT phone FROM mpesalog WHERE checkoutRequestId = p.mpesaRequestId LIMIT 1) as phone
      FROM payment p
      LEFT JOIN tenant t ON p.tenantId = t.id
      ${whereQuery}
      ORDER BY p.createdAt DESC
      LIMIT ? OFFSET ?
    `, [...params, Number(limit), offset]);

    const [countRes] = await db.query(`
      SELECT COUNT(*) as total FROM payment p 
      LEFT JOIN tenant t ON p.tenantId = t.id 
      ${whereQuery}
    `, params);

    const total = Number(countRes[0].total);

    return res.json({
      success: true,
      data: {
        items: transactions,
        pagination: {
          total,
          pages: Math.ceil(total / Number(limit)),
          page: Number(page),
          limit: Number(limit)
        }
      }
    });
  } catch (err) {
    console.error('[ADMIN-TX] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

export const getTransactionDetails = async (req, res) => {
  const { id } = req.params;
  try {
    const [payments] = await db.query(`
      SELECT p.*, t.businessName as tenantName, t.slug as tenantSlug
      FROM payment p
      LEFT JOIN tenant t ON p.tenantId = t.id
      WHERE p.id = ?
    `, [id]);

    if (payments.length === 0) return res.status(404).json({ success: false, message: 'Transaction not found' });

    const payment = payments[0];
    
    // Fetch related Mpesa logs if it's an MPESA transaction
    if (payment.mpesaRequestId) {
      const [logs] = await db.query(`
        SELECT * FROM mpesalog 
        WHERE checkoutRequestId = ? 
        ORDER BY createdAt ASC
      `, [payment.mpesaRequestId]);
      payment.mpesaLogs = logs;
    }

    // Fetch related context (Sale or Subscription)
    if (payment.transactionType === 'SALE') {
      const [sales] = await db.query(`SELECT * FROM sale WHERE id = ?`, [payment.reference]);
      if (sales.length > 0) payment.context = { type: 'SALE', data: sales[0] };
    } else if (payment.transactionType === 'SUBSCRIPTION') {
      const [subs] = await db.query(`SELECT * FROM subscription WHERE id = ?`, [payment.reference]);
      if (subs.length > 0) payment.context = { type: 'SUBSCRIPTION', data: subs[0] };
    }

    return res.json({ success: true, data: payment });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch transaction details' });
  }
};

export const listPlatformReviews = async (req, res) => {
  const { page = 1, limit = 10, status } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  try {
    let q = `SELECT * FROM platformreview WHERE 1=1`;
    const params = [];
    if (status !== undefined && status !== '') {
      q += ` AND status = ?`;
      params.push(Number(status));
    }
    q += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const [reviews] = await db.query(q, params);
    const [countRes] = await db.query(`SELECT COUNT(*) as total FROM platformreview WHERE 1=1 ${status !== undefined && status !== '' ? 'AND status = ?' : ''}`, status !== undefined && status !== '' ? [Number(status)] : []);
    
    return res.json({
      success: true,
      data: {
        items: reviews,
        pagination: { total: countRes[0].total, pages: Math.ceil(countRes[0].total / Number(limit)), page: Number(page), limit: Number(limit) }
      }
    });
  } catch (err) {
    console.error('❌ LIST_REVIEWS_ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch reviews: ' + err.message });
  }
};


export const updatePlatformReviewStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 1 = Approved, 2 = Rejected
  try {
    await db.query(`UPDATE platformreview SET status = ? WHERE id = ?`, [status, id]);
    return res.json({ success: true, message: `Review ${status === 1 ? 'approved' : 'rejected'} successfully` });
  } catch (err) {
    console.error('❌ UPDATE_REVIEW_ERROR:', err);
    return res.status(500).json({ success: false, message: 'Failed to update review status: ' + err.message });
  }
};



const slugify = (name) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

async function uniqueSlug(base) {
  let slug = slugify(base);
  let [rows] = await db.query(`SELECT slug FROM tenant WHERE slug = ?`, [slug]);
  let exists = rows.length > 0;
  let i = 1;
  while (exists) {
    slug = `${slugify(base)}-${i++}`;
    [rows] = await db.query(`SELECT slug FROM tenant WHERE slug = ?`, [slug]);
    exists = rows.length > 0;
  }
  return slug;
}

export const registerTenant = async (req, res) => {
  const { businessName, ownerName, phone, email, category, planName = 'LITE' } = req.body;
  const connection = await db.getConnection();
  
  try {
    // 0. Check if phone already exists
    const [existing] = await connection.query(`SELECT id FROM user WHERE phone = ? LIMIT 1`, [phone]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'This phone number is already registered' });
    }

    await connection.beginTransaction();

    const tenantId = ulid();
    const userId = ulid();
    const slug = await uniqueSlug(businessName);
    const subId = ulid();

    // 1. Create tenant
    await connection.query(
      `INSERT INTO tenant (id, slug, businessName, isActive, createdAt, updatedAt) VALUES (?, ?, ?, 1, NOW(), NOW())`,
      [tenantId, slug, businessName]
    );

    // 2. Create user (Owner)
    await connection.query(
      `INSERT INTO user (id, tenantId, name, phone, email, role, passwordHash, isActive, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, 'PROVIDER', 'ADMIN_CREATED', 1, NOW(), NOW())`,
      [userId, tenantId, ownerName, phone, email]
    );

    // 3. Create provider record
    await connection.query(
      `INSERT INTO provider (id, tenantId, userId, businessName, phone, category, isActive, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
      [ulid(), tenantId, userId, businessName, phone, category || 'Other']
    );

    // 4. Initialize subscription
    const isTrial = planName === 'LITE' || planName === 'BUSINESS_PRO';
    const subStatus = isTrial ? 2 : 1; 
    const trialEndQuery = isTrial ? 'DATE_ADD(NOW(), INTERVAL 14 DAY)' : 'NULL';
    
    await connection.query(
      `INSERT INTO subscription (id, tenantId, planName, status, trialEndDate, createdAt, updatedAt) 
       VALUES (?, ?, ?, ?, ${trialEndQuery}, NOW(), NOW())`,
      [subId, tenantId, planName, subStatus]
    );

    await connection.commit();
    return res.json({ success: true, message: 'Business and primary owner registered successfully', data: { tenantId, slug } });
  } catch (err) {
    await connection.rollback();
    console.error('REGISTER_TENANT_ERR:', err);
    return res.status(500).json({ success: false, message: 'Registration failed: ' + err.message });
  } finally {
    connection.release();
  }
};

export const getPayouts = async (req, res) => {
  try {
    const PLATFORM_SHARE_RATE = 0.15;

    // 1. Fetch ACTUAL Payout Records (Already batched or triggered)
    // Using GROUP BY p.id to avoid duplicates if multiple users have the PROVIDER role
    const [payoutRecords] = await db.query(`
      SELECT p.*, t.businessName, ANY_VALUE(u.phone) as tenantPhone, t.payoutAccount
      FROM payout p
      JOIN tenant t ON p.tenantId = t.id
      JOIN user u ON t.id = u.tenantId AND u.role = 'PROVIDER'
      WHERE p.status = 'PENDING'
      GROUP BY p.id
      ORDER BY p.createdAt DESC
    `);

    // 2. Fetch ACCRUED (Unbatched) Volume for Rented Paybill
    // Uses UNION to catch:
    //   a) Payments already correctly flagged isRented = 1
    //   b) Payments where mpesalog confirms system paybill was used (historical bug guard)
    const [accruedPayments] = await db.query(`
      SELECT p.tenantId, t.businessName, p.amount, p.createdAt, s.trialEndDate
      FROM payment p
      JOIN tenant t ON p.tenantId = t.id
      LEFT JOIN subscription s ON s.tenantId = t.id
      WHERE p.payoutStatus = 0 AND p.status = 0 AND (
        p.isRented = 1
        OR EXISTS (
          SELECT 1 FROM mpesalog ml 
          WHERE ml.checkoutRequestId = p.mpesaRequestId 
          AND ml.type = 0 
          AND ml.isRented = 1
        )
      )
    `);

    // Group accrued by tenant
    const accruedGrouped = accruedPayments.reduce((acc, p) => {
      if (!acc[p.tenantId]) {
        acc[p.tenantId] = {
          tenantId: p.tenantId,
          businessName: p.businessName,
          totalGross: 0,
          platformShare: 0,
          transactionCount: 0,
          oldestTransaction: p.createdAt
        };
      }
      const g = acc[p.tenantId];
      const trialEnd = p.trialEndDate ? new Date(p.trialEndDate) : null;
      const rate = (trialEnd && new Date(p.createdAt) <= trialEnd) ? 0 : PLATFORM_SHARE_RATE;
      
      const amount = Number(p.amount);
      g.totalGross += amount;
      g.platformShare += amount * rate;
      g.transactionCount++;
      return acc;
    }, {});

    const pendingAccrued = Object.values(accruedGrouped).map(g => ({
      ...g,
      netSettlement: g.totalGross - g.platformShare
    }));

    // Summary stats
    const totalPendingPayouts = payoutRecords.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalAccruedNet = pendingAccrued.reduce((sum, g) => sum + g.netSettlement, 0);

    return res.json({ 
      success: true, 
      data: {
        payouts: payoutRecords, // Actual records ready for B2C
        accrued: pendingAccrued, // Accumulating for next week
        summary: {
          totalDue: totalPendingPayouts,
          totalAccrued: totalAccruedNet,
          shareRate: PLATFORM_SHARE_RATE
        }
      } 
    });
  } catch (err) {
    console.error('[ADMIN-PAYOUTS] Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch pending payouts' });
  }
};

export const markPayoutPaid = async (req, res) => {
  const { tenantId } = req.params;
  const { payoutId, disburse = false } = req.body;
  const adminId = req.user.userId;

  try {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      let payoutAmount = 0;
      let payoutPhone = '';
      let payoutType = '';

      if (payoutId) {
        // Mark specific payout as PAID
        const [pRows] = await connection.query(`
          SELECT p.*, t.payoutAccount, ANY_VALUE(u.phone) as tenantPhone 
          FROM payout p 
          JOIN tenant t ON p.tenantId = t.id 
          JOIN user u ON t.id = u.tenantId AND u.role = 'PROVIDER'
          WHERE p.id = ?
          GROUP BY p.id
        `, [payoutId]);
        
        if (pRows.length === 0) throw new Error('Payout record not found');
        const payout = pRows[0];
        payoutAmount = payout.amount;
        payoutPhone = payout.payoutAccount || payout.tenantPhone;
        payoutType = payout.type;

        if (disburse) {
          // Trigger automated disburse via M-Pesa B2C
          // This will send money from our paybill to the vendor/referee
          const result = await initiateB2C({
            amount: payoutAmount,
            phone: payoutPhone,
            payoutId: payoutId,
            tenantId: tenantId,
            remarks: `Hlynk ${payoutType} Payout`
          });
          console.log(`[B2C-INITIATED] Payout ${payoutId} for ${payoutPhone}: ${result.ResponseDescription}`);
          // Mark as PROCESSING — the B2C callback will finalize to PAID or FAILED
          await connection.query(`UPDATE payout SET status = 'PROCESSING', updatedAt = NOW() WHERE id = ?`, [payoutId]);
        } else {
          // Manual mark as paid (no B2C disbursement)
          await connection.query(`UPDATE payout SET status = 'PAID', processedAt = NOW(), updatedAt = NOW() WHERE id = ?`, [payoutId]);
        }
      } else {
        // Legacy: Mark all pending rented payments as paid for this tenant
        const [result] = await connection.query(`
           UPDATE payment 
           SET payoutStatus = 1, updatedAt = NOW() 
           WHERE tenantId = ? AND payoutStatus = 0 AND status = 0 AND (
             isRented = 1 
             OR EXISTS (
               SELECT 1 FROM mpesalog ml 
               WHERE ml.checkoutRequestId = payment.mpesaRequestId 
               AND ml.type = 0 
               AND ml.isRented = 1
             )
           )
        `, [tenantId]);
        
        await connection.query(`
          INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
          VALUES (?, ?, ?, 'Payout Processed', 'Financial', ?, NOW())
        `, [ulid(), tenantId, adminId, `Marked ${result.affectedRows} transactions as paid/cleared.`]);
      }

      await connection.query(`
        INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
        VALUES (?, ?, ?, 'Payout Settled', 'Financials', ?, NOW())
      `, [ulid(), tenantId, adminId, `Marked payout ${payoutId || 'bulk'} as PAID${disburse ? ' and disbursed via M-Pesa' : ''}`]);

      await connection.commit();
      return res.json({ success: true, message: disburse ? `Successfully initiated disbursement and marked as paid.` : `Successfully marked payout as paid.` });
    } catch (err) {
      await connection.rollback();
      throw err;
    } finally {
      connection.release();
    }
  } catch (err) {
    console.error('[ADMIN-PAYOUTS] Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to process payout' });
  }
};

export const updateTenantPayoutAccount = async (req, res) => {
  const { id } = req.params;
  const { payoutMethod, payoutAccount } = req.body;

  try {
    await db.query(`UPDATE tenant SET payoutMethod = ?, payoutAccount = ?, updatedAt = NOW() WHERE id = ?`, [payoutMethod, payoutAccount, id]);
    
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, ?, ?, 'Payout Info Updated', 'Management', ?, NOW())
    `, [ulid(), id, req.user.userId, `Set payout to ${payoutMethod} (${payoutAccount})`]);

    return res.json({ success: true, message: 'Payout account updated' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update payout account' });
  }
};

export const listNewPayouts = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT p.*, t.businessName, t.payoutMethod, t.payoutAccount
      FROM payout p
      JOIN tenant t ON p.tenantId = t.id
      ORDER BY p.createdAt DESC
    `);
    
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to list payout records' });
  }
};

export const getVaultStats = async (req, res) => {
  try {
    // 1. Total Collections (Money in the paybill from success payments)
    const [collections] = await db.query(`SELECT SUM(amount) as total FROM payment WHERE status = 0`);
    
    // 2. Pending Liabilities
    const [pendingPayouts] = await db.query(`
      SELECT 
        SUM(CASE WHEN type = 'REFERRAL' THEN amount ELSE 0 END) as pendingReferral,
        SUM(CASE WHEN type = 'VENDOR_PAYOUT' THEN amount ELSE 0 END) as pendingVendor
      FROM payout WHERE status = 'PENDING'
    `);

    // 3. Settled/Paid 
    const [settledPayouts] = await db.query(`
      SELECT SUM(amount) as total FROM payout WHERE status = 'PAID'
    `);

    const totalIn = Number(collections[0].total || 0);
    const pRef = Number(pendingPayouts[0].pendingReferral || 0);
    const pVend = Number(pendingPayouts[0].pendingVendor || 0);
    const totalOut = Number(settledPayouts[0].total || 0);

    return res.json({
      success: true,
      data: {
        totalCollections: totalIn,
        pendingLiabilities: pRef + pVend,
        pendingReferral: pRef,
        pendingVendor: pVend,
        totalSettled: totalOut,
        vaultBalance: totalIn - totalOut, // How much SHOULD be in the buni account right now
        platformNetPotential: totalIn - (pRef + pVend + totalOut)
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch vault stats' });
  }
};


export const testB2C = async (req, res) => {
  const { phone, amount, remarks } = req.body;
  try {
    const result = await initiateB2C({
      amount: Number(amount),
      phone,
      remarks: remarks || 'Hlynk Diagnostic Test',
      tenantId: null,
      payoutId: null
    });
    
    // Log the test action
    await db.query(`
      INSERT INTO activitylog (id, tenantId, userId, action, logName, details, createdAt) 
      VALUES (?, NULL, ?, 'B2C Test Execution', 'System', ?, NOW())
    `, [ulid(), req.user.userId, `B2C Test: KES ${amount} to ${phone}. LogID: ${result.logId}. Response: ${result.ResponseDescription}`]);

    return res.json({ success: true, message: 'B2C Initiation Successful', data: result });
  } catch (err) {
    console.error('[ADMIN-TEST-B2C] Error:', err);
    return res.status(500).json({ success: false, message: err.message || 'B2C Test Failed' });
  }
};
