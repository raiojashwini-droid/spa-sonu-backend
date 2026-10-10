import { Router } from 'express';
import { loyaltyController } from './loyalty.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/loyalty/settings — View loyalty program settings (Manager, Reception)
router.get('/settings', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  loyaltyController.getSettings(req, res, next)
);

// PATCH /api/v1/loyalty/settings — Manager update loyalty settings
router.patch('/settings', allowRoles('MANAGER'), (req, res, next) =>
  loyaltyController.updateSettings(req, res, next)
);

// GET /api/v1/loyalty/rebooking — Rebooking retention analytics (Manager, Reception)
router.get('/rebooking', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  loyaltyController.getRebookingClients(req, res, next)
);

// GET /api/v1/loyalty/rewards/upcoming — Upcoming birthdays/anniversaries (Manager, Reception)
router.get('/rewards/upcoming', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  loyaltyController.getUpcomingCelebrations(req, res, next)
);

// POST /api/v1/loyalty/clients/:clientId/reward — Award birthday/anniversary reward (Manager, Reception)
router.post('/clients/:clientId/reward', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  loyaltyController.awardCelebrationReward(req, res, next)
);

// POST /api/v1/loyalty/clients/:clientId/adjust — Manager manual points adjustment
router.post('/clients/:clientId/adjust', allowRoles('MANAGER'), (req, res, next) =>
  loyaltyController.adjustClientPoints(req, res, next)
);

// GET /api/v1/loyalty/clients/:clientId — View client loyalty balance & history (Manager, Reception, Technician)
router.get('/clients/:clientId', allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) =>
  loyaltyController.getClientLoyalty(req, res, next)
);

// POST /api/v1/loyalty/invoices/:id/redeem — Redeem points during checkout (Manager, Reception)
router.post('/invoices/:id/redeem', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  loyaltyController.redeemPointsForInvoice(req, res, next)
);

export default router;

export const rebookingRouter = Router();
rebookingRouter.use(authMiddleware);
rebookingRouter.get('/', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  loyaltyController.getRebookingClients(req, res, next)
);
