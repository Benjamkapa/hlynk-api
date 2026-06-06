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

// In-memory cache for fallback
const tokenCache = new Map();

async function getAccessToken(customCredentials = null) {
  const key = customCredentials?.consumerKey || CONSUMER_KEY;
  const secret = customCredentials?.consumerSecret || CONSUMER_SECRET;
  const env = customCredentials?.env || KCB_ENV;
  const url = env === 'production' ? 'https://api.kcbgroup.com' : 'https://sandbox.buni.kcbgroup.com';

  const cacheKey = `${redisKeys.kcbToken}:${key}`;
    
  const memoryCached = tokenCache.get(cacheKey);
  if (memoryCached && memoryCached.expiry > Date.now()) {
    return memoryCached.token;
  }

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return cached;
  } catch (err) {}

  const auth = Buffer.from(`${key}:${secret}`).toString('base64');
  try {
    // Try POST first as it's more standard for modern KCB/Buni OAuth
    const res = await axios.post(`${url}/oauth/v1/generate?grant_type=client_credentials`, {}, {
      headers: { 
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      timeout: 15000
    });
    const token = res.data.access_token;
    
    if (!token) throw new Error('No access token returned');

    await redis.setEx(cacheKey, 3300, token);
    tokenCache.set(cacheKey, { token, expiry: Date.now() + 50 * 60 * 1000 });

    return token;
  } catch (error) {
    // Fallback to GET if POST fails (for older sandbox versions)
    if (error.response?.status === 405 || error.response?.status === 404) {
       try {
         const res = await axios.get(`${url}/oauth/v1/generate?grant_type=client_credentials`, {
           headers: { Authorization: `Basic ${auth}` },
           timeout: 15000
         });
         return res.data.access_token;
       } catch (getErr) {
         throw new Error(`KCB Auth (GET Fallback): ${getErr.response?.data?.errorMessage || getErr.message}`);
       }
    }

    const errorData = error.response?.data;
    const errorMsg = errorData?.errorMessage || errorData?.message || errorData?.error_description || error.message;
    console.error('[KCB] Auth Error:', {
      status: error.response?.status,
      message: errorMsg,
      url: `${url}/oauth/v1/generate`
    });
    throw new Error(`KCB Auth [${error.response?.status || '500'}]: ${errorMsg}`);
  }
}

export async function initiateKcbStkPush(pushParams, customCredentials = null, metadata = {}) {
  const env = customCredentials?.env || KCB_ENV;
  const key = customCredentials?.consumerKey || CONSUMER_KEY;
  const secret = customCredentials?.consumerSecret || CONSUMER_SECRET;
  const url = env === 'production' ? 'https://api.kcbgroup.com' : 'https://sandbox.buni.kcbgroup.com';

  if (env === 'production' && (!key || !secret)) {
    throw new Error('KCB PRODUCTION credentials missing.');
  }

  // Simulation for dev
  if (params.env === 'development' && env === 'sandbox' && (!key || key.includes('placeholder') || key === '')) {
    console.warn('[KCB] SIMULATING SUCCESS');
    return { MerchantRequestID: 'sim_kcb_123', CheckoutRequestID: 'sim_kcb_chk_123', ResponseDescription: 'Success' };
  }

  const token = await getAccessToken(customCredentials);

  let phone = pushParams.phone.replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '254' + phone.slice(1);
  if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone;

  const body = {
    request: {
      phoneNumber: phone,
      amount: Math.round(pushParams.amount),
      invoiceNumber: pushParams.reference,
      description: `Payment for ${pushParams.reference}`,
      callbackUrl: CALLBACK_URL
    }
  };

  try {
    const res = await axios.post(`${url}/v1/mobilecheckout`, body, {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    // KCB Standard response contains CheckoutRequestID or similar
    const checkoutId = res.data?.CheckoutRequestID || res.data?.request?.id || ulid();

    await db.query(`
      INSERT INTO kcblog (id, merchantRequestId, checkoutRequestId, phone, amount, reference, customerName, initiatorName, tenantName, tenantId, status, rawPayload)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?)
    `, [
      ulid(), 
      res.data?.MerchantRequestID || null, 
      checkoutId, 
      phone, 
      pushParams.amount, 
      pushParams.reference,
      metadata.customerName || null,
      metadata.initiatorName || null,
      metadata.tenantName || null,
      metadata.tenantId || null,
      JSON.stringify(res.data)
    ]);

    return { ...res.data, CheckoutRequestID: checkoutId };
  } catch (error) {
    const errorMsg = error.response?.data?.errorMessage || error.response?.data?.message || error.message;
    console.error('[KCB] Push Error:', errorMsg);
    
    await db.query(`
      INSERT INTO kcblog (id, phone, amount, reference, customerName, initiatorName, tenantName, tenantId, status, resultDesc)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 4, ?)
    `, [
      ulid(), 
      pushParams.phone, 
      pushParams.amount, 
      pushParams.reference,
      metadata.customerName || null,
      metadata.initiatorName || null,
      metadata.tenantName || null,
      metadata.tenantId || null,
      errorMsg
    ]);

    throw new Error(errorMsg || 'KCB STK Push failed.');
  }
}
