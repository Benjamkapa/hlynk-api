import express from 'express';
import { listProducts, createProduct, updateProduct, deleteProduct } from '../controllers/inventory.js';
import { authenticate, requireProvider } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);
router.use(requireProvider);

router.get('/', listProducts);
router.post('/', createProduct);
router.patch('/:id', updateProduct);
router.put('/:id', updateProduct);
import { requireOwner } from '../middleware/auth.js';
router.delete('/:id', requireOwner, deleteProduct);
import { uploadProductImage } from '../controllers/inventory.js';
router.post('/:id/image', uploadProductImage);

export default router;
