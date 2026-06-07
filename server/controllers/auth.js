import { db } from '../dbms/mysql.js';
import { redis } from '../utils/redis.js';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { ulid } from 'ulid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, '../configs/params.json'), 'utf8'));

const JWT_SECRET = params.jwt_secret || 'default_secret';
const REFRESH_SECRET = (params.refresh_secret || JWT_SECRET) + '_refresh';   // separate secret for refresh tokens
const JWT_EXPIRES_IN = '15m';    // hardened: 15 minutes (was 360m / 6 hours)
const REFRESH_EXPIRES_IN = '30d';

const IS_PROD = params.env !== 'LOCAL';

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

/**
 * Set refresh token as an httpOnly cookie.
 * The cookie is NOT accessible via JavaScript — prevents XSS theft.
 */
const setRefreshCookie = (res, token) => {
  res.cookie('__hlynk_rt', token, {
    httpOnly: true,
    secure: IS_PROD,           // HTTPS-only in production
    sameSite: IS_PROD ? 'strict' : 'lax',
    path: '/api/v1/auth',      // only sent to auth endpoints
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie('__hlynk_rt', {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: IS_PROD ? 'strict' : 'lax',
    path: '/api/v1/auth',
  });
};

const issueTokens = async (user, res, userAgent = 'Unknown', ipAddress = 'Unknown') => {
  const sessionId = ulid();
  const payload = { userId: user.id, tenantId: user.tenantId, role: user.role, sessionId };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });

  // Hash the token before storing it in the DB (so a DB leak doesn't compromise sessions)
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await db.query(
    `INSERT INTO session (id, userId, token, userAgent, ipAddress, isActive, createdAt, lastActive) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`,
    [sessionId, user.id, tokenHash, userAgent, ipAddress]
  );

  // Set refresh token as httpOnly cookie
  setRefreshCookie(res, refreshToken);

  // Return only access token in JSON body (refresh token is in cookie)
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
      SELECT u.*, t.isActive as tenantIsActive, t.slug as tenantSlug, t.businessName, t.referralCode,
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

    // HEAL REFERRAL CODE: Fix legacy accounts missing a code
    if (user && !user.referralCode) {
      const newRef = (user.businessName || 'HLNK').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
      await db.query(`UPDATE tenant SET referralCode = ?, updatedAt = NOW() WHERE id = ?`, [newRef, user.tenantId]);
      user.referralCode = newRef;
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

      // Registration logic here
      if (
        !registration.businessName?.trim() || 
        !registration.ownerName?.trim() || 
        !registration.phone?.trim() || 
        !email
      ) {
        return res.status(400).json({ 
          success: false, 
          message: 'All registration fields (Business Name, Owner Name, and Phone) are required.' 
        });
      }

      const tenantId = ulid();
      const userId = ulid();
      const slug = await uniqueSlug(registration.businessName);

      const connection = await db.getConnection();
      try {
        await connection.beginTransaction();

        const isTrialMode = registration.isTrial === true || registration.isTrial === 'true';
        const requestedPlan = isTrialMode ? 'TRIAL' : (registration.planName || 'LITE');
        const subStatus = (isTrialMode || requestedPlan === 'LITE') ? 2 : 1; 
        
        let trialDays = 14;
        let referredById = null;
        let referralApplied = false;

        if (registration.referralCode) {
          const [refRows] = await connection.query(`SELECT ownerId FROM (SELECT u.id as ownerId, t.referralCode FROM user u JOIN tenant t ON u.tenantId = t.id WHERE u.role = 'PROVIDER') as refs WHERE referralCode = ? LIMIT 1`, [registration.referralCode.trim().toUpperCase()]);
          if (refRows.length > 0) {
            referredById = refRows[0].ownerId;
            trialDays = 14; 
            referralApplied = true;
          }
        }

        const trialEndVal = (isTrialMode || requestedPlan === 'LITE') ? `DATE_ADD(NOW(), INTERVAL ${trialDays} DAY)` : `NULL`;

        // Generate a new unique referral code for this tenant
        const newReferralCode = (registration.businessName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase());

        await connection.query(`INSERT INTO tenant (id, slug, businessName, referralCode, referredById, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())`, [tenantId, slug, registration.businessName.trim(), newReferralCode, referredById]);
        await connection.query(`INSERT INTO user (id, tenantId, name, phone, email, role, photoUrl, eulaAcceptedAt, passwordHash, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, 'PROVIDER', ?, NOW(), 'GOOGLE_AUTH', 1, NOW(), NOW())`, [userId, tenantId, registration.ownerName.trim() || payload.name, registration.phone.trim(), email, payload.picture || null]);
        await connection.query(`INSERT INTO provider (id, tenantId, userId, businessName, phone, category, county, location, isActive, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`, [ulid(), tenantId, userId, registration.businessName.trim(), registration.phone.trim(), registration.category || 'Other', registration.county || 'Nairobi', registration.location || 'Unknown']);
        await connection.query(`INSERT INTO subscription (id, tenantId, planName, status, trialEndDate, createdAt, updatedAt) VALUES (?, ?, ?, ?, ${trialEndVal}, NOW(), NOW())`, [ulid(), tenantId, requestedPlan, subStatus]);
        
        const [admins] = await connection.query(`SELECT id, tenantId FROM user WHERE role = 'SUPER_ADMIN'`);
        for (const admin of admins) {
          await connection.query(`INSERT INTO notification (id, tenantId, title, message, type, status, createdAt) VALUES (?, ?, 'New Vendor Registration', ?, 'SYSTEM', 0, NOW())`, [ulid(), admin.tenantId, `${registration.businessName} has just joined the platform.`]);
        }
        
        await connection.commit();

        const [newUser] = await db.query(`SELECT * FROM user WHERE id = ?`, [userId]);
        const { accessToken, refreshToken } = await issueTokens(newUser[0], res, userAgent, ipAddress);
        return res.json({ 
          success: true, 
          data: { 
            accessToken, 
            refreshToken, 
            referralApplied,
            user: { ...newUser[0], subscription: { planName: requestedPlan, status: subStatus } } 
          } 
        });
      } catch (err) {
        if (connection) await connection.rollback();
        throw err;
      } finally {
        if (connection) connection.release();
      }
    }

    if (user.isActive === 0 || !user.tenantIsActive) return res.status(403).json({ success: false, message: 'Account inactive' });

    const { accessToken, refreshToken } = await issueTokens(user, res, userAgent, ipAddress);
    return res.json({ 
      success: true, 
      data: { 
        accessToken, 
        refreshToken,         // still in body for backwards-compat during transition
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
    clearRefreshCookie(res);
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
        t.id as tenantId, t.slug as tenantSlug, t.businessName, t.referralCode,
        s.planName, s.status, s.trialEndDate, s.endDate,
        (SELECT COUNT(*) FROM payment WHERE tenantId = t.id AND isRented = 1 LIMIT 1) as isRented
      FROM user u
      JOIN tenant t ON u.tenantId = t.id
      LEFT JOIN subscription s ON s.tenantId = t.id
      WHERE u.id = ?
    `, [userId]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = rows[0];

    // HEAL REFERRAL CODE
    if (!user.referralCode) {
      const newRef = (user.businessName || 'HLNK').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
      await db.query(`UPDATE tenant SET referralCode = ?, updatedAt = NOW() WHERE id = ?`, [newRef, user.tenantId]);
      user.referralCode = newRef;
    }

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
  // Support both: httpOnly cookie (preferred) and body fallback (legacy clients)
  const refreshToken = req.cookies?.__hlynk_rt || req.body?.refreshToken;
  
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'No refresh token provided' });
  }
  
  try {
    const decoded = jwt.verify(refreshToken, REFRESH_SECRET);
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    const [sessions] = await db.query(
      `SELECT * FROM session WHERE id = ? AND isActive = 1 AND token = ?`, 
      [decoded.sessionId, tokenHash]
    );
    if (sessions.length === 0) {
      // Possible token reuse attack — invalidate ALL sessions for this user
      await db.query(`UPDATE session SET isActive = 0 WHERE userId = ?`, [decoded.userId]);
      clearRefreshCookie(res);
      return res.status(401).json({ success: false, message: 'Session invalidated. Please log in again.' });
    }

    // HARDENING: Verify user + tenant are still active before issuing new tokens
    const [userCheck] = await db.query(
      `SELECT u.isActive as userActive, t.isActive as tenantActive 
       FROM user u JOIN tenant t ON u.tenantId = t.id 
       WHERE u.id = ?`, 
      [decoded.userId]
    );
    
    if (!userCheck.length || !userCheck[0].userActive || !userCheck[0].tenantActive) {
      await db.query(`UPDATE session SET isActive = 0 WHERE id = ?`, [decoded.sessionId]);
      clearRefreshCookie(res);
      return res.status(403).json({ success: false, message: 'Account deactivated' });
    }

    // ROTATION: Issue a new refresh token and invalidate the old one
    const newAccessToken = jwt.sign(
      { userId: decoded.userId, tenantId: decoded.tenantId, role: decoded.role, sessionId: decoded.sessionId }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN }
    );
    const newRefreshToken = jwt.sign(
      { userId: decoded.userId, tenantId: decoded.tenantId, role: decoded.role, sessionId: decoded.sessionId }, 
      REFRESH_SECRET, 
      { expiresIn: REFRESH_EXPIRES_IN }
    );
    
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    await db.query(`UPDATE session SET token = ?, lastActive = NOW() WHERE id = ?`, [newTokenHash, decoded.sessionId]);

    // Set new refresh token cookie
    setRefreshCookie(res, newRefreshToken);

    return res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } });
  } catch (err) {
    clearRefreshCookie(res);
    return res.status(401).json({ success: false, message: 'Invalid refresh token' });
  }
};
