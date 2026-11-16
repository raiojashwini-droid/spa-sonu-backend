"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.commissionsController = exports.CommissionsController = void 0;
const commissions_service_1 = require("./commissions.service");
const commissions_validation_1 = require("./commissions.validation");
const constants_1 = require("../../config/constants");
function getParamId(req, key = 'id') {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}
class CommissionsController {
    async getCommissions(req, res, next) {
        try {
            const query = commissions_validation_1.commissionQuerySchema.parse(req.query);
            const authUser = req.user;
            const result = await commissions_service_1.commissionsService.getCommissions(query, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTechnicianCommissions(req, res, next) {
        try {
            const technicianId = getParamId(req, 'technicianId');
            const query = commissions_validation_1.commissionQuerySchema.parse(req.query);
            const authUser = req.user;
            const result = await commissions_service_1.commissionsService.getTechnicianCommissions(technicianId, query, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async addBonus(req, res, next) {
        try {
            const commissionId = getParamId(req, 'id');
            const validated = commissions_validation_1.addBonusSchema.parse(req.body);
            const authUser = req.user;
            const result = await commissions_service_1.commissionsService.addBonus(commissionId, validated, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Bonus awarded successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async adjustCommission(req, res, next) {
        try {
            const commissionId = getParamId(req, 'id');
            const validated = commissions_validation_1.adjustCommissionSchema.parse(req.body);
            const authUser = req.user;
            const result = await commissions_service_1.commissionsService.adjustCommission(commissionId, validated, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Commission adjusted successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async approveCommission(req, res, next) {
        try {
            const commissionId = getParamId(req, 'id');
            const authUser = req.user;
            const result = await commissions_service_1.commissionsService.approveCommission(commissionId, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Commission approved successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async setCommissionRule(req, res, next) {
        try {
            const validated = commissions_validation_1.setCommissionRuleSchema.parse(req.body);
            const result = await commissions_service_1.commissionsService.setCommissionRule(validated);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Commission rule saved successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCommissionRules(_req, res, next) {
        try {
            const rules = await commissions_service_1.commissionsService.getCommissionRules();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: rules,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getSalarySummary(req, res, next) {
        try {
            const authUser = req.user;
            let targetTechnicianId = req.query.technicianId || authUser.id;
            // Scoping: Non-managers can only view their own salary summary
            if (authUser.role !== 'MANAGER') {
                targetTechnicianId = authUser.id;
            }
            const period = req.query.period;
            const result = await commissions_service_1.commissionsService.getSalarySummary(targetTechnicianId, period);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async finalizePayroll(req, res, next) {
        try {
            const { employeeId, period } = req.body;
            if (!employeeId || !period) {
                res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                    success: false,
                    error: 'employeeId and period (YYYY-MM) are required.',
                });
                return;
            }
            const authUser = req.user;
            const result = await commissions_service_1.commissionsService.finalizeMonthlyPayroll(employeeId, period, authUser.id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Monthly payroll successfully finalized and locked.',
                data: result,
            });
        }
        catch (error) {
            if (error.statusCode === 403) {
                res.status(constants_1.HTTP_STATUS.FORBIDDEN).json({
                    success: false,
                    error: error.message,
                });
                return;
            }
            next(error);
        }
    }
    async getMarketerPerformance(req, res, next) {
        try {
            const marketerId = (req.params.marketerId || req.user?.id);
            const authUser = req.user;
            const result = await commissions_service_1.commissionsService.getMarketerPerformance(marketerId, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CommissionsController = CommissionsController;
exports.commissionsController = new CommissionsController();
//# sourceMappingURL=commissions.controller.js.map