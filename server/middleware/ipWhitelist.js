import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Middleware to whitelist IPs for sensitive endpoints like payment callbacks.
 * Supports partial IP matching (e.g., '196.201.214.' matches anything in that subnet).
 * 
 * Environment detection uses params.json's 'env' field as the primary source of truth,
 * since .env files loaded via dotenv can accidentally override NODE_ENV set by PM2.
 */
export const validateMpesaIP = (req, res, next) => {
  // 1. Hot-reload params on every request (changes apply without server restart)
  const paramsPath = path.join(__dirname, '../configs/params.json');
  let params = {};
  try {
    params = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
  } catch (err) {
    console.error('[SECURITY] Failed to read params.json for whitelist:', err.message);
  }

  // 2. Resolve client IP (handles proxies and IPv6)
  const forwarded = req.headers['x-forwarded-for'];
  const rawIP = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  // Strip ::ffff: prefix for IPv4-mapped IPv6 addresses, preserve pure IPv6 like ::1
  const clientIP = rawIP.startsWith('::ffff:') ? rawIP.slice(7) : rawIP;

  // 3. Determine environment
  // params.json 'env: PROD' is the authoritative flag — it cannot be accidentally
  // overwritten by .env file loading (unlike NODE_ENV).
  const paramsEnv = (params.env || '').trim().toUpperCase();
  const nodeEnv = (process.env.NODE_ENV || '').trim().toLowerCase();
  const isProduction = paramsEnv === 'PROD' || nodeEnv === 'production';

  // 4. IP authorization check — test both raw and cleaned IP for safety
  const whitelist = params.mpesa_whitelist_ips || [];
  const isAuthorized = whitelist.some(ip => clientIP.includes(ip) || rawIP.includes(ip));

  console.log(`[SECURITY] Callback Check | IP: ${clientIP} | Env: ${paramsEnv || nodeEnv} | Authorized: ${isAuthorized} | Production: ${isProduction}`);

  if (!isAuthorized && isProduction) {
    console.warn(`[SECURITY] ❌ BLOCKING unauthorized IP: ${clientIP}`);
    return res.status(403).json({ error: 'Forbidden: IP not whitelisted' });
  }

  if (isAuthorized) {
    console.log(`[SECURITY] ✅ Allowing whitelisted IP: ${clientIP}`);
  } else {
    console.log(`[SECURITY] ⚠️ Allowing unauthorized IP ${clientIP} — server is NOT in production mode.`);
  }

  req.clientIP = clientIP;
  next();
};
