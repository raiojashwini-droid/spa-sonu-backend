"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const commissions_controller_1 = require("./commissions.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// GET /api/v1/commissions/rules — View service commission rules (Manager, Reception)
router.get('/rules', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => commissions_controller_1.commissionsController.getCommissionRules(req, res, next));
// POST /api/v1/commissions/rules — Manager set/update service commission rule
router.post('/rules', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => commissions_controller_1.commissionsController.setCommissionRule(req, res, next));
// POST /api/v1/commissions/:id/bonus — Manager award bonus
router.post('/:id/bonus', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => commissions_controller_1.commissionsController.addBonus(req, res, next));
// PATCH /api/v1/commissions/:id/adjust — Manager adjust commission amount/rate
router.patch('/:id/adjust', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => commissions_controller_1.commissionsController.adjustCommission(req, res, next));
// POST /api/v1/commissions/:id/approve — Manager approve commission
router.post('/:id/approve', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => commissions_controller_1.commissionsController.approveCommission(req, res, next));
// GET /api/v1/commissions/salary-summary — Authoritative MTD salary & target summary
router.get('/salary-summary', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => commissions_controller_1.commissionsController.getSalarySummary(req, res, next));
// POST /api/v1/commissions/payroll/finalize — Freeze & lock monthly payroll record (Manager only)
router.post('/payroll/finalize', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => commissions_controller_1.commissionsController.finalizePayroll(req, res, next));
// GET /api/v1/commissions/marketer/performance — Marketer performance & commission ledger (Manager, Marketer)
router.get('/marketer/performance', (0, roleMiddleware_1.allowRoles)('MANAGER', 'MARKETER'), (req, res, next) => commissions_controller_1.commissionsController.getMarketerPerformance(req, res, next));
// GET /api/v1/commissions/marketer/:marketerId — Specific marketer performance by ID (Manager only)
router.get('/marketer/:marketerId', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => commissions_controller_1.commissionsController.getMarketerPerformance(req, res, next));
// GET /api/v1/commissions/:technicianId — Technician / Marketer report (Manager, Reception, or own Technician/Marketer)
router.get('/:technicianId', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => commissions_controller_1.commissionsController.getTechnicianCommissions(req, res, next));
// GET /api/v1/commissions — List commissions report (Manager/Reception full, Technician/Marketer own only)
router.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => commissions_controller_1.commissionsController.getCommissions(req, res, next));
exports.default = router;
//# sourceMappingURL=commissions.routes.js.map