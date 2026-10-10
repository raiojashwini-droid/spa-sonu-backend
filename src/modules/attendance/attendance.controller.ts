/**
 * OMEGA SPA POS — Attendance Controller
 */

import { Request, Response, NextFunction } from 'express';
import { attendanceService } from './attendance.service';
import { sendSuccess } from '../../utils/response';
import { HTTP_STATUS } from '../../config/constants';
import { AppError } from '../../middleware/errorHandler';

class AttendanceController {
  /**
   * POST /api/v1/attendance/clock-in
   * Clock-in for an employee (photo required, uploaded to Cloudinary, saved in DB)
   */
  async clockIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUserId = req.user?.id;
      const targetEmployeeId = req.body.employeeId || authUserId;

      if (!targetEmployeeId) {
        throw new AppError('employeeId is required', HTTP_STATUS.BAD_REQUEST);
      }

      // Supports either multer req.file or base64 photo in req.body.photo / req.body.image
      const photoBase64 = req.body.photo || req.body.image || req.body.photoBase64;
      const targetDate = req.body.date;

      const record = await attendanceService.clockIn(
        targetEmployeeId,
        req.file,
        photoBase64,
        targetDate,
        authUserId
      );

      sendSuccess(res, record, HTTP_STATUS.CREATED, 'Clocked in successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/attendance/clock-out
   * Clock-out for an employee
   */
  async clockOut(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const authUserId = req.user?.id;
      const targetEmployeeId = req.body.employeeId || authUserId;

      if (!targetEmployeeId) {
        throw new AppError('employeeId is required', HTTP_STATUS.BAD_REQUEST);
      }

      const photoBase64 = req.body.photo || req.body.image || req.body.photoBase64;
      const targetDate = req.body.date;

      const record = await attendanceService.clockOut(
        targetEmployeeId,
        req.file,
        photoBase64,
        targetDate
      );

      sendSuccess(res, record, HTTP_STATUS.OK, 'Clocked out successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/attendance/today
   * Fetches today's attendance for the logged-in user or all employees for manager
   */
  async getToday(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleUpper = req.user?.role?.toUpperCase() || '';
      const canViewAll = roleUpper === 'MANAGER' || roleUpper === 'RECEPTION' || roleUpper === 'RECEPTIONIST';
      const requestedEmployeeId = (req.query.employeeId as string) || (canViewAll ? undefined : req.user?.id);
      const dateStr = req.query.date as string | undefined;

      const result = await attendanceService.getTodayAttendance(requestedEmployeeId, dateStr);

      sendSuccess(res, result, HTTP_STATUS.OK, "Today's attendance retrieved successfully");
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/attendance
   * List attendance records with filtering
   */
  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleUpper = req.user?.role?.toUpperCase() || '';
      const canViewAll = roleUpper === 'MANAGER' || roleUpper === 'RECEPTION' || roleUpper === 'RECEPTIONIST';
      const targetEmployeeId = canViewAll
        ? (req.query.employeeId as string | undefined)
        : req.user?.id;

      const filters = {
        employeeId: targetEmployeeId,
        date: req.query.date as string | undefined,
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        status: req.query.status as string | undefined,
      };

      const records = await attendanceService.getAttendanceRecords(filters);

      sendSuccess(res, records, HTTP_STATUS.OK, 'Attendance records retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/attendance/manual
   * Manager manual attendance entry or override
   */
  async manualEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const managerId = req.user?.id;
      if (!managerId) {
        throw new AppError('Manager authentication required', HTTP_STATUS.UNAUTHORIZED);
      }

      const {
        employeeId,
        date,
        clockInTime,
        clockOutTime,
        status,
        reason,
        photo,
        allowOverride,
      } = req.body;

      const record = await attendanceService.addManualAttendance(
        {
          employeeId,
          date,
          clockInTime,
          clockOutTime,
          status,
          reason,
          photoBase64: photo || req.body.photoBase64,
          allowOverride: Boolean(allowOverride),
          managerId,
        },
        req.file
      );

      sendSuccess(res, record, HTTP_STATUS.CREATED, 'Manual attendance record saved successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const attendanceController = new AttendanceController();
export default attendanceController;
