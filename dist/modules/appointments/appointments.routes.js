"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const appointments_controller_1 = require("./appointments.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const router = (0, express_1.Router)();
// All appointment routes require authentication
router.use(authMiddleware_1.authMiddleware);
// POST /api/v1/appointments — Create Appointment (Manager, Reception, Technician, Marketer)
router.post('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => appointments_controller_1.appointmentsController.createAppointment(req, res, next));
// GET /api/v1/appointments — Get Appointments List (Manager, Reception, Technician own only, Marketer introduced/own only)
router.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => appointments_controller_1.appointmentsController.getAppointments(req, res, next));
// GET /api/v1/appointments/:id — Get Appointment Details (Manager, Reception, Technician assigned only, Marketer introduced/own only)
router.get('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'), (req, res, next) => appointments_controller_1.appointmentsController.getAppointmentById(req, res, next));
// PATCH /api/v1/appointments/:id — Update Appointment (Manager, Reception only)
router.patch('/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => appointments_controller_1.appointmentsController.updateAppointment(req, res, next));
// PATCH /api/v1/appointments/:id/reschedule — Reschedule Appointment (Manager, Reception only)
router.patch('/:id/reschedule', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => appointments_controller_1.appointmentsController.updateAppointment(req, res, next));
// PATCH /api/v1/appointments/:id/cancel — Cancel Appointment (Manager, Reception only)
router.patch('/:id/cancel', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => appointments_controller_1.appointmentsController.cancelAppointment(req, res, next));
// PATCH /api/v1/appointments/:id/status — Status Change Flow (Manager, Reception, Technician)
router.patch('/:id/status', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => appointments_controller_1.appointmentsController.changeAppointmentStatus(req, res, next));
exports.default = router;
//# sourceMappingURL=appointments.routes.js.map