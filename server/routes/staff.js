import express from 'express';
import { getStaff, createStaff, updateStaff, deleteStaff } from '../controllers/staff.js';
import { authenticate, requireOwner } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireOwner); // Staff management usually restricted to owner

router.get('/', getStaff);
router.post('/', createStaff);
router.patch('/:staffId', updateStaff);
router.delete('/:staffId', deleteStaff);

export default router;
