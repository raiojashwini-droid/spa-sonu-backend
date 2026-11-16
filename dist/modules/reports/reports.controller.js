"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reportsController = exports.ReportsController = void 0;
const reports_service_1 = require("./reports.service");
const reports_validation_1 = require("./reports.validation");
const constants_1 = require("../../config/constants");
function getParamId(req, key = 'id') {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}
class ReportsController {
    async getDashboardSummary(req, res, next) {
        try {
            const query = reports_validation_1.dateRangeQuerySchema.parse(req.query);
            const authUser = req.user;
            const result = await reports_service_1.reportsService.getDashboardSummary(query, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getRevenueReport(req, res, next) {
        try {
            const query = reports_validation_1.dateRangeQuerySchema.parse(req.query);
            const result = await reports_service_1.reportsService.getRevenueReport(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getAppointmentAnalytics(req, res, next) {
        try {
            const query = reports_validation_1.dateRangeQuerySchema.parse(req.query);
            const result = await reports_service_1.reportsService.getAppointmentAnalytics(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTopServices(req, res, next) {
        try {
            const query = reports_validation_1.topServicesQuerySchema.parse(req.query);
            const result = await reports_service_1.reportsService.getTopServices(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getServicePerformance(req, res, next) {
        try {
            const query = reports_validation_1.dateRangeQuerySchema.parse(req.query);
            const result = await reports_service_1.reportsService.getServicePerformance(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTechniciansPerformance(req, res, next) {
        try {
            const query = reports_validation_1.technicianReportQuerySchema.parse(req.query);
            const authUser = req.user;
            const result = await reports_service_1.reportsService.getTechnicianPerformance(query, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getMyTechnicianPerformance(req, res, next) {
        try {
            const query = reports_validation_1.dateRangeQuerySchema.parse(req.query);
            const authUser = req.user;
            const result = await reports_service_1.reportsService.getTechnicianPerformance({ ...query, technicianId: authUser.id }, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result.technicians[0] || null,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getTechnicianById(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const query = reports_validation_1.dateRangeQuerySchema.parse(req.query);
            const authUser = req.user;
            const result = await reports_service_1.reportsService.getTechnicianPerformance({ ...query, technicianId: id }, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result.technicians[0] || null,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getStockConsumptionReport(req, res, next) {
        try {
            const query = reports_validation_1.dateRangeQuerySchema.parse(req.query);
            const result = await reports_service_1.reportsService.getStockConsumptionReport(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getCustomerAnalytics(req, res, next) {
        try {
            const query = reports_validation_1.dateRangeQuerySchema.parse(req.query);
            const result = await reports_service_1.reportsService.getCustomerAnalytics(query);
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
exports.ReportsController = ReportsController;
exports.reportsController = new ReportsController();
//# sourceMappingURL=reports.controller.js.map