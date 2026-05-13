import express from 'express';
import { listCustomers, createCustomer } from '../controllers/customers.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listCustomers);
router.post('/', createCustomer);

export default router;
