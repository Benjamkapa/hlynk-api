import express from 'express';
import { listSales, createSale, getSaleDetails, voidSale, vendorMpesaPush, vendorKcbPush } from '../controllers/sales.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listSales);
router.post('/', createSale);
router.get('/:id', getSaleDetails);
router.patch('/:id/void', voidSale);
router.post('/mpesa-push', vendorMpesaPush);
router.post('/kcb-push', vendorKcbPush);

export default router;
