"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.feedbackService = exports.FeedbackService = void 0;
const database_1 = __importDefault(require("../../config/database"));
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
class FeedbackService {
    /**
     * Generates or retrieves a feedback token for an appointment or client
     */
    async generateFeedbackToken(data) {
        let { clientId, appointmentId, token } = data;
        // Resolve clientId from appointment if not explicitly passed
        if (!clientId && appointmentId) {
            const apt = await database_1.default.appointment.findUnique({
                where: { id: appointmentId },
                select: { clientId: true },
            });
            if (apt?.clientId) {
                clientId = apt.clientId;
            }
        }
        // Check if token already exists for this appointment
        if (appointmentId) {
            const existing = await database_1.default.clientFeedback.findFirst({
                where: { appointmentId },
                include: { client: true },
            });
            if (existing && existing.token) {
                if (!existing.clientId && clientId) {
                    await database_1.default.clientFeedback.update({
                        where: { id: existing.id },
                        data: { clientId },
                    });
                }
                const frontendBase = process.env.FRONTEND_URL || 'https://omega-spa-pos.netlify.app';
                return {
                    token: existing.token,
                    feedbackUrl: `${frontendBase}/feedback?token=${existing.token}`,
                    feedback: existing,
                };
            }
        }
        const generatedToken = token || `fb-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
        const created = await database_1.default.clientFeedback.create({
            data: {
                clientId: clientId || null,
                appointmentId: appointmentId || null,
                token: generatedToken,
                rating: 0,
                isSubmitted: false,
            },
            include: { client: true },
        });
        const frontendBase = process.env.FRONTEND_URL || 'https://omega-spa-pos.netlify.app';
        return {
            token: generatedToken,
            feedbackUrl: `${frontendBase}/feedback?token=${generatedToken}`,
            feedback: created,
        };
    }
    /**
     * Public retrieval of feedback request details by token (no auth required)
     */
    async getFeedbackByToken(token) {
        if (!token) {
            throw new errorHandler_1.AppError('Feedback token is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const feedback = await database_1.default.clientFeedback.findUnique({
            where: { token },
            include: {
                client: true,
                appointment: {
                    include: {
                        client: true,
                        appointmentServices: { include: { service: true } },
                        mainTechnician: { include: { staffProfile: true } },
                    },
                },
            },
        });
        if (!feedback) {
            throw new errorHandler_1.AppError('Feedback link is invalid or expired', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const clientName = feedback.client?.name || feedback.appointment?.client?.name || 'Valued Guest';
        const serviceName = feedback.appointment?.serviceSummary ||
            feedback.appointment?.appointmentServices?.[0]?.service?.name ||
            'Spa Treatment';
        const techName = feedback.appointment?.mainTechnician?.staffProfile?.name ||
            feedback.appointment?.mainTechnician?.email?.split('@')[0] ||
            'Specialist';
        const aptDate = feedback.appointment?.appointmentDate
            ? new Date(feedback.appointment.appointmentDate).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            })
            : new Date(feedback.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
            });
        return {
            id: feedback.id,
            token: feedback.token,
            clientId: feedback.clientId,
            clientName,
            appointmentId: feedback.appointmentId,
            service: serviceName,
            technician: techName,
            date: aptDate,
            rating: feedback.rating,
            comment: feedback.comment,
            isSubmitted: feedback.isSubmitted,
            createdAt: feedback.createdAt,
            updatedAt: feedback.updatedAt,
        };
    }
    /**
     * Public submission of rating and optional comment by token (no auth required)
     */
    async submitFeedback(token, data) {
        if (!token) {
            throw new errorHandler_1.AppError('Feedback token is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const ratingNum = Number(data.rating);
        if (!ratingNum || ratingNum < 1 || ratingNum > 5) {
            throw new errorHandler_1.AppError('Rating must be an integer between 1 and 5', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const existing = await database_1.default.clientFeedback.findUnique({
            where: { token },
            include: { client: true, appointment: true },
        });
        if (!existing) {
            throw new errorHandler_1.AppError('Feedback request not found or invalid token', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const updated = await database_1.default.clientFeedback.update({
            where: { token },
            data: {
                rating: ratingNum,
                comment: data.comment ? data.comment.trim() : null,
                isSubmitted: true,
            },
        });
        // Record audit in client history if client is linked
        if (existing.clientId) {
            try {
                await database_1.default.clientHistory.create({
                    data: {
                        clientId: existing.clientId,
                        action: 'FEEDBACK_SUBMITTED',
                        details: `Client submitted ${ratingNum}-star feedback${data.comment ? `: "${data.comment.trim()}"` : ''}`,
                    },
                });
            }
            catch (err) {
                console.warn('[FeedbackService] Client history record non-blocking warning:', err);
            }
        }
        return {
            success: true,
            message: 'Thank you! Your feedback has been recorded successfully.',
            feedback: updated,
        };
    }
    /**
     * Manager / Reception listing of all submitted client feedback
     */
    async getAllFeedback(query = {}) {
        const limit = Math.min(Number(query.limit) || 100, 200);
        const page = Math.max(Number(query.page) || 1, 1);
        const skip = (page - 1) * limit;
        const [total, feedbacks] = await Promise.all([
            database_1.default.clientFeedback.count({
                where: { isSubmitted: true },
            }),
            database_1.default.clientFeedback.findMany({
                where: { isSubmitted: true },
                skip,
                take: limit,
                orderBy: { updatedAt: 'desc' },
                include: {
                    client: {
                        select: { id: true, name: true, phone: true },
                    },
                    appointment: {
                        select: {
                            id: true,
                            appointmentDate: true,
                            serviceSummary: true,
                            client: { select: { id: true, name: true, phone: true } },
                            mainTechnician: {
                                select: {
                                    staffProfile: { select: { name: true } },
                                    email: true,
                                },
                            },
                        },
                    },
                },
            }),
        ]);
        const formatted = feedbacks.map((fb) => {
            const clientName = fb.client?.name || fb.appointment?.client?.name || 'Valued Guest';
            const serviceName = fb.appointment?.serviceSummary || 'Spa Service';
            const techName = fb.appointment?.mainTechnician?.staffProfile?.name ||
                fb.appointment?.mainTechnician?.email?.split('@')[0] ||
                'Staff';
            const dateStr = fb.appointment?.appointmentDate
                ? new Date(fb.appointment.appointmentDate).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                })
                : new Date(fb.updatedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                });
            return {
                id: fb.id,
                clientId: fb.clientId,
                clientName,
                appointmentId: fb.appointmentId,
                service: serviceName,
                technician: techName,
                rating: fb.rating,
                comment: fb.comment,
                date: dateStr,
                submitted: true,
                submittedAt: fb.updatedAt.toISOString(),
                token: fb.token,
            };
        });
        return {
            feedback: formatted,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
exports.FeedbackService = FeedbackService;
exports.feedbackService = new FeedbackService();
//# sourceMappingURL=feedback.service.js.map