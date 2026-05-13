import express from 'express';
import { getSystemStats, listTenants, getSystemHealth } from '../controllers/admin.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireAdmin);

router.get('/stats', getSystemStats);
router.get('/tenants', listTenants);
router.get('/health', getSystemHealth);

export default router;
