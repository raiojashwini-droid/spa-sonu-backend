"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const specialties_controller_1 = require("./specialties.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// GET /api/v1/specialties — view specialties (Public / All Roles)
router.get('/', (req, res, next) => specialties_controller_1.specialtiesController.getSpecialties(req, res, next));
// GET /api/v1/specialties/:id — view single specialty
router.get('/:id', (req, res, next) => specialties_controller_1.specialtiesController.getSpecialtyById(req, res, next));
// All specialty mutation routes require authentication
router.use(authMiddleware_1.authMiddleware);
// POST /api/v1/specialties — create specialty (Manager only)
router.post('/', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => specialties_controller_1.specialtiesController.createSpecialty(req, res, next));
// PATCH /api/v1/specialties/:id — update specialty (Manager only)
router.patch('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => specialties_controller_1.specialtiesController.updateSpecialty(req, res, next));
// PUT /api/v1/specialties/:id — update specialty (Manager only)
router.put('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => specialties_controller_1.specialtiesController.updateSpecialty(req, res, next));
// DELETE /api/v1/specialties/:id — delete specialty (Manager only)
router.delete('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => specialties_controller_1.specialtiesController.deleteSpecialty(req, res, next));
exports.default = router;
//# sourceMappingURL=specialties.routes.js.map