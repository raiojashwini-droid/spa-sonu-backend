"use strict";
/**
 * OMEGA SPA POS — Attendance Service
 * Handles employee clock-in, clock-out, live sync, and database persistence.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.attendanceService = exports.COMPANY_TIMEZONE = void 0;
exports.getCompanyTodayDateStr = getCompanyTodayDateStr;
exports.formatTimeInCompanyTz = formatTimeInCompanyTz;
exports.format24HourInCompanyTz = format24HourInCompanyTz;
exports.parseCompanyTimeToUtc = parseCompanyTimeToUtc;
exports.calculateDuration = calculateDuration;
exports.formatAttendanceRecord = formatAttendanceRecord;
const database_1 = __importDefault(require("../../config/database"));
const media_service_1 = require("../media/media.service");
const errorHandler_1 = require("../../middleware/errorHandler");
const constants_1 = require("../../config/constants");
const logger_1 = require("../../utils/logger");
exports.COMPANY_TIMEZONE = 'Africa/Douala';
/**
 * Returns today's date formatted as YYYY-MM-DD in Africa/Douala timezone
 */
function getCompanyTodayDateStr() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: exports.COMPANY_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(new Date());
}
/**
 * Formats a Date or ISO string into 12-hour AM/PM string in Africa/Douala
 */
function formatTimeInCompanyTz(d) {
    if (!d)
        return null;
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime()))
        return null;
    return new Intl.DateTimeFormat('en-US', {
        timeZone: exports.COMPANY_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).format(dateObj);
}
/**
 * Formats a Date or ISO string into 24-hour "HH:mm" string in Africa/Douala
 */
function format24HourInCompanyTz(d) {
    if (!d)
        return null;
    const dateObj = typeof d === 'string' ? new Date(d) : d;
    if (isNaN(dateObj.getTime()))
        return null;
    return new Intl.DateTimeFormat('en-GB', {
        timeZone: exports.COMPANY_TIMEZONE,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    }).format(dateObj);
}
/**
 * Converts a company date (YYYY-MM-DD) and 24-hour time (HH:mm) into a UTC Date object.
 * Africa/Douala is WAT (UTC+01:00) year-round without DST.
 */
function parseCompanyTimeToUtc(dateStr, timeStr) {
    const cleanDate = dateStr.slice(0, 10);
    const parts = timeStr.trim().split(':');
    const h = String(parseInt(parts[0] || '0', 10)).padStart(2, '0');
    const m = String(parseInt(parts[1] || '0', 10)).padStart(2, '0');
    const isoWithOffset = `${cleanDate}T${h}:${m}:00+01:00`;
    const parsed = new Date(isoWithOffset);
    if (!isNaN(parsed.getTime())) {
        return parsed;
    }
    const dateUtc = normalizeDate(cleanDate);
    const utcMs = dateUtc.getTime() + (parseInt(h, 10) - 1) * 3600000 + parseInt(m, 10) * 60000;
    return new Date(utcMs);
}
/**
 * Calculates duration in minutes and returns "Xh Ym" string
 */
function calculateDuration(clockIn, clockOut, fallbackWorkingHours) {
    if (clockIn && clockOut) {
        const inMs = new Date(clockIn).getTime();
        const outMs = new Date(clockOut).getTime();
        if (!isNaN(inMs) && !isNaN(outMs) && outMs >= inMs) {
            const diffMinutes = Math.max(0, Math.round((outMs - inMs) / 60000));
            const h = Math.floor(diffMinutes / 60);
            const m = diffMinutes % 60;
            return `${h}h ${m}m`;
        }
    }
    if (fallbackWorkingHours !== null && fallbackWorkingHours !== undefined) {
        const num = Number(fallbackWorkingHours);
        if (!isNaN(num)) {
            const h = Math.floor(num);
            const m = Math.round((num - h) * 60);
            return `${h}h ${m}m`;
        }
    }
    return null;
}
/**
 * Normalizes a date string or Date to midnight UTC Date for Prisma @db.Date
 */
function normalizeDate(d) {
    if (d) {
        if (typeof d === 'string') {
            const parts = d.slice(0, 10).split('-');
            if (parts.length === 3) {
                return new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
            }
        }
        const dt = new Date(d);
        dt.setUTCHours(0, 0, 0, 0);
        return dt;
    }
    const todayStr = getCompanyTodayDateStr();
    const parts = todayStr.split('-').map(Number);
    return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
}
/**
 * Formats a Prisma attendance record into a standardized frontend-friendly response
 */
