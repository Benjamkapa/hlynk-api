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

const MPESA_ENV = (process.env.MPESA_ENV || params.mpesa_env || 'sandbox').trim();
const BASE_URL = MPESA_ENV === 'production' 
  ? 'https://api.safaricom.co.ke' 
  : 'https://sandbox.safaricom.co.ke';

const CONSUMER_KEY = (process.env.MPESA_CONSUMER_KEY || params.mpesa_consumer_key || '').trim();
const CONSUMER_SECRET = (process.env.MPESA_CONSUMER_SECRET || params.mpesa_consumer_secret || '').trim();
const BUSINESS_SHORT_CODE = (process.env.MPESA_SHORTCODE || params.mpesa_shortcode || '').trim();
const PASSKEY = (process.env.MPESA_PASSKEY || params.mpesa_passkey || '').trim();

const BACKEND_URL = (process.env.BACKEND_URL || params.backend_url || '').replace(/\/$/, '');
const CALLBACK_URL = `${BACKEND_URL}/api/v1/payments/mpesa/callback`;

if (!BACKEND_URL || BACKEND_URL.includes('localhost')) {
  console.warn('[MPESA] WARNING: BACKEND_URL is set to localhost or empty. Safaricom callbacks will fail.');
}

// In-memory cache for fallback when redis is a mock or fails
const tokenCache = new Map();

async function getAccessToken(customCredentials = null) {
  const cacheKey = customCredentials 
    ? `${redisKeys.mpesaToken}:${customCredentials.consumerKey}`
    : redisKeys.mpesaToken;
    
  // 1. Try in-memory fallback FIRST (Super Fast)
  const memoryCached = tokenCache.get(cacheKey);
  if (memoryCached && memoryCached.expiry > Date.now()) {
    return memoryCached.token;
  }

  // 2. Try Redis (Network call / Potential Delay)
  try {
    const cached = await redis.get(cacheKey);
    if (cached) return cached;
  } catch (redisErr) {
    console.warn('[MPESA] Redis Token Check Failed:', redisErr.message);
  }

  const key = customCredentials?.consumerKey || CONSUMER_KEY;
  const secret = customCredentials?.consumerSecret || CONSUMER_SECRET;
  const env = customCredentials?.env || MPESA_ENV;
  const url = env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  try {
    console.log(`[MPESA] Auth Attempt | Env: ${env} | Key Prefix: ${key.substring(0, 4)}...`);
    const res = await axios.get(`${url}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { 
        Authorization: `Basic ${auth}`,
        'User-Agent': 'hlynk-api/1.0.0'
      },
      timeout: 15000 // 15 seconds timeout (reduced from 25)
    });
    const token = res.data.access_token;
    
    // Save to Redis
    await redis.setEx(cacheKey, 3300, token);
    
    // Save to in-memory fallback (valid for 50 minutes)
    tokenCache.set(cacheKey, {
      token,
      expiry: Date.now() + 50 * 60 * 1000
    });

    return token;
  } catch (error) {
    const errorMsg = error.response?.data?.errorMessage || error.response?.data?.message || error.message;
    console.error('[MPESA] Auth Error:', errorMsg);
    
    // Clear cache on auth failure so next attempt tries fresh
    await redis.del(cacheKey);
    tokenCache.delete(cacheKey);
    
    throw new Error(`M-Pesa Auth: ${errorMsg}`);
  }
}

export async function initiateStkPush(pushParams, customCredentials = null, metadata = {}) {
  const env = customCredentials?.env || MPESA_ENV;
  const key = customCredentials?.consumerKey || CONSUMER_KEY;
  const secret = customCredentials?.consumerSecret || CONSUMER_SECRET;
  const shortcode = customCredentials?.shortcode || BUSINESS_SHORT_CODE;
  const passkey = customCredentials?.passkey || PASSKEY;
  const url = env === 'production' ? 'https://api.safaricom.co.ke' : 'https://sandbox.safaricom.co.ke';

  if (env === 'production' && (!key || !secret)) {
    throw new Error('M-Pesa PRODUCTION credentials missing.');
  }

  // Simulation for dev
  if (params.env === 'development' && env === 'sandbox' && (!key || key.includes('placeholder'))) {
    console.warn('[MPESA] SIMULATING SUCCESS');
    return { MerchantRequestID: 'sim_123', CheckoutRequestID: 'sim_chk_123', ResponseDescription: 'Success' };
  }

  const token = await getAccessToken(customCredentials);
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  let phone = pushParams.phone.replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '254' + phone.slice(1);
  if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone;

  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(pushParams.amount),
    PartyA: phone,
    PartyB: shortcode,
    PhoneNumber: phone,
    CallBackURL: CALLBACK_URL,
    AccountReference: pushParams.reference,
    TransactionDesc: `Payment for ${pushParams.reference}`
  };

  try {
    const res = await axios.post(`${url}/mpesa/stkpush/v1/processrequest`, body, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'User-Agent': 'hlynk-api/1.0.0'
      },
      timeout: 15000 // 15 seconds timeout (reduced from 30)
    });

    // Log the initiation
    await db.query(`
      INSERT INTO mpesalog (id, merchantRequestId, checkoutRequestId, phone, amount, reference, customerName, initiatorName, tenantName, tenantId, type, status, isRented, rawPayload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 2, ?, ?)
    `, [
      ulid(), 
      res.data.MerchantRequestID, 
      res.data.CheckoutRequestID, 
      phone, 
      pushParams.amount, 
      pushParams.reference,
      metadata.customerName || null,
      metadata.initiatorName || null,
      metadata.tenantName || null,
      metadata.tenantId || null,
      metadata.isRented ? 1 : 0,
      JSON.stringify(res.data)
    ]);

    return res.data;
  } catch (error) {
    const errorMsg = error.response?.data?.errorMessage || error.response?.data?.message || error.message;
    console.error('[MPESA] Push Error:', errorMsg);
    
    // Log the failure
    await db.query(`
      INSERT INTO mpesalog (id, phone, amount, reference, customerName, initiatorName, tenantName, tenantId, type, status, isRented, resultDesc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 4, ?, ?)
    `, [
      ulid(), 
      pushParams.phone, 
      pushParams.amount, 
      pushParams.reference,
      metadata.customerName || null,
      metadata.initiatorName || null,
      metadata.tenantName || null,
      metadata.tenantId || null,
      metadata.isRented ? 1 : 0,
      errorMsg
    ]);

    throw new Error(error.response?.data?.errorMessage || 'M-Pesa STK Push failed.');
  }
}

export async function queryStkPush(checkoutRequestId) {
  if (params.env === 'development' && MPESA_ENV === 'sandbox' && (!CONSUMER_KEY || CONSUMER_KEY.includes('placeholder'))) {
    return { ResultCode: '0', ResultDesc: 'Simulated query success' };
  }

  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(`${BUSINESS_SHORT_CODE}${PASSKEY}${timestamp}`).toString('base64');

  const body = {
    BusinessShortCode: BUSINESS_SHORT_CODE,
    Password: password,
    Timestamp: timestamp,
    CheckoutRequestID: checkoutRequestId
  };

  try {
    const res = await axios.post(`${BASE_URL}/mpesa/stkpushquery/v1/query`, body, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'User-Agent': 'hlynk-api/1.0.0'
      },
      timeout: 25000 // 25 seconds timeout
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.errorMessage || 'Failed to query STK Push status.');
  }
}
