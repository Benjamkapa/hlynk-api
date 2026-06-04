/**
 * KRA eTIMS OSCU Service (System-to-System Integration)
 * ======================================================
 * Standalone, reusable service for interacting with the KRA eTIMS API.
 * Supports both SANDBOX and PRODUCTION environments.
 *
 * Flow:
 *   1. Provider saves credentials (KRA PIN, Branch ID, Device Serial, API Key)
 *   2. On first use, call initDevice() to get a Communication Key from KRA
 *   3. On every sale, call submitInvoice() to push a KRA-compliant invoice
 *
 * Environments:
 *   Sandbox:    https://etims-api-sbx.kra.go.ke
 *   Production: https://etims-api.kra.go.ke
 */

const ETIMS_ENDPOINTS = {
  sandbox:    'https://etims-api-sbx.kra.go.ke',
  production: 'https://etims-api.kra.go.ke',
};

// KRA eTIMS API paths
const PATHS = {
  initDevice:     '/etims-api/selectInitOsdcInfo',
  submitInvoice:  '/etims-api/saveTrnsSalesOsdc',
};

/**
 * Format a Date to KRA's required format: YYYYMMDDHHmmss
 */
function formatKraDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return (
    date.getFullYear() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Low-level HTTP POST to the KRA eTIMS API.
 * @param {string} env  - 'sandbox' | 'production'
 * @param {string} path - API path
 * @param {object} body - JSON payload
 * @param {string} [cmcKey] - Communication Key (required after device init)
 */
async function kraPost(env, path, body, cmcKey = null) {
  const baseUrl = ETIMS_ENDPOINTS[env] || ETIMS_ENDPOINTS.sandbox;
  const url = `${baseUrl}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    'Accept':       'application/json',
  };

  // The communication key, once obtained, is sent as a header on every request
  if (cmcKey) {
    headers['cmcKey'] = cmcKey;
  }

  const response = await fetch(url, {
    method:  'POST',
    headers,
    body:    JSON.stringify(body),
    // 15-second timeout
    signal:  AbortSignal.timeout(15000),
  });

  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`KRA returned non-JSON response (HTTP ${response.status}): ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    throw new Error(`KRA API error (HTTP ${response.status}): ${data?.resultMsg || text}`);
  }

  return data;
}

/**
 * Step 1 — Device Initialization
 * Sends the provider's device info to KRA. On success, KRA returns a
 * Communication Key that must be stored and used for all future calls.
 *
 * @param {object} credentials
 * @param {string} credentials.kra_pin            - Taxpayer PIN (TIN)
 * @param {string} credentials.branch_id          - Branch ID (default '00')
 * @param {string} credentials.device_serial_number
 * @param {string} [credentials.env]              - 'sandbox' | 'production'
 * @returns {Promise<{ communicationKey: string, resultCd: string, resultMsg: string }>}
 */
export async function initDevice(credentials) {
  const { kra_pin, branch_id = '00', device_serial_number, env = 'sandbox' } = credentials;

  if (!kra_pin || !device_serial_number) {
    throw new Error('KRA PIN and Device Serial Number are required for device initialization.');
  }

  const payload = {
    tin:      kra_pin,
    bhfId:    branch_id,
    dvcSrlNo: device_serial_number,
  };

  const result = await kraPost(env, PATHS.initDevice, payload);

  // KRA returns resultCd '000' for success
  if (result.resultCd !== '000') {
    throw new Error(`KRA Device Init Failed [${result.resultCd}]: ${result.resultMsg || 'Unknown error'}`);
  }

  const communicationKey = result.data?.info?.cmcKey || result.cmcKey || result.data?.cmcKey;
  if (!communicationKey) {
    throw new Error('KRA did not return a Communication Key. Check your credentials.');
  }

  return {
    communicationKey,
    resultCd:  result.resultCd,
    resultMsg: result.resultMsg,
    rawData:   result.data,
  };
}

/**
 * Step 2 — Submit a Sales Invoice to KRA
 * Pushes a fully-structured invoice. On success, KRA returns a receipt number
 * and a QR code value for printing on the customer receipt.
 *
 * @param {object} credentials
 * @param {string} credentials.kra_pin
 * @param {string} credentials.branch_id
 * @param {string} credentials.communication_key
 * @param {string} [credentials.env]
 * @param {object} sale  - The sale object from Hlynk's database
 * @param {string} sale.id
 * @param {number} sale.totalAmount
 * @param {string} [sale.customerName]
 * @param {string} [sale.paymentMethod]   - 'CASH', 'MPESA', etc.
 * @param {Array}  sale.items             - Array of { name, quantity, price }
 * @param {string} invoiceNumber          - Sequential invoice number (e.g. '1', '2', ...)
 * @returns {Promise<{ kraReceiptNumber: string, qrCode: string, resultCd: string }>}
 */
