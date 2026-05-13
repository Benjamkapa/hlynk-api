import express from 'express';
import { listSales, createSale, getSaleDetails } from '../controllers/sales.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listSales);
router.post('/', createSale);
router.get('/:id', getSaleDetails);

export default router;
