import express from 'express';
import { getProviderRequests, createRequest, updateRequestStatus, deleteRequest, clearRequests } from '../controllers/requests.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getProviderRequests);
router.post('/', createRequest);
router.post('/clear', clearRequests);
router.patch('/:id/status', updateRequestStatus);
router.put('/:id/status', updateRequestStatus);
router.delete('/:id', deleteRequest);

export default router;