export async function submitInvoice(credentials, sale, invoiceNumber) {
  const {
    kra_pin,
    branch_id = '00',
    communication_key,
    env = 'sandbox',
  } = credentials;

  if (!communication_key) {
    throw new Error('Communication Key missing. Device must be initialized first.');
  }

  const now = new Date();
  const totalAmount  = Number(sale.totalAmount) || 0;

  // KRA uses 16% standard VAT (VAT-inclusive pricing common in Kenya)
  // taxblAmt = taxable amount (before VAT)
  // taxAmt   = VAT amount
  // totAmt   = total (taxblAmt + taxAmt = totalAmount)
  const vatRate = 0.16;
  const taxblAmt = Math.round((totalAmount / (1 + vatRate)) * 100) / 100;
  const taxAmt   = Math.round((totalAmount - taxblAmt) * 100) / 100;

  // Map payment method to KRA payment type code
  const paymentTypeMap = {
    CASH:  'CASH',
    MPESA: 'MPESA',
    MPESA_STK: 'MPESA',
    CARD:  'CARD',
    CREDIT: 'CREDIT',
  };
  const pmtTyCd = paymentTypeMap[(sale.paymentMethod || 'CASH').toUpperCase()] || 'CASH';

  // Build line items
  const salesTrnsItems = (sale.items || []).map((item, idx) => {
    const itemTotal = Number(item.price) * Number(item.quantity);
    const itemTaxbl = Math.round((itemTotal / (1 + vatRate)) * 100) / 100;
    const itemTax   = Math.round((itemTotal - itemTaxbl) * 100) / 100;

    return {
      itemSeq:   idx + 1,
      itemCd:    item.productId || `ITEM${String(idx + 1).padStart(3, '0')}`,
      itemClsCd: '5020230000', // KRA general goods classification code
      itemNm:    (item.name || 'Item').slice(0, 50),
      bcd:       '',
      pkgUnt:    'EA',
      qty:       Number(item.quantity),
      prc:       Number(item.price),
      splyAmt:   itemTotal,
      dcRt:      0,
      dcAmt:     0,
      isrccCd:   '',
      isrccNm:   '',
      isrcRt:    0,
      isrcAmt:   0,
      taxTyCd:   'B',         // B = 16% VAT (standard Kenya VAT type)
      taxblAmt:  itemTaxbl,
      taxAmt:    itemTax,
      totAmt:    itemTotal,
    };
  });

  const payload = {
    tin:       kra_pin,
    bhfId:     branch_id,
    invcNo:    String(invoiceNumber),
    orgInvcNo: 0,
    cisInvcNo: String(invoiceNumber),

    // Transaction Date/Time
    salesDt:   formatKraDate(now).slice(0, 8), // YYYYMMDD
    stockRlsDt: null,

    // Customer info (walk-in customer if not registered)
    custTin:   null,
    custNm:    (sale.customerName || 'Walk-in Customer').slice(0, 100),
    rcptTyCd:  'S',   // S = Normal Sale
    pmtTyCd,
    salesSttsCd: '02', // Completed

    // Totals
    taxblAmtA: 0,
    taxblAmtB: taxblAmt,
    taxblAmtC: 0,
    taxblAmtD: 0,
    taxRtA:    0,
    taxRtB:    16,
    taxRtC:    0,
    taxRtD:    0,
    taxAmtA:   0,
    taxAmtB:   taxAmt,
    taxAmtC:   0,
    taxAmtD:   0,
    totTaxblAmt: taxblAmt,
    totTaxAmt:   taxAmt,
    totAmt:      totalAmount,

    // Remark
    remark:    `Hlynk Sale #${String(sale.id).slice(-8).toUpperCase()}`,

    // Line items
    salesTrnsItems,
  };

  const result = await kraPost(env, PATHS.submitInvoice, payload, communication_key);

  if (result.resultCd !== '000') {
    throw new Error(`KRA Invoice Rejected [${result.resultCd}]: ${result.resultMsg || 'Unknown error'}`);
  }

  const info = result.data?.info || result.data || {};

  return {
    kraReceiptNumber: info.rcptNo    || info.invcNo    || String(invoiceNumber),
    qrCode:           info.qrCode   || info.intrlData  || '',
    signKey:          info.rcptSign || '',
    resultCd:         result.resultCd,
    resultMsg:        result.resultMsg,
    rawData:          result.data,
  };
}
