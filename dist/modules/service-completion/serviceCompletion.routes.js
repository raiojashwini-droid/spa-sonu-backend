"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const serviceCompletion_controller_1 = require("./serviceCompletion.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// All service completion routes require authentication
router.use(authMiddleware_1.authMiddleware);
// POST /api/v1/service-completion/:appointmentServiceId — Complete Service (Manager, Reception, Technician)
router.post('/:appointmentServiceId', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => serviceCompletion_controller_1.serviceCompletionController.completeService(req, res, next));
// GET /api/v1/service-completion/:appointmentServiceId — View Service Completion (Manager, Reception, Technician)
router.get('/:appointmentServiceId', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => serviceCompletion_controller_1.serviceCompletionController.getServiceCompletion(req, res, next));
exports.default = router;
//# sourceMappingURL=serviceCompletion.routes.js.map