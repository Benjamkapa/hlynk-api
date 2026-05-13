import express from 'express';
import { listExpenses, createExpense, deleteExpense } from '../controllers/expenses.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', listExpenses);
router.post('/', createExpense);
router.delete('/:id', deleteExpense);

export default router;
