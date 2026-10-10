import { Router } from 'express';
import { commissionsController } from './commissions.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/commissions/rules — View service commission rules (Manager, Reception)
router.get('/rules', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  commissionsController.getCommissionRules(req, res, next)
);

// POST /api/v1/commissions/rules — Manager set/update service commission rule
router.post('/rules', allowRoles('MANAGER'), (req, res, next) =>
  commissionsController.setCommissionRule(req, res, next)
);

// POST /api/v1/commissions/:id/bonus — Manager award bonus
router.post('/:id/bonus', allowRoles('MANAGER'), (req, res, next) =>
  commissionsController.addBonus(req, res, next)
);

// PATCH /api/v1/commissions/:id/adjust — Manager adjust commission amount/rate
router.patch('/:id/adjust', allowRoles('MANAGER'), (req, res, next) =>
  commissionsController.adjustCommission(req, res, next)
);

// POST /api/v1/commissions/:id/approve — Manager approve commission
router.post('/:id/approve', allowRoles('MANAGER'), (req, res, next) =>
  commissionsController.approveCommission(req, res, next)
);

// GET /api/v1/commissions/:technicianId — Technician report (Manager, Reception, or own Technician)
router.get('/:technicianId', allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) =>
  commissionsController.getTechnicianCommissions(req, res, next)
);

// GET /api/v1/commissions — List commissions report (Manager/Reception full, Technician own only)
router.get('/', allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) =>
  commissionsController.getCommissions(req, res, next)
);

export default router;
