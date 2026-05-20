import { db } from '../dbms/mysql.js';
import { redis } from '../utils/redis.js';
import jwt from 'jsonwebtoken';
import { ulid } from 'ulid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, '../configs/params.json'), 'utf8'));

const JWT_SECRET = params.jwt_secret || 'default_secret';
const JWT_EXPIRES_IN = params.expires_in || '360m';

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

const issueTokens = async (user, userAgent = 'Unknown', ipAddress = 'Unknown') => {
  const sessionId = ulid();
  const payload = { userId: user.id, tenantId: user.tenantId, role: user.role, sessionId };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });

  await db.query(
    `INSERT INTO session (id, userId, token, userAgent, ipAddress, isActive, createdAt, lastActive) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [sessionId, user.id, refreshToken, userAgent, ipAddress]
  );

  return { accessToken, refreshToken };
};

export const googleAuth = async (req, res) => {
  const { credential, registration } = req.body;
  const ipAddress = req.ip;
  const userAgent = req.get('user-agent');

  try {
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`);
    if (!response.ok) return res.status(400).json({ success: false, message: 'Invalid Google credential' });
    
    const payload = await response.json();
    const email = payload.email;

    const [userRows] = await db.query(`
      SELECT u.*, t.isActive as tenantIsActive, t.slug as tenantSlug, t.businessName, 
             s.planName, s.status, s.trialEndDate, s.endDate
      FROM user u
      JOIN tenant t ON u.tenantId = t.id
      LEFT JOIN subscription s ON s.tenantId = t.id
      WHERE u.email = ?
    `, [email]);

    let user = userRows[0];

    // SYNC PHOTO: Always update the photo from Google if it exists
    if (user && payload.picture && user.photoUrl !== payload.picture) {
      await db.query(`UPDATE user SET photoUrl = ?, updatedAt = NOW() WHERE id = ?`, [payload.picture, user.id]);
      user.photoUrl = payload.picture;
    }

    if (!user) {
      if (!registration) {
        return res.json({ 
          success: true,
          data: {
            action: 'REQUIRES_REGISTRATION', 
            googleDetails: { email, name: payload.name, picture: payload.picture, credential } 
          }
        });
      }

      // Registration logic
      const tenantId = ulid();
      const userId = ulid();
      const slug = await uniqueSlug(registration.businessName);

      const requestedPlan = registration.planName || 'LITE';
      const isLite = requestedPlan === 'LITE';
      const subStatus = isLite ? 2 : 1; // 2 = TRIAL, 1 = PENDING/EXPIRED
      const trialEnd = isLite ? `DATE_ADD(NOW(), INTERVAL 7 DAY)` : `NULL`;

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();
        await connection.query(`INSERT INTO tenant (id, slug, businessName, isActive, createdAt, updatedAt) VALUES (?, ?, ?, 1, NOW(), NOW())`, [tenantId, slug, registration.businessName]);
        await connection.query(`INSERT INTO user (id, tenantId, name, phone, email, role, photoUrl, passwordHash, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'PROVIDER', ?, 'GOOGLE_AUTH', 1, NOW(), NOW())`, [userId, tenantId, registration.ownerName || payload.name, registration.phone, email, payload.picture || null]);
        await connection.query(`INSERT INTO provider (id, tenantId, userId, businessName, phone, category, county, location, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`, [ulid(), tenantId, userId, registration.businessName, registration.phone, registration.category || 'Other', registration.county || 'Nairobi', registration.location || 'Unknown']);
        await connection.query(`INSERT INTO subscription (id, tenantId, planName, status, trialEndDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ${trialEnd}, NOW(), NOW())`, [ulid(), tenantId, requestedPlan, subStatus]);
        
        const [admins] = await connection.query(`SELECT id, tenantId FROM user WHERE role = 'SUPER_ADMIN'`);
        for (const admin of admins) {
          await connection.query(`INSERT INTO notification (id, tenantId, title, message, type, status, createdAt) VALUES (?, ?, 'New Vendor Registration', ?, 'SYSTEM', 0, NOW())`, [ulid(), admin.tenantId, `${registration.businessName} has just joined the platform.`]);
        }
        
        await connection.commit();
        
        user = { id: userId, tenantId, role: 'PROVIDER', tenantIsActive: 1 };
      } catch (err) {
        await connection.rollback();
        throw err;
      } finally {
        connection.release();
      }
    }

    if (user.isActive === 0 || !user.tenantIsActive) return res.status(403).json({ success: false, message: 'Account inactive' });

    const { accessToken, refreshToken } = await issueTokens(user, userAgent, ipAddress);
    return res.json({ 
      success: true, 
      data: { 
        accessToken, 
        refreshToken, 
        user: {
          ...user,
          subscription: {
            planName: user.planName,
            status: user.status,
            trialEndDate: user.trialEndDate,
            endDate: user.endDate
          },
          permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || []
        } 
      } 
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const logout = async (req, res) => {
  const { sessionId } = req.user;
  try {
    await db.query(`UPDATE session SET isActive = 0 WHERE id = ?`, [sessionId]);
    return res.json({ success: true, data: { message: 'Logged out' } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Logout failed' });
  }
};

export const me = async (req, res) => {
  const { userId } = req.user;
  try {
    const [rows] = await db.query(`
      SELECT 
        u.id, u.name, u.phone, u.email, u.role, u.photoUrl, u.permissions,
        t.id as tenantId, t.slug as tenantSlug, t.businessName,
        s.planName, s.status, s.trialEndDate, s.endDate
      FROM user u
      JOIN tenant t ON u.tenantId = t.id
      LEFT JOIN subscription s ON s.tenantId = t.id
      WHERE u.id = ?
    `, [userId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];

    // SYNC PHOTO IF MISSING: If the DB has no photo but we can get it from Google, sync it
    if (!user.photoUrl && req.user?.picture) {
       await db.query(`UPDATE user SET photoUrl = ?, updatedAt = NOW() WHERE id = ?`, [req.user.picture, userId]);
       user.photoUrl = req.user.picture;
    }

    return res.json({
      success: true,
      data: {
        ...user,
        subscription: {
          planName: user.planName,
          status: user.status,
          trialEndDate: user.trialEndDate,
          endDate: user.endDate
        },
        permissions: typeof user.permissions === 'string' ? JSON.parse(user.permissions) : user.permissions || []
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

export const refresh = async (req, res) => {
  const { refreshToken } = req.body;
  try {
    const decoded = jwt.verify(refreshToken, JWT_SECRET);
    const [sessions] = await db.query(`SELECT * FROM session WHERE id = ? AND isActive = 1 AND token = ?`, [decoded.sessionId, refreshToken]);
    if (sessions.length === 0) throw new Error('Invalid session');

    const accessToken = jwt.sign({ userId: decoded.userId, tenantId: decoded.tenantId, role: decoded.role, sessionId: decoded.sessionId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ success: true, data: { accessToken } });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};
