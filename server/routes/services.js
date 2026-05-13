import express from 'express';
import { getMyServices, createService, updateService, deleteService } from '../controllers/services.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getMyServices);
router.post('/', createService);
router.patch('/:id', updateService);
router.delete('/:id', deleteService);

export default router;
