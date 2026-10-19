import { Router } from 'express';
import { usersController } from './users.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// All staff / user management routes require authentication
router.use(authMiddleware);

// GET /api/v1/users — view staff (Manager, Reception, Technician, Marketer)
router.get(
  '/',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'),
  (req, res, next) => usersController.getUsers(req, res, next)
);

// GET /api/v1/users/:id — view single staff member
router.get(
  '/:id',
  allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN', 'MARKETER'),
  (req, res, next) => usersController.getUserById(req, res, next)
);

// POST /api/v1/users — create staff (Manager only)
router.post(
  '/',
  allowRoles('MANAGER'),
  (req, res, next) => usersController.createUser(req, res, next)
);

// PATCH /api/v1/users/:id/salary-contract — update salary & commission contract (Manager only)
router.patch(
  '/:id/salary-contract',
  allowRoles('MANAGER'),
  (req, res, next) => usersController.updateSalaryContract(req, res, next)
);

// PATCH /api/v1/users/:id — update staff (Manager only)
router.patch(
  '/:id',
  allowRoles('MANAGER'),
  (req, res, next) => usersController.updateUser(req, res, next)
);

// PUT /api/v1/users/:id — update staff (Manager only)
router.put(
  '/:id',
  allowRoles('MANAGER'),
  (req, res, next) => usersController.updateUser(req, res, next)
);

// DELETE /api/v1/users/:id — deactivate staff (Manager only)
router.delete(
  '/:id',
  allowRoles('MANAGER'),
  (req, res, next) => usersController.deleteUser(req, res, next)
);

export default router;
