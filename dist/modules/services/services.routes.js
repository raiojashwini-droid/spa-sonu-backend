"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const services_controller_1 = require("./services.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// GET /api/v1/services — View services (Public / All Roles)
router.get('/', (req, res, next) => services_controller_1.servicesController.getServices(req, res, next));
// GET /api/v1/services/:id — View single service
router.get('/:id', (req, res, next) => services_controller_1.servicesController.getServiceById(req, res, next));
// Protected routes require authentication
router.use(authMiddleware_1.authMiddleware);
// POST /api/v1/services — Create new service (Manager only)
router.post('/', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => services_controller_1.servicesController.createService(req, res, next));
// PATCH /api/v1/services/:id — Update service (Manager only)
router.patch('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => services_controller_1.servicesController.updateService(req, res, next));
// DELETE /api/v1/services/:id — Delete / Deactivate service (Manager only)
router.delete('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => services_controller_1.servicesController.deleteService(req, res, next));
exports.default = router;
//# sourceMappingURL=services.routes.js.map