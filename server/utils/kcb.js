import axios from 'axios';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { redis, redisKeys } from './redis.js';
import { db } from '../dbms/mysql.js';
import { ulid } from 'ulid';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, '../configs/params.json'), 'utf8'));

const KCB_ENV = (process.env.KCB_ENV || params.kcb_env || 'sandbox').trim();
const CONSUMER_KEY = (process.env.KCB_CONSUMER_KEY || params.kcb_consumer_key || '').trim();
const CONSUMER_SECRET = (process.env.KCB_CONSUMER_SECRET || params.kcb_consumer_secret || '').trim();

const BACKEND_URL = (process.env.BACKEND_URL || params.backend_url || '').replace(/\/$/, '');
const CALLBACK_URL = `${BACKEND_URL}/api/v1/payments/kcb/callback`;

// In-memory token cache for fallback when Redis is unavailable
const tokenCache = new Map();

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/**
 * Normalise a Kenyan phone number to 254XXXXXXXXX format.
 */
function normalisePhone(raw = '') {
  let phone = String(raw).replace(/[^0-9]/g, '');
  if (phone.startsWith('0'))        phone = '254' + phone.slice(1);
  if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone;
  return phone;
}

/**
 * Build a clean alphanumeric reference, max 20 chars (KCB limit).
 * Appends the last 4 ms digits to ensure uniqueness across retries.
 */
function buildReference(reference = '') {
  return `${reference}${Date.now().toString().slice(-4)}`
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 20);
}

/**
 * Extract a human-readable error message from an Axios error,
 * including the full raw body so nothing is silently swallowed.
 */
function extractError(error) {
  const status  = error.response?.status;
  const data    = error.response?.data;
  const message = data?.errorMessage
    || data?.message
    || data?.error_description
    || data?.error
    || error.message
    || 'Unknown error';

  return { status, message, raw: data };
}

// ─────────────────────────────────────────────────────────────
// Auth – OAuth2 token with Redis + in-memory dual-layer cache
// ─────────────────────────────────────────────────────────────

async function getAccessToken(customCredentials = null) {
  const key    = (customCredentials?.consumerKey    || CONSUMER_KEY).trim();
  const secret = (customCredentials?.consumerSecret || CONSUMER_SECRET).trim();
  const env    = (customCredentials?.env            || KCB_ENV).trim();

  if (!key || !secret) {
    throw new Error('KCB credentials (consumerKey / consumerSecret) are missing.');
  }

  // Auth endpoint differs by environment. 
  // Sandbox UAT uses /token?grant_type=client_credentials as per postman
  const url = env === 'production'
    ? 'https://api.kcbgroup.com/oauth2/token'
    : 'https://uat.buni.kcbgroup.com/token?grant_type=client_credentials';

  const cacheKey = `${redisKeys.kcbToken}:${key}`;
  
  // ... rest of auth logic remains same ...

  // 1. In-memory cache (fastest, works even when Redis is down)
  const memoryCached = tokenCache.get(cacheKey);
  if (memoryCached && memoryCached.expiry > Date.now()) {
    return memoryCached.token;
  }

  // 2. Redis cache
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      // Warm memory cache too
      tokenCache.set(cacheKey, { token: cached, expiry: Date.now() + 50 * 60 * 1000 });
      return cached;
    }
  } catch (redisErr) {
    console.warn('[KCB] Redis unavailable for token cache, continuing without it:', redisErr.message);
  }

  // 3. Fetch a fresh token
  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  const body = new URLSearchParams();
  body.append('grant_type', 'client_credentials');

  try {
    const res = await axios.post(url, body, {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      timeout: 15000,
    });

    const token = res.data?.access_token;
    if (!token) throw new Error('KCB did not return an access_token in the response.');

    // Cache for 55 min (token TTL is typically 60 min; we subtract 5 for safety)
    const TTL_SECONDS = 55 * 60;
    try { await redis.setEx(cacheKey, TTL_SECONDS, token); } catch (_) {}
    tokenCache.set(cacheKey, { token, expiry: Date.now() + TTL_SECONDS * 1000 });

    return token;
  } catch (error) {
    const { status, message, raw } = extractError(error);
    console.error('[KCB] Auth Error:', { status, message, raw, url });
    throw new Error(`KCB Auth [${status ?? 'NETWORK'}]: ${message}`);
  }
}

// ─────────────────────────────────────────────────────────────
// STK Push
// ─────────────────────────────────────────────────────────────

