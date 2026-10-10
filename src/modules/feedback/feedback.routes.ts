import { Router } from 'express';
import { feedbackController } from './feedback.controller';
import { authMiddleware } from '../../middleware/authMiddleware';
import { allowRoles } from '../../middleware/roleMiddleware';

// Public router for client submission (no auth)
export const publicFeedbackRouter = Router();

// GET /api/v1/public/feedback/:token — Get feedback appointment details
publicFeedbackRouter.get('/:token', (req, res, next) =>
  feedbackController.getByToken(req, res, next)
);

// POST /api/v1/public/feedback/:token — Submit rating & comment
publicFeedbackRouter.post('/:token', (req, res, next) =>
  feedbackController.submitFeedback(req, res, next)
);

// Protected router for Manager / Reception
export const clientFeedbackRouter = Router();

clientFeedbackRouter.use(authMiddleware);

// GET /api/v1/client-feedback — View all feedback entries
clientFeedbackRouter.get('/', allowRoles('MANAGER', 'RECEPTION'), (req, res, next) =>
  feedbackController.getAll(req, res, next)
);

// Internal feedback router (for token generation)
export const feedbackRouter = Router();

feedbackRouter.use(authMiddleware);

// POST /api/v1/feedback/generate-token — Generate token for appointment
feedbackRouter.post('/generate-token', allowRoles('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) =>
  feedbackController.generateToken(req, res, next)
);

export default clientFeedbackRouter;
