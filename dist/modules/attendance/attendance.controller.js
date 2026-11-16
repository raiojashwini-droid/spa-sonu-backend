"use strict";
/**
 * OMEGA SPA POS — Attendance Controller
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceController = void 0;
const attendance_service_1 = require("./attendance.service");
const response_1 = require("../../utils/response");
const constants_1 = require("../../config/constants");
const errorHandler_1 = require("../../middleware/errorHandler");
class AttendanceController {
    /**
     * POST /api/v1/attendance/clock-in
     * Clock-in for an employee (photo required, uploaded to Cloudinary, saved in DB)
     */
    async clockIn(req, res, next) {
        try {
            const authUserId = req.user?.id;
            const targetEmployeeId = req.body.employeeId || authUserId;
            if (!targetEmployeeId) {
                throw new errorHandler_1.AppError('employeeId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            // Supports either multer req.file or base64 photo in req.body.photo / req.body.image
            const photoBase64 = req.body.photo || req.body.image || req.body.photoBase64;
            const targetDate = req.body.date;
            const record = await attendance_service_1.attendanceService.clockIn(targetEmployeeId, req.file, photoBase64, targetDate, authUserId);
            (0, response_1.sendSuccess)(res, record, constants_1.HTTP_STATUS.CREATED, 'Clocked in successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/v1/attendance/clock-out
     * Clock-out for an employee
     */
    async clockOut(req, res, next) {
        try {
            const authUserId = req.user?.id;
            const targetEmployeeId = req.body.employeeId || authUserId;
            if (!targetEmployeeId) {
                throw new errorHandler_1.AppError('employeeId is required', constants_1.HTTP_STATUS.BAD_REQUEST);
            }
            const photoBase64 = req.body.photo || req.body.image || req.body.photoBase64;
            const targetDate = req.body.date;
            const record = await attendance_service_1.attendanceService.clockOut(targetEmployeeId, req.file, photoBase64, targetDate);
            (0, response_1.sendSuccess)(res, record, constants_1.HTTP_STATUS.OK, 'Clocked out successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/attendance/today
     * Fetches today's attendance for the logged-in user or all employees for manager
     */
    async getToday(req, res, next) {
        try {
            const roleUpper = req.user?.role?.toUpperCase() || '';
            const canViewAll = roleUpper === 'MANAGER' || roleUpper === 'RECEPTION' || roleUpper === 'RECEPTIONIST';
            const requestedEmployeeId = req.query.employeeId || (canViewAll ? undefined : req.user?.id);
            const dateStr = req.query.date;
            const result = await attendance_service_1.attendanceService.getTodayAttendance(requestedEmployeeId, dateStr);
            (0, response_1.sendSuccess)(res, result, constants_1.HTTP_STATUS.OK, "Today's attendance retrieved successfully");
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * GET /api/v1/attendance
     * List attendance records with filtering
     */
    async getAll(req, res, next) {
        try {
            const roleUpper = req.user?.role?.toUpperCase() || '';
            const canViewAll = roleUpper === 'MANAGER' || roleUpper === 'RECEPTION' || roleUpper === 'RECEPTIONIST';
            const targetEmployeeId = canViewAll
                ? req.query.employeeId
                : req.user?.id;
            const filters = {
                employeeId: targetEmployeeId,
                date: req.query.date,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
                status: req.query.status,
            };
            const records = await attendance_service_1.attendanceService.getAttendanceRecords(filters);
            (0, response_1.sendSuccess)(res, records, constants_1.HTTP_STATUS.OK, 'Attendance records retrieved successfully');
        }
        catch (error) {
            next(error);
        }
    }
    /**
     * POST /api/v1/attendance/manual
     * Manager manual attendance entry or override
     */
    async manualEntry(req, res, next) {
        try {
            const managerId = req.user?.id;
            if (!managerId) {
                throw new errorHandler_1.AppError('Manager authentication required', constants_1.HTTP_STATUS.UNAUTHORIZED);
            }
            const { employeeId, date, clockInTime, clockOutTime, status, reason, photo, allowOverride, } = req.body;
            const record = await attendance_service_1.attendanceService.addManualAttendance({
                employeeId,
                date,
                clockInTime,
                clockOutTime,
                status,
                reason,
                photoBase64: photo || req.body.photoBase64,
                allowOverride: Boolean(allowOverride),
                managerId,
            }, req.file);
            (0, response_1.sendSuccess)(res, record, constants_1.HTTP_STATUS.CREATED, 'Manual attendance record saved successfully');
        }
        catch (error) {
            next(error);
        }
    }
}
exports.attendanceController = new AttendanceController();
exports.default = exports.attendanceController;
//# sourceMappingURL=attendance.controller.js.map