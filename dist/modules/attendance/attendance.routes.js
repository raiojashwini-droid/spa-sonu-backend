"use strict";
/**
 * OMEGA SPA POS — Attendance Routes
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const attendance_controller_1 = require("./attendance.controller");
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
// All attendance endpoints require authentication
router.use(authMiddleware_1.authMiddleware);
// POST /api/v1/attendance/clock-in — Employee clock in with photo
router.post('/clock-in', handleUpload, (req, res, next) => attendance_controller_1.attendanceController.clockIn(req, res, next));
// POST /api/v1/attendance/clock-out — Employee clock out
router.post('/clock-out', handleUpload, (req, res, next) => attendance_controller_1.attendanceController.clockOut(req, res, next));
// GET /api/v1/attendance/today — Today's attendance
router.get('/today', (req, res, next) => attendance_controller_1.attendanceController.getToday(req, res, next));
// GET /api/v1/attendance — List attendance history
router.get('/', (req, res, next) => attendance_controller_1.attendanceController.getAll(req, res, next));
// POST /api/v1/attendance/manual — Manager manual attendance entry / override
router.post('/manual', (0, roleMiddleware_1.allowRoles)('MANAGER'), handleUpload, (req, res, next) => attendance_controller_1.attendanceController.manualEntry(req, res, next));
exports.default = router;
//# sourceMappingURL=attendance.routes.js.map