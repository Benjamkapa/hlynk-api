import express from 'express';
import { subscribe, unsubscribe, sendTestNotification } from '../controllers/notifications.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/subscribe', authenticate, subscribe);
router.post('/unsubscribe', authenticate, unsubscribe);
router.post('/test', authenticate, sendTestNotification);

export default router;
