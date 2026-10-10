import { Router } from 'express';
import { appointmentsController } from './appointments.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// All appointment routes require authentication
router.use(authMiddleware);

// POST /api/v1/appointments — Create Appointment (Manager, Reception, Technician)
router.post(
  '/',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => appointmentsController.createAppointment(req, res, next)
);

// GET /api/v1/appointments — Get Appointments List (Manager, Reception, Technician own only)
router.get(
  '/',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => appointmentsController.getAppointments(req, res, next)
);

// GET /api/v1/appointments/:id — Get Appointment Details (Manager, Reception, Technician assigned only)
router.get(
  '/:id',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => appointmentsController.getAppointmentById(req, res, next)
);

// PATCH /api/v1/appointments/:id — Update Appointment (Manager, Reception only)
router.patch(
  '/:id',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => appointmentsController.updateAppointment(req, res, next)
);

// PATCH /api/v1/appointments/:id/reschedule — Reschedule Appointment (Manager, Reception only)
router.patch(
  '/:id/reschedule',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => appointmentsController.updateAppointment(req, res, next)
);

// PATCH /api/v1/appointments/:id/cancel — Cancel Appointment (Manager, Reception only)
router.patch(
  '/:id/cancel',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => appointmentsController.cancelAppointment(req, res, next)
);

// PATCH /api/v1/appointments/:id/status — Status Change Flow (Manager, Reception, Technician)
router.patch(
  '/:id/status',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => appointmentsController.changeAppointmentStatus(req, res, next)
);

export default router;
