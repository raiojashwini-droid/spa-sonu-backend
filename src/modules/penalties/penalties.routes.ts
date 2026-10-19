/**
 * OMEGA SPA POS — Penalties & Conduct Rules Routes
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */

import { Router } from 'express';
import { penaltiesController } from './penalties.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';
import { ROLES } from '../../config/constants';

const router = Router();

// All penalty routes require authenticated user
router.use(authMiddleware);

// 1. Fetch standard rules catalog
router.get(
  '/rules',
  allowRoles(ROLES.MANAGER, ROLES.RECEPTION, ROLES.TECHNICIAN, ROLES.MARKETER),
  (req, res, next) => penaltiesController.getRules(req, res, next)
);

// 2. Record a penalty (Manager only)
router.post(
  '/',
  allowRoles(ROLES.MANAGER),
  (req, res, next) => penaltiesController.createPenalty(req, res, next)
);

// 3. List penalties (Manager views all/filtered; staff views own penalties)
router.get(
  '/',
  allowRoles(ROLES.MANAGER, ROLES.RECEPTION, ROLES.TECHNICIAN, ROLES.MARKETER, ROLES.CLEANER),
  (req, res, next) => penaltiesController.getPenalties(req, res, next)
);

// 4. Void a penalty record (Manager only)
router.delete(
  '/:id',
  allowRoles(ROLES.MANAGER),
  (req, res, next) => penaltiesController.deletePenalty(req, res, next)
);

export default router;
