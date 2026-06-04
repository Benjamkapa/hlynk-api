/**
 * eTIMS Controller
 * ================
 * Handles all eTIMS REST endpoints:
 *   POST  /api/v1/etims/credentials      - Save / update KRA credentials
 *   GET   /api/v1/etims/credentials      - Fetch current credentials (masked)
 *   POST  /api/v1/etims/init             - Initialize device with KRA (get comm key)
 *   POST  /api/v1/etims/invoices/:saleId - Manually push a single invoice
 *   GET   /api/v1/etims/invoices         - List invoice history for the provider
 *   DELETE /api/v1/etims/credentials     - Remove / disable eTIMS for this provider
 */

import { db } from '../dbms/mysql.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { initDevice, submitInvoice } from '../utils/etims.js';
import { minioClient, bucketName } from '../utils/storage.js';
import { ulid } from 'ulid';

// ─────────────────────────────────────────────────────────────
// Helper: get decrypted credentials from DB for a provider
// ─────────────────────────────────────────────────────────────
async function getProviderCredentials(tenantId) {
  const [rows] = await db.query(
    `SELECT * FROM etims_credentials WHERE provider_id = ? LIMIT 1`,
    [tenantId]
  );
  if (!rows.length) return null;

  const creds = rows[0];
  return {
    ...creds,
    cert_password: creds.cert_password ? decrypt(creds.cert_password) : null,
    cmc_key:       creds.cmc_key       ? decrypt(creds.cmc_key)       : null,
  };
}

