import { Router } from 'express';
import { paymentsController } from './payments.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// All payment routes require authentication
router.use(authMiddleware);

// RBAC: MANAGER & RECEPTION only. TECHNICIAN & CLEANER blocked.
router.use(allowRoles('MANAGER', 'RECEPTION'));

// POST /api/v1/payments — Record payment
router.post('/', (req, res, next) => paymentsController.recordPayment(req, res, next));

// GET /api/v1/payments — List payments
router.get('/', (req, res, next) => paymentsController.getPayments(req, res, next));

// GET /api/v1/payments/:id — Get payment details
router.get('/:id', (req, res, next) => paymentsController.getPaymentById(req, res, next));

export default router;
