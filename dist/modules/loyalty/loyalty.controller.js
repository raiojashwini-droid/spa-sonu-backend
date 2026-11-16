"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loyaltyController = exports.LoyaltyController = void 0;
const loyalty_service_1 = require("./loyalty.service");
const loyalty_validation_1 = require("./loyalty.validation");
const constants_1 = require("../../config/constants");
function getParamId(req, key = 'id') {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}
class LoyaltyController {
    async getSettings(_req, res, next) {
        try {
            const result = await loyalty_service_1.loyaltyService.getSettings();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async updateSettings(req, res, next) {
        try {
            const validated = loyalty_validation_1.updateLoyaltySettingsSchema.parse(req.body);
            const result = await loyalty_service_1.loyaltyService.updateSettings(validated);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Loyalty settings updated successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getClientLoyalty(req, res, next) {
        try {
            const clientId = getParamId(req, 'clientId');
            const result = await loyalty_service_1.loyaltyService.getClientLoyalty(clientId);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async adjustClientPoints(req, res, next) {
        try {
            const clientId = getParamId(req, 'clientId');
            const validated = loyalty_validation_1.adjustPointsSchema.parse(req.body);
            const authUser = req.user;
            const result = await loyalty_service_1.loyaltyService.adjustClientPoints(clientId, validated, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Loyalty points adjusted successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async redeemPointsForInvoice(req, res, next) {
        try {
            const invoiceId = getParamId(req, 'id');
            const validated = loyalty_validation_1.redeemPointsSchema.parse(req.body);
            const authUser = req.user;
            const result = await loyalty_service_1.loyaltyService.redeemPointsForInvoice(invoiceId, validated, authUser);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Loyalty points redeemed successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async awardCelebrationReward(req, res, next) {
        try {
            const clientId = getParamId(req, 'clientId');
            const validated = loyalty_validation_1.awardRewardSchema.parse(req.body);
            const authUser = req.user;
            const result = await loyalty_service_1.loyaltyService.awardCelebrationReward(clientId, validated, authUser);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                message: `${validated.rewardType} celebration reward awarded successfully`,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getUpcomingCelebrations(req, res, next) {
        try {
            const days = req.query.days ? parseInt(String(req.query.days), 10) : 30;
            const result = await loyalty_service_1.loyaltyService.getUpcomingCelebrations(days);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getRebookingClients(req, res, next) {
        try {
            const query = loyalty_validation_1.rebookingQuerySchema.parse(req.query);
            const result = await loyalty_service_1.loyaltyService.getRebookingClients(query);
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
exports.LoyaltyController = LoyaltyController;
exports.loyaltyController = new LoyaltyController();
//# sourceMappingURL=loyalty.controller.js.map