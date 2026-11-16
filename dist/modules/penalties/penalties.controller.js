"use strict";
/**
 * OMEGA SPA POS — Penalties & Conduct Rules Controller
 * Implements Feature 4: Staff Conduct Rules & Penalty Records
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.penaltiesController = void 0;
const penalties_service_1 = require("./penalties.service");
const response_1 = require("../../utils/response");
const constants_1 = require("../../config/constants");
const errorHandler_1 = require("../../middleware/errorHandler");
class PenaltiesController {
    /**
     * GET /api/v1/penalties/rules
     * Fetch standard conduct rules catalog with recommended penalty amounts
     */
    async getRules(_req, res, next) {
        try {
            const rules = penalties_service_1.penaltiesService.getStandardRules();
            (0, response_1.sendSuccess)(res, rules, constants_1.HTTP_STATUS.OK, 'Conduct rules retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/v1/penalties
     * Record a new disciplinary infraction penalty (Manager only)
     */
    async createPenalty(req, res, next) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                throw new errorHandler_1.AppError('Authentication required', constants_1.HTTP_STATUS.UNAUTHORIZED);
            }
            const { staffId, ruleName, penaltyAmount, date, notes } = req.body;
            if (!staffId) {
                throw new errorHandler_1.AppError('staffId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const record = await penalties_service_1.penaltiesService.createPenalty({
                staffId,
                ruleName,
                penaltyAmount,
                date,
                notes,
                recordedById: managerId,
            });
            (0, response_1.sendSuccess)(res, record, constants_1.HTTP_STATUS.CREATED, 'Penalty recorded successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/penalties
     * Retrieve penalty records
     * - Manager: Can view all staff penalties or filter by staffId/date/month
     * - Non-Manager: Strictly scoped to their own penalties only
     */
    async getPenalties(req, res, next) {
        try {
            const authUser = req.user;
            if (!authUser) {
                throw new errorHandler_1.AppError('Authentication required', constants_1.HTTP_STATUS.UNAUTHORIZED);
            }
            const { date, startDate, endDate, month } = req.query;
            let targetStaffId = req.query.staffId;
            // Scoping: Non-managers can only view their own penalties
            if (authUser.role !== constants_1.ROLES.MANAGER) {
                targetStaffId = authUser.id;
            }
            const result = await penalties_service_1.penaltiesService.getPenalties({
                staffId: targetStaffId,
                date: typeof date === 'string' ? date : undefined,
                startDate: typeof startDate === 'string' ? startDate : undefined,
                endDate: typeof endDate === 'string' ? endDate : undefined,
                month: typeof month === 'string' ? month : undefined,
            });
            (0, response_1.sendSuccess)(res, result, constants_1.HTTP_STATUS.OK, 'Penalties retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * DELETE /api/v1/penalties/:id
     * Void / delete a mistaken penalty record (Manager only)
     */
    async deletePenalty(req, res, next) {
        try {
            const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
            if (!id || typeof id !== 'string') {
                throw new errorHandler_1.AppError('Penalty ID is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const result = await penalties_service_1.penaltiesService.deletePenalty(id);
            (0, response_1.sendSuccess)(res, result, constants_1.HTTP_STATUS.OK, 'Penalty deleted successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.penaltiesController = new PenaltiesController();
//# sourceMappingURL=penalties.controller.js.map