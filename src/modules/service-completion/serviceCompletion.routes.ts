import { Router } from 'express';
import { serviceCompletionController } from './serviceCompletion.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// All service completion routes require authentication
router.use(authMiddleware);

// POST /api/v1/service-completion/:appointmentServiceId — Complete Service (Manager, Reception, Technician)
router.post(
  '/:appointmentServiceId',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => serviceCompletionController.completeService(req, res, next)
);

// GET /api/v1/service-completion/:appointmentServiceId — View Service Completion (Manager, Reception, Technician)
router.get(
  '/:appointmentServiceId',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'),
  (req, res, next) => serviceCompletionController.getServiceCompletion(req, res, next)
);

export default router;
