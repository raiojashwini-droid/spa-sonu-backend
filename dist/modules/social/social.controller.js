"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.socialController = exports.SocialController = void 0;
const social_service_1 = require("./social.service");
const media_service_1 = require("../media/media.service");
const constants_1 = require("../../config/constants");
const errorHandler_1 = require("../../middleware/errorHandler");
function getParamId(req, key = 'id') {
    const val = req.params[key];
    return Array.isArray(val) ? val[0] : val;
}
class SocialController {
    async getAccounts(_req, res, next) {
        try {
            const data = await social_service_1.socialService.getAccounts();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async getPosts(_req, res, next) {
        try {
            const data = await social_service_1.socialService.getPosts();
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async createPost(req, res, next) {
        try {
            const data = await social_service_1.socialService.createPost(req.body);
            res.status(constants_1.HTTP_STATUS.CREATED).json({
                success: true,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async publishPostNow(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            const data = await social_service_1.socialService.publishPostNow(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data,
            });
        }
        catch (error) {
            next(error);
        }
    }
    async deletePost(req, res, next) {
        try {
            const id = getParamId(req, 'id');
            await social_service_1.socialService.deletePost(id);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                message: 'Post deleted successfully',
            });
        }
        catch (error) {
            next(error);
        }
    }
    async uploadMedia(req, res, next) {
        try {
            const files = req.files;
            if (!files || files.length === 0) {
                throw new errorHandler_1.AppError('No files uploaded', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const uploadPromises = files.map((file) => media_service_1.mediaService.uploadBufferToCloudinary(file.buffer, 'omega-spa/social'));
            const results = await Promise.all(uploadPromises);
            const urls = results.map((r) => r.url);
            res.status(constants_1.HTTP_STATUS.OK).json({
                success: true,
                data: { urls },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SocialController = SocialController;
exports.socialController = new SocialController();
//# sourceMappingURL=social.controller.js.map