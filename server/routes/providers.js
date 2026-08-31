import express from 'express';
import { uploadPhoto, getMyProfile, updateProfile, getStats, getActivityLogs, clearData, deleteProfileAndFacility } from '../controllers/providers.js';
import { authenticate, requireProvider } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireProvider);

router.get('/me', getMyProfile);
router.patch('/me', updateProfile);
router.put('/me', updateProfile);
router.get('/me/activity', getActivityLogs);
router.get('/stats', getStats);
router.post('/me/photo', uploadPhoto);
router.post('/me/clear-data', clearData);
router.delete('/me/delete-account', deleteProfileAndFacility);

export default router;
