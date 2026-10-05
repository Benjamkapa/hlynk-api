import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const paramsPath = path.join(__dirname, '../configs/params.json');

/**
 * Global Rate Limiter Middleware
 *
 * Applied server-wide (before all routes) to cap the total number of
 * requests any single IP can make regardless of endpoint.
 *
 * Defaults (overridable via params.json → "rate_limit" block):
 *   windowMs : 60 000 ms  (1 minute window)
 *   max      : 120        (120 req/min per IP — generous for real users)
 *
 * A tighter "scanner trap" limiter blocks IPs that hammer unknown paths
 * (scanner behavior) more aggressively.
 */

function getParams() {
  try {
    return JSON.parse(fs.readFileSync(paramsPath, 'utf8'));
  } catch {
    return {};
  }
}

// ─── 1. General global limiter ───────────────────────────────────────────────

const params = getParams();
const rl = params.rate_limit || {};

export const globalRateLimiter = rateLimit({
  windowMs: rl.windowMs ?? 60 * 1000,    // 1-minute window
  max: rl.max ?? 120,                     // 120 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.clientIP || req.ip, // use resolved IP set by ipBlocklist
  skip: (req) => {
    // Never rate-limit loopback
    const ip = req.clientIP || req.ip;
    return ip === '127.0.0.1' || ip === '::1';
  },
  handler: (req, res) => {
    const ip = req.clientIP || req.ip;
    console.warn(`[RATE-LIMIT] ⛔ Global limit hit | IP: ${ip} | ${req.method} ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please slow down.',
    });
  },
});

// ─── 2. Scanner / probe trap ─────────────────────────────────────────────────
// Aggressively rate-limits IPs that repeatedly hit 404s (scanner pattern).
// Apply this AFTER your routes but BEFORE your global 404 handler.

const scannerWindowMs = rl.scanner_windowMs ?? 60 * 1000; // 1 minute
const scannerMax = rl.scanner_max ?? 10;                   // 10 unknown-path hits/min

export const scannerTrapLimiter = rateLimit({
  windowMs: scannerWindowMs,
  max: scannerMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.clientIP || req.ip,
  skip: (req) => {
    const ip = req.clientIP || req.ip;
    return ip === '127.0.0.1' || ip === '::1';
  },
  handler: (req, res) => {
    const ip = req.clientIP || req.ip;
    console.warn(`[RATE-LIMIT] 🔍 Scanner trap triggered | IP: ${ip} | ${req.method} ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'Too many requests.',
    });
  },
});
