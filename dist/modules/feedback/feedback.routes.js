"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackRouter = exports.clientFeedbackRouter = exports.publicFeedbackRouter = void 0;
const express_1 = require("express");
const feedback_controller_1 = require("./feedback.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
// Public router for client submission (no auth)
exports.publicFeedbackRouter = (0, express_1.Router)();
// GET /api/v1/public/feedback/:token — Get feedback appointment details
exports.publicFeedbackRouter.get('/:token', (req, res, next) => feedback_controller_1.feedbackController.getByToken(req, res, next));
// POST /api/v1/public/feedback/:token — Submit rating & comment
exports.publicFeedbackRouter.post('/:token', (req, res, next) => feedback_controller_1.feedbackController.submitFeedback(req, res, next));
// Protected router for Manager / Reception
exports.clientFeedbackRouter = (0, express_1.Router)();
exports.clientFeedbackRouter.use(authMiddleware_1.authMiddleware);
// GET /api/v1/client-feedback — View all feedback entries
exports.clientFeedbackRouter.get('/', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => feedback_controller_1.feedbackController.getAll(req, res, next));
// Internal feedback router (for token generation)
exports.feedbackRouter = (0, express_1.Router)();
exports.feedbackRouter.use(authMiddleware_1.authMiddleware);
// POST /api/v1/feedback/generate-token — Generate token for appointment
exports.feedbackRouter.post('/generate-token', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => feedback_controller_1.feedbackController.generateToken(req, res, next));
exports.default = exports.clientFeedbackRouter;
//# sourceMappingURL=feedback.routes.js.map