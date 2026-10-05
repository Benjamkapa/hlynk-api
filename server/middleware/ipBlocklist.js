import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const paramsPath = path.join(__dirname, '../configs/params.json');

/**
 * IP Blocklist Middleware
 *
 * Blocks requests from known malicious IPs, scanner ranges, and CIDR blocks.
 * Config is cached with a 30-second TTL so params.json updates apply within
 * 30 seconds without restarting the server — and without a file read on
 * every single HTTP request.
 *
 * Supports:
 *  - Exact IPs:       "1.2.3.4"
 *  - Prefix ranges:   "5.252.83."   (blocks the entire /24 subnet)
 *  - CIDR notation:   "192.168.1.0/24"
 */

// ─── Cached params loader (TTL: 30 seconds) ───────────────────────────────────

let _cachedParams = null;
let _cacheExpiry = 0;

function getCachedParams() {
  const now = Date.now();
  if (_cachedParams && now < _cacheExpiry) return _cachedParams;
  try {
    _cachedParams = JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
    _cacheExpiry = now + 30_000; // refresh every 30 seconds
  } catch (err) {
    console.error('[BLOCKLIST] Failed to read params.json:', err.message);
    if (!_cachedParams) _cachedParams = {}; // keep serving from cache on read error
  }
  return _cachedParams;
}


// ─── CIDR helpers ────────────────────────────────────────────────────────────

function ipToInt(ip) {
  return ip.split('.').reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0;
}

function cidrContains(cidr, ip) {
  try {
    const [base, bits] = cidr.split('/');
    const mask = bits ? (~0 << (32 - parseInt(bits, 10))) >>> 0 : 0xffffffff;
    return (ipToInt(base) & mask) === (ipToInt(ip) & mask);
  } catch {
    return false;
  }
}

// ─── Resolve client IP ───────────────────────────────────────────────────────

function resolveClientIP(req) {
  const forwarded = req.headers['x-forwarded-for'];
  const raw = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;
  // Strip ::ffff: IPv4-mapped prefix
  return raw?.startsWith('::ffff:') ? raw.slice(7) : raw;
}

// ─── Check if IP matches a blocklist entry ───────────────────────────────────

function isBlocked(ip, blocklist) {
  for (const entry of blocklist) {
    const e = entry.trim();
    if (!e || e.startsWith('#')) continue; // skip empty lines / comments

    // CIDR block
    if (e.includes('/')) {
      if (cidrContains(e, ip)) return true;
      continue;
    }

    // Prefix / exact match
    if (ip === e || ip.startsWith(e)) return true;
  }
  return false;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const ipBlocklistMiddleware = (req, res, next) => {
  const ip = resolveClientIP(req);
  req.clientIP = ip; // make IP available downstream

  // Always allow loopback / localhost
  if (ip === '127.0.0.1' || ip === '::1') return next();

  const params = getCachedParams();
  const blocklist = params.blocked_ip_ranges || [];

  if (isBlocked(ip, blocklist)) {
    console.warn(`[BLOCKLIST] 🚫 Blocked request from ${ip} | ${req.method} ${req.path}`);
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  next();
};