export async function initiateKcbStkPush(pushParams, customCredentials = null, metadata = {}) {
  const env    = (customCredentials?.env            || KCB_ENV).trim();
  const key    = (customCredentials?.consumerKey    || CONSUMER_KEY).trim();
  const secret = (customCredentials?.consumerSecret || CONSUMER_SECRET).trim();

  // ── Base URLs ──────────────────────────────────────────────
  const baseUrl = env === 'production'
    ? 'https://api.kcbgroup.com'
    : 'https://uat.buni.kcbgroup.com';

  // ── API paths ──────────────────────────────────────────────
  // Production uses /v1/mobilecheckout
  // UAT (sandbox) uses /stkpush as per postman
  const apiPath = env === 'production'
    ? '/v1/mobilecheckout'
    : '/mm/api/request/1.0.0/stkpush';

  // ── Guard: production must have real credentials ───────────
  if (env === 'production' && (!key || !secret)) {
    throw new Error('KCB PRODUCTION credentials are missing.');
  }

  // ── Simulation mode (local dev, no sandbox credentials) ───
  const isSimulation = params.env === 'development'
    && env === 'sandbox'
    && (!key || key.includes('placeholder') || key === '');

  if (isSimulation) {
    console.warn('[KCB] No sandbox credentials found – SIMULATING SUCCESS for development.');
    return {
      MerchantRequestID:  'sim_kcb_' + ulid(),
      CheckoutRequestID:  'sim_kcb_chk_' + ulid(),
      ResponseDescription: 'Success (simulated)',
    };
  }

  // ── Token ──────────────────────────────────────────────────
  const token = await getAccessToken(customCredentials);

  // ── Sanitise inputs ────────────────────────────────────────
  const phone          = normalisePhone(pushParams.phone);
  const cleanReference = buildReference(pushParams.reference);
  const amountStr      = String(Math.round(Number(pushParams.amount)));

  // ── Request body (Matching Postman exactly) ────────────────
  const requestBody = env === 'production' ? {
    request: {
      msisdn: phone,
      amount: Number(amountStr),
      invoiceNumber: cleanReference,
      transactionId: cleanReference,
      description: `Pay${cleanReference.slice(-8)}`,
      callbackUrl: CALLBACK_URL
    }
  } : {
    phoneNumber: phone,
    amount: amountStr,
    invoiceNumber: cleanReference,
    sharedShortCode: true,
    orgShortCode: "",
    orgPassKey: "",
    callbackUrl: CALLBACK_URL,
    transactionDescription: `Pay${cleanReference.slice(-8)}`
  };

  console.log('[KCB-DEBUG] Target Endpoint:', `${baseUrl}${apiPath}`);

  try {
    const res = await axios.post(`${baseUrl}${apiPath}`, requestBody, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type':  'application/json',
        'Accept':        'application/json',
        'routeCode':     '207',
        'operation':     'STKPush',
        'messageId':     cleanReference,
      },
      timeout: 15000,
    });

    // ── Guard: KCB occasionally returns HTML on gateway errors ──
    if (typeof res.data === 'string' && res.data.trimStart().startsWith('<')) {
      const text = res.data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 400);
      console.error('[KCB] Received HTML instead of JSON (gateway/proxy error):', text);
      throw new Error(`KCB Gateway returned HTML: ${text}`);
    }

    console.log('[KCB-DEBUG] Response:', JSON.stringify(res.data, null, 2));

    // KCB may return the ID under different keys depending on env
    const checkoutId = res.data?.CheckoutRequestID
      || res.data?.checkoutRequestId
      || res.data?.request?.id
      || ulid();

    // ── Persist to DB ──────────────────────────────────────────
    await db.query(`
      INSERT INTO kcblog
        (id, merchantRequestId, checkoutRequestId, phone, amount, reference,
         customerName, initiatorName, tenantName, tenantId, status, rawPayload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)
    `, [
      ulid(),
      res.data?.MerchantRequestID || null,
      checkoutId,
      phone,
      amount,
      pushParams.reference,
      metadata.customerName  || null,
      metadata.initiatorName || null,
      metadata.tenantName    || null,
      metadata.tenantId      || null,
      JSON.stringify(res.data),
    ]);

    return { ...res.data, CheckoutRequestID: checkoutId };

  } catch (error) {
    // ── Full diagnostic logging ────────────────────────────────
    const { status, message, raw } = extractError(error);
    console.error('[KCB] Push Error — HTTP status :', status);
    console.error('[KCB] Push Error — Message     :', message);
    console.error('[KCB] Push Error — Raw body    :', JSON.stringify(raw, null, 2));
    console.error('[KCB] Push Error — Stack       :', error.stack);

    // ── Persist failure to DB ──────────────────────────────────
    try {
      await db.query(`
        INSERT INTO kcblog
          (id, phone, amount, reference, customerName, initiatorName,
           tenantName, tenantId, status, resultDesc)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4, ?)
      `, [
        ulid(),
        pushParams.phone,
        pushParams.amount,
        pushParams.reference,
        metadata.customerName  || null,
        metadata.initiatorName || null,
        metadata.tenantName    || null,
        metadata.tenantId      || null,
        `[${status ?? 'ERR'}] ${message}`,
      ]);
    } catch (dbErr) {
      console.error('[KCB] Failed to log error to DB:', dbErr.message);
    }

    throw new Error(`[${status ?? 'ERR'}] ${message}`);
  }
}