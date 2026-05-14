import axios from 'axios';
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { redis, redisKeys } from './redis.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const params = JSON.parse(fs.readFileSync(path.join(__dirname, '../configs/params.json'), 'utf8'));

const MPESA_ENV = process.env.MPESA_ENV || params.mpesa_env || 'sandbox';
const BASE_URL = MPESA_ENV === 'production' 
  ? 'https://api.safaricom.co.ke' 
  : 'https://sandbox.safaricom.co.ke';

const CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY || params.mpesa_consumer_key;
const CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET || params.mpesa_consumer_secret;
const BUSINESS_SHORT_CODE = process.env.MPESA_SHORTCODE || params.mpesa_shortcode;
const PASSKEY = process.env.MPESA_PASSKEY || params.mpesa_passkey;

const CALLBACK_URL = `${process.env.BACKEND_URL || params.backend_url}/api/v1/payments/mpesa/callback`;
console.log('[MPESA] Generated Callback URL:', CALLBACK_URL);

async function getAccessToken() {
  const cacheKey = redisKeys.mpesaToken;
  const cached = await redis.get(cacheKey);
  if (cached) return cached;

  const auth = Buffer.from(`${CONSUMER_KEY}:${CONSUMER_SECRET}`).toString('base64');
  try {
    const res = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
      headers: { Authorization: `Basic ${auth}` }
    });
    const token = res.data.access_token;
    await redis.setEx(cacheKey, 3300, token);
    return token;
  } catch (error) {
    const errorMsg = error.response?.data?.errorMessage || error.response?.data?.message || error.message;
    console.error('[MPESA] Auth Error:', errorMsg);
    throw new Error(`M-Pesa Auth: ${errorMsg}`);
  }
}

export async function initiateStkPush(pushParams) {
  if (MPESA_ENV === 'production' && (!CONSUMER_KEY || !CONSUMER_SECRET)) {
    throw new Error('M-Pesa PRODUCTION credentials missing.');
  }

  // Simulation for dev
  if (params.env === 'development' && MPESA_ENV === 'sandbox' && (!CONSUMER_KEY || CONSUMER_KEY.includes('placeholder'))) {
    console.warn('[MPESA] SIMULATING SUCCESS');
    return { MerchantRequestID: 'sim_123', CheckoutRequestID: 'sim_chk_123', ResponseDescription: 'Success' };
  }

  const token = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(`${BUSINESS_SHORT_CODE}${PASSKEY}${timestamp}`).toString('base64');

  let phone = pushParams.phone.replace(/[^0-9]/g, '');
  if (phone.startsWith('0')) phone = '254' + phone.slice(1);
  if (phone.startsWith('7') || phone.startsWith('1')) phone = '254' + phone;

  const body = {
    BusinessShortCode: BUSINESS_SHORT_CODE,
    Password: password,
    Timestamp: timestamp,
    TransactionType: 'CustomerPayBillOnline',
    Amount: Math.round(pushParams.amount),
    PartyA: phone,
    PartyB: BUSINESS_SHORT_CODE,
    PhoneNumber: phone,
    CallBackURL: CALLBACK_URL,
    AccountReference: pushParams.reference,
    TransactionDesc: `Payment for ${pushParams.reference}`
  };

  try {
    const res = await axios.post(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, body, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error) {
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
      headers: { Authorization: `Bearer ${token}` }
    });
    return res.data;
  } catch (error) {
    throw new Error(error.response?.data?.errorMessage || 'Failed to query STK Push status.');
  }
}
