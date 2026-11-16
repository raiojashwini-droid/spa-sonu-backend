"use strict";
/**
 * OMEGA SPA POS — Legacy Uploads Route (Redirected to Cloudinary)
 * Phase 23: Media Storage Integration
 *
 * Backward-compatible endpoint for existing callers:
 * Now uploads directly to Cloudinary instead of writing to local disk.
 * Returns { success: true, data: { url: cloudinaryUrl, publicId } }
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const constants_1 = require("../../config/constants");
const media_service_1 = require("../media/media.service");
const cloudinary_1 = require("../../config/cloudinary");
const router = (0, express_1.Router)();
// POST /api/v1/uploads — Upload image directly to Cloudinary
router.post('/', authMiddleware_1.authMiddleware, async (req, res, next) => {
    try {
        const { image } = req.body;
        if (!image || typeof image !== 'string') {
            res.status(constants_1.HTTP_STATUS.BAD_REQUEST).json({
                success: false,
                message: 'Image data is required',
            });
            return;
        }
        // Upload directly to Cloudinary
        const result = await media_service_1.mediaService.uploadBase64ToCloudinary(image, cloudinary_1.CLOUDINARY_FOLDERS.CLIENT_BEFORE_AFTER);
        res.status(constants_1.HTTP_STATUS.CREATED).json({
            success: true,
            data: {
                url: result.url,
                publicId: result.publicId,
                format: result.format,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=uploads.routes.js.map