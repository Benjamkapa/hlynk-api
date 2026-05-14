import express from 'express';
import { getMySubscription, getBillingHistory, initiateRenewal, changePlan, verifyPayment } from '../controllers/subscriptions.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/me', getMySubscription);
router.get('/history', getBillingHistory);
router.post('/renew', initiateRenewal);
router.post('/change-plan', changePlan);
router.get('/verify/:paymentId', verifyPayment);

export default router;
