import express from 'express';
import { getPublicStats, getPlatformReviews, getNotifications, markNotificationRead } from '../controllers/platform.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/stats', getPublicStats);
router.get('/reviews', getPlatformReviews);

// Protected routes
router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markNotificationRead);

export default router;
