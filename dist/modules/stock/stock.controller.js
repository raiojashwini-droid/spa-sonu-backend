"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stockController = exports.StockController = void 0;
const stock_service_1 = require("./stock.service");
const stock_validation_1 = require("./stock.validation");
const constants_1 = require("../../config/constants");
function getParamId(req, key = 'id') {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}
class StockController {
    async getServiceStock(req, res, next) {
        try {
            const query = stock_validation_1.stockQuerySchema.parse(req.query);
            const result = await stock_service_1.stockService.getServiceStock(query);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getStockById(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const result = await stock_service_1.stockService.getStockById(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createServiceStock(req, res, next) {
        try {
            const validated = stock_validation_1.createStockSchema.parse(req.body);
            const authUser = req.user;
            const result = await stock_service_1.stockService.createServiceStock(validated, authUser);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Stock item created successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async refillStock(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const validated = stock_validation_1.refillStockSchema.parse(req.body);
            const authUser = req.user;
            const result = await stock_service_1.stockService.refillStock(id, validated, authUser);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Stock refilled successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async adjustStock(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const validated = stock_validation_1.refillStockSchema.parse(req.body);
            const authUser = req.user;
            const result = await stock_service_1.stockService.adjustStock(id, validated, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Stock adjusted successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateStock(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const validated = stock_validation_1.updateStockSchema.parse(req.body);
            const result = await stock_service_1.stockService.updateStock(id, validated);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Stock item updated successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getStockActivities(req, res, next) {
        try {
            const query = stock_validation_1.stockActivityQuerySchema.parse(req.query);
            const authUser = req.user;
            const result = await stock_service_1.stockService.getStockActivities(query, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getRetailStock(_req, res, next) {
        try {
            const result = await stock_service_1.stockService.getRetailStock();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createRetailProduct(req, res, next) {
        try {
            const validated = stock_validation_1.createRetailProductSchema.parse(req.body);
            const result = await stock_service_1.stockService.createRetailProduct(validated);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Retail product created successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateRetailProduct(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const validated = stock_validation_1.updateRetailProductSchema.parse(req.body);
            const result = await stock_service_1.stockService.updateRetailProduct(id, validated);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Retail product updated successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async refillRetailProduct(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const validated = stock_validation_1.refillRetailSchema.parse(req.body);
            const result = await stock_service_1.stockService.refillRetailProduct(id, validated);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Retail product stock refilled successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deductRetailStock(req, res, next) {
        try {
            const validated = stock_validation_1.deductRetailStockSchema.parse(req.body);
            const result = await stock_service_1.stockService.deductRetailStock(validated);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Retail product stock deducted successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteServiceStock(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const result = await stock_service_1.stockService.deleteServiceStock(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: result.message,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteRetailProduct(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const result = await stock_service_1.stockService.deleteRetailProduct(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: result.message,
            });
        }
        catch (error) {
            next(error);
        }
    }
    // ── Daily Stock Photo Audits ─────────────────────────────────────────
    async submitDailyAudit(req, res, next) {
        try {
            const validated = stock_validation_1.createDailyAuditSchema.parse(req.body);
            const authUser = req.user;
            const result = await stock_service_1.stockService.submitDailyAudit(validated, authUser);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                message: 'Daily stock photo audit recorded successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getDailyAudits(req, res, next) {
        try {
            const query = stock_validation_1.stockDailyAuditQuerySchema.parse(req.query);
            const authUser = req.user;
            const result = await stock_service_1.stockService.getDailyAudits(query, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async reviewDailyAudit(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const validated = stock_validation_1.reviewDailyAuditSchema.parse(req.body);
            const authUser = req.user;
            const result = await stock_service_1.stockService.reviewDailyAudit(id, validated, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Daily stock audit reviewed successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deleteDailyAudit(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const authUser = req.user;
            const result = await stock_service_1.stockService.deleteDailyAudit(id, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: result.message,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.StockController = StockController;
exports.stockController = new StockController();
//# sourceMappingURL=stock.controller.js.map