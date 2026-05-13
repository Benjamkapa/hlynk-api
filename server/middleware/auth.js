import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../dbms/mysql.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, '../configs/params.json'), 'utf8'));

/**
 * Standard JWT authentication middleware for Express.
 */
export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, params.jwt_secret);
    req.user = decoded;

    // Remote Logout Check: verify session is still active in DB
    const [sessions] = await db.query(`SELECT id, isActive FROM Session WHERE id = ? LIMIT 1`, [decoded.sessionId]);
    const session = sessions[0];

    if (!session || !session.isActive) {
      return res.status(401).json({ success: false, message: 'Session expired or terminated' });
    }

    // Update last active (background)
    db.query(`UPDATE Session SET lastActive = NOW() WHERE id = ?`, [session.id]).catch(() => {});

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};

/**
 * Role-based authorization helpers
 */
export const requireProvider = (req, res, next) => {
  if (!['PROVIDER', 'STAFF', 'SUPER_ADMIN'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: Provider access required' });
  }
  next();
};

export const requireOwner = (req, res, next) => {
  if (!['PROVIDER', 'SUPER_ADMIN'].includes(req.user?.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden: Owner access required' });
  }
  next();
};

export const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: 'Forbidden: Admin access required' });
  }
  next();
};
