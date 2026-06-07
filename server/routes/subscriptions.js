import express from 'express';
import { getMySubscription, getBillingHistory, initiateRenewal, changePlan, verifyPayment, submitManualPayment, getMyPayouts, getMyReferrals } from '../controllers/subscriptions.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/me', getMySubscription);
router.get('/history', getBillingHistory);
router.get('/payouts', getMyPayouts);
router.get('/referrals', getMyReferrals);
router.post('/renew', initiateRenewal);
router.post('/change-plan', changePlan);
router.post('/manual', submitManualPayment);
router.get('/verify/:paymentId', verifyPayment);

export default router;
