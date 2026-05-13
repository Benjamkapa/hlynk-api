import express from 'express';
import { getProviderRequests, createRequest, updateRequestStatus } from '../controllers/requests.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getProviderRequests);
router.post('/', createRequest);
router.patch('/:id/status', updateRequestStatus);

export default router;
