"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackController = exports.FeedbackController = void 0;
const feedback_service_1 = require("./feedback.service");
const constants_1 = require("../../config/constants");
class FeedbackController {
    /**
     * GET /api/v1/public/feedback/:token
     */
    async getByToken(req, res, next) {
        try {
            const token = String(req.params.token);
            const data = await feedback_service_1.feedbackService.getFeedbackByToken(token);
            res.status(constants_1.HTTP_STATUS.OK).json({ success: true, data });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/v1/public/feedback/:token
     */
    async submitFeedback(req, res, next) {
        try {
            const token = String(req.params.token);
            const { rating, comment } = req.body;
            const result = await feedback_service_1.feedbackService.submitFeedback(token, { rating, comment });
            res.status(constants_1.HTTP_STATUS.OK).json(result);
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * POST /api/v1/feedback/generate-token
     */
    async generateToken(req, res, next) {
        try {
            const { clientId, appointmentId, clientName, service, technician } = req.body;
            const result = await feedback_service_1.feedbackService.generateFeedbackToken({
                clientId,
                appointmentId,
                clientName,
                service,
                technician,
            });
            res.status(constants_1.HTTP_STATUS.CREATED).json({ success: true, data: result });
        }
        catch (err) {
            next(err);
        }
    }
    /**
     * GET /api/v1/client-feedback (Manager & Reception)
     */
    async getAll(req, res, next) {
        try {
            const { limit, page } = req.query;
            const result = await feedback_service_1.feedbackService.getAllFeedback({
                limit: limit ? Number(limit) : undefined,
                page: page ? Number(page) : undefined,
            });
            res.status(constants_1.HTTP_STATUS.OK).json({ success: true, data: result.feedback, pagination: result.pagination });
        }
        catch (err) {
            next(err);
        }
    }
}
exports.FeedbackController = FeedbackController;
exports.feedbackController = new FeedbackController();
//# sourceMappingURL=feedback.controller.js.map