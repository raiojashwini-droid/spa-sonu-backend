"use strict";
/**
 * OMEGA SPA POS — Penalties & Conduct Rules Routes
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const penalties_controller_1 = require("./penalties.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const constants_1 = require("../../config/constants");
const router = (0, express_1.Router)();
// All penalty routes require authenticated user
router.use(authMiddleware_1.authMiddleware);
// 1. Fetch standard rules catalog
router.get('/rules', (0, roleMiddleware_1.allowRoles)(constants_1.ROLES.MANAGER, constants_1.ROLES.RECEPTION, constants_1.ROLES.TECHNICIAN, constants_1.ROLES.MARKETER), (req, res, next) => penalties_controller_1.penaltiesController.getRules(req, res, next));
// 2. Record a penalty (Manager only)
router.post('/', (0, roleMiddleware_1.allowRoles)(constants_1.ROLES.MANAGER), (req, res, next) => penalties_controller_1.penaltiesController.createPenalty(req, res, next));
// 3. List penalties (Manager views all/filtered; staff views own penalties)
router.get('/', (0, roleMiddleware_1.allowRoles)(constants_1.ROLES.MANAGER, constants_1.ROLES.RECEPTION, constants_1.ROLES.TECHNICIAN, constants_1.ROLES.MARKETER, constants_1.ROLES.CLEANER), (req, res, next) => penalties_controller_1.penaltiesController.getPenalties(req, res, next));
// 4. Void a penalty record (Manager only)
router.delete('/:id', (0, roleMiddleware_1.allowRoles)(constants_1.ROLES.MANAGER), (req, res, next) => penalties_controller_1.penaltiesController.deletePenalty(req, res, next));
exports.default = router;
//# sourceMappingURL=penalties.routes.js.map