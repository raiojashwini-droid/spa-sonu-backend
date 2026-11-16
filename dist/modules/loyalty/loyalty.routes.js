"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rebookingRouter = void 0;
const express_1 = require("express");
const loyalty_controller_1 = require("./loyalty.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// GET /api/v1/loyalty/settings — View loyalty program settings (Manager, Reception)
router.get('/settings', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => loyalty_controller_1.loyaltyController.getSettings(req, res, next));
// PATCH /api/v1/loyalty/settings — Manager update loyalty settings
router.patch('/settings', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => loyalty_controller_1.loyaltyController.updateSettings(req, res, next));
// GET /api/v1/loyalty/rebooking — Rebooking retention analytics (Manager, Reception)
router.get('/rebooking', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => loyalty_controller_1.loyaltyController.getRebookingClients(req, res, next));
// GET /api/v1/loyalty/rewards/upcoming — Upcoming birthdays/anniversaries (Manager, Reception)
router.get('/rewards/upcoming', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => loyalty_controller_1.loyaltyController.getUpcomingCelebrations(req, res, next));
// POST /api/v1/loyalty/clients/:clientId/reward — Award birthday/anniversary reward (Manager, Reception)
router.post('/clients/:clientId/reward', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => loyalty_controller_1.loyaltyController.awardCelebrationReward(req, res, next));
// POST /api/v1/loyalty/clients/:clientId/adjust — Manager manual points adjustment
router.post('/clients/:clientId/adjust', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => loyalty_controller_1.loyaltyController.adjustClientPoints(req, res, next));
// GET /api/v1/loyalty/clients/:clientId — View client loyalty balance & history (Manager, Reception, Technician)
router.get('/clients/:clientId', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => loyalty_controller_1.loyaltyController.getClientLoyalty(req, res, next));
// POST /api/v1/loyalty/invoices/:id/redeem — Redeem points during checkout (Manager, Reception)
router.post('/invoices/:id/redeem', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => loyalty_controller_1.loyaltyController.redeemPointsForInvoice(req, res, next));
exports.default = router;
exports.rebookingRouter = (0, express_1.Router)();
exports.rebookingRouter.use(authMiddleware_1.authMiddleware);
exports.rebookingRouter.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => loyalty_controller_1.loyaltyController.getRebookingClients(req, res, next));
//# sourceMappingURL=loyalty.routes.js.map