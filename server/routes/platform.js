import express from 'express';
import { getPublicStats, getPlatformReviews, getNotifications, markNotificationRead, clearNotifications, submitPlatformReview } from '../controllers/platform.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/stats', getPublicStats);
router.get('/reviews', getPlatformReviews);

// Protected routes
router.get('/notifications', authenticate, getNotifications);
router.patch('/notifications/:id/read', authenticate, markNotificationRead);
router.delete('/notifications', authenticate, clearNotifications);
router.post('/reviews', authenticate, submitPlatformReview);

export default router;
