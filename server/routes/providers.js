import express from 'express';
import { getMyProfile, updateProfile, getStats } from '../controllers/providers.js';
import { authenticate, requireProvider } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireProvider);

router.get('/profile', getMyProfile);
router.patch('/profile', updateProfile);
router.get('/stats', getStats);

export default router;
