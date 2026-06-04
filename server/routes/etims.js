import express from 'express';
import { authenticate, requireOwner } from '../middleware/auth.js';
import {
  saveCredentials,
  getCredentials,
  initializeDevice,
  pushInvoice,
  listInvoices,
  deleteCredentials,
} from '../controllers/etims.js';

const router = express.Router();

// All eTIMS routes require login. Credential management is owner-only.

/** GET  /api/v1/etims/credentials — fetch current creds (masked) */
router.get('/credentials',  authenticate, requireOwner, getCredentials);

/** POST /api/v1/etims/credentials — save / update KRA credentials */
router.post('/credentials', authenticate, requireOwner, saveCredentials);

/** POST /api/v1/etims/init — initialize device with KRA & get comm key */
router.post('/init',        authenticate, requireOwner, initializeDevice);

/** GET  /api/v1/etims/invoices — invoice sync history */
router.get('/invoices',     authenticate, listInvoices);

/** POST /api/v1/etims/invoices/:saleId — manually (re)push a sale invoice */
router.post('/invoices/:saleId', authenticate, requireOwner, pushInvoice);

/** DELETE /api/v1/etims/credentials — disable eTIMS for this provider */
router.delete('/credentials', authenticate, requireOwner, deleteCredentials);

export default router;
