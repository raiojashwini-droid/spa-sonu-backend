"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const social_controller_1 = require("./social.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const upload_1 = require("../../middleware/upload");
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const router = (0, express_1.Router)();
const handleSocialUpload = (req, res, next) => {
    (0, upload_1.uploadSocialMedia)(req, res, (err) => {
        if (err) {
            const message = (0, upload_1.handleMulterError)(err);
            return next(new errorHandler_1.AppError(message, constants_1.HTTP_STATUS.BAD_REQUEST));
        }
        next();
    });
};
// Require authentication for all social routes
router.use(authMiddleware_1.authMiddleware);
// POST /api/v1/social/upload - Upload photos/videos to Cloudinary for social posts
router.post('/upload', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), handleSocialUpload, (req, res, next) => social_controller_1.socialController.uploadMedia(req, res, next));
// GET /api/v1/social/accounts - View live connected account statuses
router.get('/accounts', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => social_controller_1.socialController.getAccounts(req, res, next));
// GET /api/v1/social/posts - View all recent posts
router.get('/posts', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => social_controller_1.socialController.getPosts(req, res, next));
// POST /api/v1/social/posts - Create post (Post Now or Schedule)
router.post('/posts', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => social_controller_1.socialController.createPost(req, res, next));
// POST /api/v1/social/posts/:id/publish - Publish a scheduled or draft post now
router.post('/posts/:id/publish', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => social_controller_1.socialController.publishPostNow(req, res, next));
// DELETE /api/v1/social/posts/:id - Delete a post
router.delete('/posts/:id', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION'), (req, res, next) => social_controller_1.socialController.deletePost(req, res, next));
exports.default = router;
//# sourceMappingURL=social.routes.js.map