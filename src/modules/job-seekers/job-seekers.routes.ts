import { Router } from 'express';
import { jobSeekersController } from './job-seekers.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

const router = Router();

// Authentication required for all job seeker routes
router.use(authMiddleware);

// GET /api/v1/job-seekers - List candidates with search & filters (Manager, Reception)
router.get(
  '/',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => jobSeekersController.getJobSeekers(req, res, next)
);

// GET /api/v1/job-seekers/:id - Candidate details (Manager, Reception)
router.get(
  '/:id',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => jobSeekersController.getJobSeekerById(req, res, next)
);

// POST /api/v1/job-seekers - Add new candidate (Manager, Reception)
router.post(
  '/',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => jobSeekersController.createJobSeeker(req, res, next)
);

// PATCH /api/v1/job-seekers/:id - Update candidate status / details (Manager, Reception)
router.patch(
  '/:id',
  allowRoles('MANAGER', 'RECEPTION'),
  (req, res, next) => jobSeekersController.updateJobSeeker(req, res, next)
);

// DELETE /api/v1/job-seekers/:id - Remove candidate (Manager only)
router.delete(
  '/:id',
  allowRoles('MANAGER'),
  (req, res, next) => jobSeekersController.deleteJobSeeker(req, res, next)
);

export default router;
