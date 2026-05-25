import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Middleware to whitelist IPs for sensitive endpoints like payment callbacks.
 * Supports partial IP matching (e.g., '196.201.214.' matches anything in that subnet).
 */
export const validateMpesaIP = (req, res, next) => {
  // 1. Hot-reload params on every request to ensure changes take effect immediately
  const paramsPath = path.join(__dirname, '../configs/params.json');
  let params = {};
  try {
    params = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
  } catch (err) {
    console.error('[SECURITY] Failed to read params.json for whitelist:', err.message);
  }

  // 2. Resolve Client IP
  const forwarded = req.headers['x-forwarded-for'];
  const rawIP = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  
  // Clean IP (handles ::ffff: prefixes)
  const clientIP = rawIP.replace(/^.*:/, '');
  
  const whitelist = params.mpesa_whitelist_ips || [];
  const env = (process.env.NODE_ENV || 'development').trim().toLowerCase();
  const isDev = env === 'development' || env === 'test';

  // 3. Authorization Check
  const isAuthorized = whitelist.some(ip => clientIP.includes(ip));

  console.log(`[SECURITY] Callback Check | IP: ${clientIP} | Env: ${env} | Authorized: ${isAuthorized}`);

  if (!isAuthorized && !isDev) {
    console.warn(`[SECURITY] ❌ BLOCKING unauthorized IP: ${clientIP}`);
    return res.status(403).json({ error: 'Forbidden: IP not whitelisted' });
  }

  if (isAuthorized) {
    console.log(`[SECURITY] ✅ Allowing whitelisted IP: ${clientIP}`);
  } else if (isDev) {
    console.log(`[SECURITY] ⚠️ Allowing unauthorized IP ${clientIP} because server is in DEVELOPMENT mode.`);
  }

  req.clientIP = clientIP;
  next();
};
