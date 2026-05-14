import express from 'express';
import { getMyProfile, updateProfile, getStats, getActivityLogs } from '../controllers/providers.js';
import { authenticate, requireProvider } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireProvider);

router.get('/me', getMyProfile);
router.patch('/me', updateProfile);
router.get('/me/activity', getActivityLogs);
router.get('/stats', getStats);
import { uploadPhoto } from '../controllers/providers.js';
router.post('/me/photo', uploadPhoto);

export default router;