// ─────────────────────────────────────────────────────────────
// POST /api/v1/etims/credentials
// Save (or update) provider's KRA eTIMS credentials
// ─────────────────────────────────────────────────────────────
export const saveCredentials = async (req, res) => {
  const { tenantId } = req.user;
  const { kra_pin, branch_id = '00', device_serial_number, cert_password, certificate_b64, env = 'sandbox' } = req.body;

  if (!kra_pin || !device_serial_number || !cert_password || !certificate_b64) {
    return res.status(400).json({ success: false, message: 'KRA PIN, Device Serial Number, Certificate, and Password are required.' });
  }

  try {
    const encryptedPwd = encrypt(cert_password);
    
    // Store Certificate in MinIO instead of Database blob
    let storedCertPath = certificate_b64;
    if (certificate_b64 && !certificate_b64.startsWith('certs/')) {
        const buffer = Buffer.from(certificate_b64, 'base64');
        const fileName = `certs/${tenantId}-${Date.now()}.pfx`;
        await minioClient.putObject(bucketName, fileName, buffer, buffer.length, {
            'Content-Type': 'application/x-pkcs12'
        });
        storedCertPath = fileName;
    }

    await db.query(`
      INSERT INTO etims_credentials (provider_id, kra_pin, branch_id, device_serial_number, cert_password, certificate_b64, env, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        kra_pin              = VALUES(kra_pin),
        branch_id            = VALUES(branch_id),
        device_serial_number = VALUES(device_serial_number),
        cert_password        = VALUES(cert_password),
        certificate_b64      = VALUES(certificate_b64),
        env                  = VALUES(env),
        status               = 'pending',
        cmc_key              = NULL,
        updated_at           = NOW()
    `, [tenantId, kra_pin.toUpperCase(), branch_id, device_serial_number, encryptedPwd, storedCertPath, env]);

    return res.json({ success: true, message: 'Credentials saved. Proceed to initialize device with KRA.' });
  } catch (err) {
    console.error('[eTIMS] saveCredentials error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to save credentials.' });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/etims/credentials
// ─────────────────────────────────────────────────────────────
export const getCredentials = async (req, res) => {
  const { tenantId } = req.user;
  try {
    const [rows] = await db.query(
      `SELECT id, provider_id, kra_pin, branch_id, device_serial_number, env, status, created_at, updated_at FROM etims_credentials WHERE provider_id = ? LIMIT 1`,
      [tenantId]
    );
    if (!rows.length) {
      return res.json({ success: true, data: null });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (err) {
    console.error('[eTIMS] getCredentials error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch credentials.' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/v1/etims/init
// Initialize device with KRA — fetches and stores the Communication Key
// ─────────────────────────────────────────────────────────────
export const initializeDevice = async (req, res) => {
  const { tenantId } = req.user;
  try {
    const creds = await getProviderCredentials(tenantId);
    if (!creds) {
      return res.status(404).json({ success: false, message: 'No eTIMS credentials found. Please save credentials first.' });
    }

    const result = await initDevice({
      kra_pin:              creds.kra_pin,
      branch_id:            creds.branch_id,
      device_serial_number: creds.device_serial_number,
      env:                  creds.env || 'sandbox',
    });

    await db.query(`
      UPDATE etims_credentials
      SET cmc_key = ?, status = 'active', updated_at = NOW()
      WHERE provider_id = ?
    `, [encrypt(result.communicationKey), tenantId]);

    return res.json({
      success: true,
      message: 'Device initialized successfully. eTIMS is now active.',
      resultCd:  result.resultCd,
      resultMsg: result.resultMsg,
    });
  } catch (err) {
    console.error('[eTIMS] initializeDevice error:', err.message);
    await db.query(`UPDATE etims_credentials SET status = 'error', updated_at = NOW() WHERE provider_id = ?`, [tenantId]).catch(() => {});
    return res.status(502).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/v1/etims/invoices/:saleId
// Manually (re)push a sale invoice to KRA
// ─────────────────────────────────────────────────────────────
export const pushInvoice = async (req, res) => {
  const { tenantId } = req.user;
  const { saleId } = req.params;

  try {
    const result = await pushSaleToEtims(tenantId, saleId);
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('[eTIMS] pushInvoice error:', err.message);
    return res.status(502).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/etims/invoices
// List invoice sync history for this provider
// ─────────────────────────────────────────────────────────────
export const listInvoices = async (req, res) => {
  const { tenantId } = req.user;
  const { page = 1, limit = 50 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  try {
    const [invoices] = await db.query(`
      SELECT
        ei.*,
        s.totalAmount,
        s.customerName,
        s.paymentMethod,
        s.createdAt as saleDate
      FROM etims_invoices ei
      LEFT JOIN sale s ON s.id = ei.payment_id
      WHERE ei.provider_id = ?
      ORDER BY ei.created_at DESC
      LIMIT ? OFFSET ?
    `, [tenantId, Number(limit), offset]);

    const [countRes] = await db.query(
      `SELECT COUNT(*) as total FROM etims_invoices WHERE provider_id = ?`,
      [tenantId]
    );

    return res.json({
      success: true,
      data: {
        items: invoices,
        pagination: {
          total:      Number(countRes[0].total),
          totalPages: Math.ceil(Number(countRes[0].total) / Number(limit)),
          page:       Number(page),
          limit:      Number(limit),
        },
      },
    });
  } catch (err) {
    console.error('[eTIMS] listInvoices error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch invoice history.' });
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/v1/etims/credentials
// Disable eTIMS for this provider
// ─────────────────────────────────────────────────────────────
export const deleteCredentials = async (req, res) => {
  const { tenantId } = req.user;
  try {
    await db.query(`DELETE FROM etims_credentials WHERE provider_id = ?`, [tenantId]);
    return res.json({ success: true, message: 'eTIMS integration disabled and credentials removed.' });
  } catch (err) {
    console.error('[eTIMS] deleteCredentials error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to remove credentials.' });
  }
};

// ─────────────────────────────────────────────────────────────
// INTERNAL — Called automatically after a successful sale
// Exported so sales.js and payments.js can call it directly
// ─────────────────────────────────────────────────────────────
export async function pushSaleToEtims(tenantId, saleId) {
  // 1. Check if this provider has active eTIMS credentials
  const creds = await getProviderCredentials(tenantId);
  if (!creds || creds.status !== 'active' || !creds.cmc_key) {
    return null; // eTIMS not active for this provider — silently skip
  }

  // 2. Fetch sale + items
  const [[sale]] = await db.query(`SELECT * FROM sale WHERE id = ? AND tenantId = ? LIMIT 1`, [saleId, tenantId]);
  if (!sale) throw new Error(`Sale ${saleId} not found for tenant ${tenantId}`);

  const [items] = await db.query(`SELECT * FROM saleitem WHERE saleId = ?`, [saleId]);
  sale.items = items;

  // 3. Check if already successfully pushed
  const [existing] = await db.query(
    `SELECT id, status FROM etims_invoices WHERE payment_id = ? LIMIT 1`,
    [saleId]
  );
  if (existing.length && existing[0].status === 'success') {
    return { alreadyPushed: true, invoice: existing[0] };
  }

  // 4. Get next sequential invoice number for this provider
  const [countRes] = await db.query(
    `SELECT COUNT(*) as total FROM etims_invoices WHERE provider_id = ?`,
    [tenantId]
  );
  const invoiceNumber = Number(countRes[0].total) + 1;

  // 5. Attempt to push to KRA
  let invoiceId     = existing.length ? existing[0].id : ulid();
  let status        = 'pending';
  let kraReceiptNumber = null;
  let qrCodeUrl     = null;
  let errorMessage  = null;

  try {
    const result = await submitInvoice(
      {
        kra_pin:           creds.kra_pin,
        branch_id:         creds.branch_id,
        communication_key: creds.cmc_key,
        cert_password:     creds.cert_password,
        certificate_b64:   creds.certificate_b64,
        env:               creds.env || 'sandbox',
      },
      sale,
      invoiceNumber
    );

    status           = 'success';
    kraReceiptNumber = result.kraReceiptNumber;
    qrCodeUrl        = result.qrCode;

    console.log(`[eTIMS] ✅ Invoice pushed for Sale ${saleId} | KRA Receipt: ${kraReceiptNumber}`);
  } catch (err) {
    status       = 'failed';
    errorMessage = err.message;
    console.error(`[eTIMS] ❌ Invoice push failed for Sale ${saleId}: ${err.message}`);
  }

  // 6. Upsert into etims_invoices
  if (existing.length) {
    await db.query(`
      UPDATE etims_invoices
      SET status = ?, kra_receipt_number = ?, qr_code_url = ?, error_message = ?, 
          invoice_number = ?, retry_count = retry_count + 1, updated_at = NOW()
      WHERE id = ?
    `, [status, kraReceiptNumber, qrCodeUrl, errorMessage, invoiceNumber, invoiceId]);
  } else {
    await db.query(`
      INSERT INTO etims_invoices (id, provider_id, payment_id, invoice_number, kra_receipt_number, qr_code_url, status, error_message, retry_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
    `, [invoiceId, tenantId, saleId, invoiceNumber, kraReceiptNumber, qrCodeUrl, status, errorMessage]);
  }

  return { status, kraReceiptNumber, qrCodeUrl, errorMessage };
}