function formatAttendanceRecord(att) {
    if (!att)
        return null;
    const employeeName = att.employee?.staffProfile?.name ||
        att.employee?.email?.split('@')[0] ||
        'Staff';
    const employeeRole = att.employee?.role?.name?.toLowerCase() || 'technician';
    const managerName = att.createdBy?.staffProfile?.name ||
        att.createdBy?.email?.split('@')[0] ||
        null;
    let dateStr = '';
    if (att.date instanceof Date) {
        dateStr = att.date.toISOString().slice(0, 10);
    }
    else if (typeof att.date === 'string') {
        dateStr = att.date.slice(0, 10);
    }
    return {
        id: att.id,
        employeeId: att.employeeId,
        employeeName,
        employeeRole,
        date: dateStr,
        clockIn: formatTimeInCompanyTz(att.clockInTime),
        clockInRaw: att.clockInTime ? new Date(att.clockInTime).toISOString() : null,
        clockInPhoto: att.clockInPhoto || null,
        photo: att.clockInPhoto || null,
        clockOut: formatTimeInCompanyTz(att.clockOutTime),
        clockOutRaw: att.clockOutTime ? new Date(att.clockOutTime).toISOString() : null,
        clockOutPhoto: att.clockOutPhoto || null,
        workingHours: calculateDuration(att.clockInTime, att.clockOutTime, att.workingHours),
        status: att.status ? att.status.toLowerCase() : 'not_started',
        isManual: Boolean(att.isManual),
        isManualEntry: Boolean(att.isManual),
        reason: att.reason || null,
        addedByManager: managerName,
        managerName,
        createdAt: att.createdAt,
        updatedAt: att.updatedAt,
    };
}
class AttendanceService {
    /**
     * Clock In an employee for today
     */
    async clockIn(employeeId, file, photoBase64, targetDateStr, authUserId) {
        if (!employeeId) {
            throw new errorHandler_1.AppError('Employee ID is required for Clock In', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const employee = await database_1.default.user.findUnique({
            where: { id: employeeId },
            include: { staffProfile: true, role: true },
        });
        if (!employee) {
            throw new errorHandler_1.AppError('Employee not found', constants_1.HTTP_STATUS.NOT_FOUND);
        }
        const targetDate = normalizeDate(targetDateStr);
        // Duplicate Check (Requirement 6): Prevent multiple Clock In records on same day
        const existing = await database_1.default.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: targetDate,
                },
            },
        });
        if (existing && existing.clockInTime) {
            throw new errorHandler_1.AppError('Already clocked in today', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        // Photo is mandatory for clock in
        let photoUrl = null;
        if (file && file.buffer) {
            const uploadRes = await media_service_1.mediaService.uploadBufferToCloudinary(file.buffer, 'omega-spa/attendance/login', {
                tags: ['attendance', 'clock-in', employee.staffProfile?.name || employee.email],
            });
            photoUrl = uploadRes.url;
        }
        else if (photoBase64 && photoBase64.startsWith('data:')) {
            const uploadRes = await media_service_1.mediaService.uploadBase64ToCloudinary(photoBase64, 'omega-spa/attendance/login');
            photoUrl = uploadRes.url;
        }
        else if (photoBase64 && (photoBase64.startsWith('http://') || photoBase64.startsWith('https://'))) {
            photoUrl = photoBase64;
        }
        if (!photoUrl) {
            throw new errorHandler_1.AppError('Verification photo is required for Clock In', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const now = new Date();
        // Create or update record in database
        const record = await database_1.default.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId,
                    date: targetDate,
                },
            },
            create: {
                employeeId,
                date: targetDate,
                clockInTime: now,
                clockInPhoto: photoUrl,
                status: 'WORKING',
                createdById: authUserId || employeeId,
            },
            update: {
                clockInTime: now,
                clockInPhoto: photoUrl,
                status: 'WORKING',
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        email: true,
                        role: { select: { name: true } },
                        staffProfile: { select: { name: true, phone: true } },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
            },
        });
        logger_1.logger.info(`[Attendance Clock In] employee: ${employee.staffProfile?.name || employee.email}, targetDate: ${targetDate.toISOString().slice(0, 10)}, UTC now: ${now.toISOString()}, Douala time: ${formatTimeInCompanyTz(now)}`);
        return formatAttendanceRecord(record);
    }
    /**
     * Clock Out an employee for today
     */
    async clockOut(employeeId, file, photoBase64, targetDateStr) {
        if (!employeeId) {
            throw new errorHandler_1.AppError('Employee ID is required for Clock Out', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const targetDate = normalizeDate(targetDateStr);
        const existing = await database_1.default.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: targetDate,
                },
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        email: true,
                        role: { select: { name: true } },
                        staffProfile: { select: { name: true, phone: true } },
                    },
                },
            },
        });
        if (!existing || !existing.clockInTime) {
            throw new errorHandler_1.AppError('No active clock-in found for today', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        let photoUrl = null;
        if (file && file.buffer) {
            const uploadRes = await media_service_1.mediaService.uploadBufferToCloudinary(file.buffer, 'omega-spa/attendance/logout', {
                tags: ['attendance', 'clock-out', existing.employee?.staffProfile?.name || existing.employee?.email || ''],
            });
            photoUrl = uploadRes.url;
        }
        else if (photoBase64 && photoBase64.startsWith('data:')) {
            const uploadRes = await media_service_1.mediaService.uploadBase64ToCloudinary(photoBase64, 'omega-spa/attendance/logout');
            photoUrl = uploadRes.url;
        }
        else if (photoBase64 && (photoBase64.startsWith('http://') || photoBase64.startsWith('https://'))) {
            photoUrl = photoBase64;
        }
        if (!photoUrl) {
            throw new errorHandler_1.AppError('Verification photo is required for Clock Out', constants_1.HTTP_STATUS.BAD_REQUEST);
        }
        const now = new Date();
        const diffMs = now.getTime() - new Date(existing.clockInTime).getTime();
        const hoursDecimal = Math.max(0, +(diffMs / (1000 * 60 * 60)).toFixed(2));
        const updated = await database_1.default.attendance.update({
            where: { id: existing.id },
            data: {
                clockOutTime: now,
                clockOutPhoto: photoUrl,
                workingHours: hoursDecimal,
                status: 'COMPLETED',
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        email: true,
                        role: { select: { name: true } },
                        staffProfile: { select: { name: true, phone: true } },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
            },
        });
        logger_1.logger.info(`[Attendance Clock Out] employee: ${existing.employee?.staffProfile?.name || existing.employee?.email} on ${targetDate.toISOString().slice(0, 10)}, UTC now: ${now.toISOString()}, Douala time: ${formatTimeInCompanyTz(now)}, duration: ${calculateDuration(existing.clockInTime, now)}`);
        return formatAttendanceRecord(updated);
    }
    /**
     * Get today's attendance record for an employee, or for all employees (manager view)
     */
    async getTodayAttendance(employeeId, dateStr) {
        const targetDate = normalizeDate(dateStr);
        if (employeeId) {
            const record = await database_1.default.attendance.findUnique({
                where: {
                    employeeId_date: {
                        employeeId,
                        date: targetDate,
                    },
                },
                include: {
                    employee: {
                        select: {
                            id: true,
                            email: true,
                            role: { select: { name: true } },
                            staffProfile: { select: { name: true, phone: true } },
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            email: true,
                            staffProfile: { select: { name: true } },
                        },
                    },
                },
            });
            return { record: formatAttendanceRecord(record) };
        }
        // All employees for today
        const records = await database_1.default.attendance.findMany({
            where: { date: targetDate },
            include: {
                employee: {
                    select: {
                        id: true,
                        email: true,
                        role: { select: { name: true } },
                        staffProfile: { select: { name: true, phone: true } },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return { records: records.map(formatAttendanceRecord) };
    }
    /**
     * Get attendance records with filters (manager history or employee history)
     */
    async getAttendanceRecords(filters) {
        const where = {};
        if (filters.employeeId) {
            where.employeeId = filters.employeeId;
        }
        if (filters.date) {
            where.date = normalizeDate(filters.date);
        }
        else if (filters.startDate || filters.endDate) {
            where.date = {};
            if (filters.startDate)
                where.date.gte = normalizeDate(filters.startDate);
            if (filters.endDate)
                where.date.lte = normalizeDate(filters.endDate);
        }
        if (filters.status) {
            where.status = filters.status.toUpperCase();
        }
        const records = await database_1.default.attendance.findMany({
            where,
            include: {
                employee: {
                    select: {
                        id: true,
                        email: true,
                        role: { select: { name: true } },
                        staffProfile: { select: { name: true, phone: true } },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
            },
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
        return records.map(formatAttendanceRecord);
    }
    /**
     * Manager Manual Attendance Entry / Override
     */
    async addManualAttendance(data, file) {
        const { employeeId, date, clockInTime, clockOutTime, status, reason, photoBase64, allowOverride, managerId } = data;
        if (!employeeId)
            throw new errorHandler_1.AppError('Employee is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        if (!reason?.trim())
            throw new errorHandler_1.AppError('Reason for manual entry is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        if (!clockInTime)
            throw new errorHandler_1.AppError('Clock In time is required', constants_1.HTTP_STATUS.BAD_REQUEST);
        const cleanDateStr = (date || getCompanyTodayDateStr()).slice(0, 10);
        const targetDate = normalizeDate(cleanDateStr);
        // Check existing
        const existing = await database_1.default.attendance.findUnique({
            where: {
                employeeId_date: {
                    employeeId,
                    date: targetDate,
                },
            },
        });
        if (existing && !allowOverride) {
            throw new errorHandler_1.AppError('Attendance record already exists for this date. Enable override to update.', constants_1.HTTP_STATUS.CONFLICT);
        }
        // Optional photo upload
        let photoUrl = null;
        if (file && file.buffer) {
            const uploadRes = await media_service_1.mediaService.uploadBufferToCloudinary(file.buffer, 'omega-spa/attendance/manual', {
                tags: ['attendance', 'manual-entry'],
            });
            photoUrl = uploadRes.url;
        }
        else if (photoBase64 && photoBase64.startsWith('data:')) {
            const uploadRes = await media_service_1.mediaService.uploadBase64ToCloudinary(photoBase64, 'omega-spa/attendance/manual');
            photoUrl = uploadRes.url;
        }
        else if (photoBase64 && (photoBase64.startsWith('http://') || photoBase64.startsWith('https://'))) {
            photoUrl = photoBase64;
        }
        // Calculate times strictly in Africa/Douala (UTC+01:00)
        const clockInDateTime = parseCompanyTimeToUtc(cleanDateStr, clockInTime);
        let clockOutDateTime = null;
        let workingHours = null;
        const isCompleted = status === 'completed' || Boolean(clockOutTime);
        if (isCompleted && clockOutTime) {
            clockOutDateTime = parseCompanyTimeToUtc(cleanDateStr, clockOutTime);
            const diffMs = clockOutDateTime.getTime() - clockInDateTime.getTime();
            if (diffMs > 0) {
                workingHours = +(diffMs / (1000 * 60 * 60)).toFixed(2);
            }
        }
        const record = await database_1.default.attendance.upsert({
            where: {
                employeeId_date: {
                    employeeId,
                    date: targetDate,
                },
            },
            create: {
                employeeId,
                date: targetDate,
                clockInTime: clockInDateTime,
                clockInPhoto: photoUrl,
                clockOutPhoto: isCompleted ? photoUrl : null,
                clockOutTime: clockOutDateTime,
                workingHours,
                status: isCompleted ? 'COMPLETED' : 'WORKING',
                isManual: true,
                reason: reason.trim(),
                createdById: managerId,
            },
            update: {
                clockInTime: clockInDateTime,
                clockInPhoto: existing?.clockInPhoto || photoUrl,
                clockOutPhoto: isCompleted ? (photoUrl || existing?.clockOutPhoto || null) : (existing?.clockOutPhoto || null),
                clockOutTime: clockOutDateTime,
                workingHours,
                status: isCompleted ? 'COMPLETED' : 'WORKING',
                isManual: true,
                reason: reason.trim(),
                createdById: managerId,
            },
            include: {
                employee: {
                    select: {
                        id: true,
                        email: true,
                        role: { select: { name: true } },
                        staffProfile: { select: { name: true, phone: true } },
                    },
                },
                createdBy: {
                    select: {
                        id: true,
                        email: true,
                        staffProfile: { select: { name: true } },
                    },
                },
            },
        });
        logger_1.logger.info(`[Attendance Manual Entry] manager: ${managerId}, employee: ${employeeId}, date: ${cleanDateStr}, Douala Clock In: ${clockInTime} -> UTC: ${clockInDateTime.toISOString()}, Douala Clock Out: ${clockOutTime || 'none'} -> UTC: ${clockOutDateTime ? clockOutDateTime.toISOString() : 'none'}`);
        return formatAttendanceRecord(record);
    }
}
exports.attendanceService = new AttendanceService();
exports.default = exports.attendanceService;
//# sourceMappingURL=attendance.service.js.map