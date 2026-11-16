"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("./users.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// All staff / user management routes require authentication
router.use(authMiddleware_1.authMiddleware);
// GET /api/v1/users — view staff (Manager, Reception, Technician, Marketer)
router.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => users_controller_1.usersController.getUsers(req, res, next));
// GET /api/v1/users/:id — view single staff member
router.get('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => users_controller_1.usersController.getUserById(req, res, next));
// POST /api/v1/users — create staff (Manager only)
router.post('/', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => users_controller_1.usersController.createUser(req, res, next));
// PATCH /api/v1/users/:id/salary-contract — update salary & commission contract (Manager only)
router.patch('/:id/salary-contract', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => users_controller_1.usersController.updateSalaryContract(req, res, next));
// PATCH /api/v1/users/:id — update staff (Manager only)
router.patch('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => users_controller_1.usersController.updateUser(req, res, next));
// PUT /api/v1/users/:id — update staff (Manager only)
router.put('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => users_controller_1.usersController.updateUser(req, res, next));
// DELETE /api/v1/users/:id — deactivate staff (Manager only)
router.delete('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => users_controller_1.usersController.deleteUser(req, res, next));
exports.default = router;
//# sourceMappingURL=users.routes.js.map