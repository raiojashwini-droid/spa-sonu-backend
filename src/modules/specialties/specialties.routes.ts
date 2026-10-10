import { Router } from 'express';
import { specialtiesController } from './specialties.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// GET /api/v1/specialties — view specialties (Public / All Roles)
router.get(
  '/',
  (req, res, next) => specialtiesController.getSpecialties(req, res, next)
);

// GET /api/v1/specialties/:id — view single specialty
router.get(
  '/:id',
  (req, res, next) => specialtiesController.getSpecialtyById(req, res, next)
);

// All specialty mutation routes require authentication
router.use(authMiddleware);

// POST /api/v1/specialties — create specialty (Manager only)
router.post(
  '/',
  allowRoles('MANAGER'),
  (req, res, next) => specialtiesController.createSpecialty(req, res, next)
);

// PATCH /api/v1/specialties/:id — update specialty (Manager only)
router.patch(
  '/:id',
  allowRoles('MANAGER'),
  (req, res, next) => specialtiesController.updateSpecialty(req, res, next)
);

// PUT /api/v1/specialties/:id — update specialty (Manager only)
router.put(
  '/:id',
  allowRoles('MANAGER'),
  (req, res, next) => specialtiesController.updateSpecialty(req, res, next)
);

// DELETE /api/v1/specialties/:id — delete specialty (Manager only)
router.delete(
  '/:id',
  allowRoles('MANAGER'),
  (req, res, next) => specialtiesController.deleteSpecialty(req, res, next)
);

export default router;
