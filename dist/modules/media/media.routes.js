"use strict";
/**
 * OMEGA SPA POS — Media Routes
 * Phase 23: Cloudinary Media Storage Integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const media_controller_1 = require("./media.controller");
const authMiddleware_1 = require("../../middleware/authMiddleware");
const roleMiddleware_1 = require("../../middleware/roleMiddleware");
const upload_1 = require("../../middleware/upload");
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const router = (0, express_1.Router)();
/**
 * Middleware wrapper for multer single file upload
 */
const handleUpload = (req, res, next) => {
    (0, upload_1.uploadSingle)(req, res, (err) => {
        if (err) {
            const message = (0, upload_1.handleMulterError)(err);
            return next(new errorHandler_1.AppError(message, constants_1.HTTP_STATUS.BAD_REQUEST));
        }
        next();
    });
};
/**
 * Middleware wrapper for multer multiple cleaning proof photos upload
 */
const handleCleaningUpload = (req, res, next) => {
    (0, upload_1.uploadCleaningProof)(req, res, (err) => {
        if (err) {
            const message = (0, upload_1.handleMulterError)(err);
            return next(new errorHandler_1.AppError(message, constants_1.HTTP_STATUS.BAD_REQUEST));
        }
        next();
    });
};
// All media endpoints require authentication
router.use(authMiddleware_1.authMiddleware);
// Client treatment before/after photo upload
router.post('/upload/client', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), handleUpload, (req, res, next) => media_controller_1.mediaController.uploadClientMedia(req, res, next));
// Attendance photo upload (clock-in / clock-out)
router.post('/upload/attendance', handleUpload, (req, res, next) => media_controller_1.mediaController.uploadAttendancePhoto(req, res, next));
// Cleaning proof upload (supports 1 to 10 camera photos)
router.post('/upload/cleaning', (0, roleMiddleware_1.allowRoles)('MANAGER', 'CLEANER', 'RECEPTION', 'TECHNICIAN'), handleCleaningUpload, (req, res, next) => media_controller_1.mediaController.uploadCleaningPhoto(req, res, next));
// Get persistent cleaning records (role-secured: cleaners/techs see own, managers/reception see all)
router.get('/cleaning', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'CLEANER', 'TECHNICIAN'), (req, res, next) => media_controller_1.mediaController.getCleaningRecords(req, res, next));
// Delete cleaning record and Cloudinary images (MANAGER only)
router.delete('/cleaning/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => media_controller_1.mediaController.deleteCleaningRecord(req, res, next));
// Get client media
router.get('/client/:clientId', (0, roleMiddleware_1.allowRoles)('MANAGER', 'RECEPTION', 'TECHNICIAN'), (req, res, next) => media_controller_1.mediaController.getClientMedia(req, res, next));
// Delete client media (MANAGER only)
router.delete('/client/:id', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => media_controller_1.mediaController.deleteClientMedia(req, res, next));
// Manual media retention cleanup trigger (MANAGER only)
router.post('/cleanup', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => media_controller_1.mediaController.triggerMediaCleanup(req, res, next));
// Media cleanup system audit logs (MANAGER only)
router.get('/cleanup/audit', (0, roleMiddleware_1.allowRoles)('MANAGER'), (req, res, next) => media_controller_1.mediaController.getMediaCleanupAuditLogs(req, res, next));
exports.default = router;
//# sourceMappingURL=media.routes.js.map