import express from 'express';
import { googleAuth, logout, refresh, me } from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/auth/google
 * @desc Unified login/register with Google
 */
router.post('/google', googleAuth);

/**
 * @route POST /api/auth/refresh
 * @desc Refresh access token
 */
router.post('/refresh', refresh);

/**
 * @route POST /api/auth/logout
 * @desc Logout user session
 */
router.post('/logout', authenticate, logout);

/**
 * @route GET /api/auth/me
 * @desc Get current user profile
 */
router.get('/me', authenticate, me);

export default router;
