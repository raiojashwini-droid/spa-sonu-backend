import { Router } from 'express';
import { authController } from './auth.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { loginLimiter } from '../../middleware/rateLimiter';

const router = Router();

// POST /api/v1/auth/login — Strict rate limit: 5 attempts per 15 minutes per IP
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));

// GET /api/v1/auth/me
router.get('/me', authMiddleware, (req, res, next) => authController.getCurrentUser(req, res, next));

export default router;
