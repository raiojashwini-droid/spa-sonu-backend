"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const payments_controller_1 = require("./payments.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// All payment routes require authentication
router.use(authMiddleware_1.authMiddleware);
// RBAC: MANAGER & RECEPTION only. TECHNICIAN & CLEANER blocked.
router.use((0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'));
// POST /api/v1/payments — Record payment
router.post('/', (req, res, next) => payments_controller_1.paymentsController.recordPayment(req, res, next));
// GET /api/v1/payments — List payments
router.get('/', (req, res, next) => payments_controller_1.paymentsController.getPayments(req, res, next));
// GET /api/v1/payments/:id — Get payment details
router.get('/:id', (req, res, next) => payments_controller_1.paymentsController.getPaymentById(req, res, next));
exports.default = router;
//# sourceMappingURL=payments.routes.js.map