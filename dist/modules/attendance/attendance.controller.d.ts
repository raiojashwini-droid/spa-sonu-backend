/**
 * OMEGA SPA POS — Attendance Controller
 */
import { Request, Response, NextFunction } from 'express';
declare class AttendanceController {
    /**
     * POST /api/v1/attendance/clock-in
     * Clock-in for an employee (photo required, uploaded to Cloudinary, saved in DB)
     */
    clockIn(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/v1/attendance/clock-out
     * Clock-out for an employee
     */
    clockOut(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/v1/attendance/today
     * Fetches today's attendance for the logged-in user or all employees for manager
     */
    getToday(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * GET /api/v1/attendance
     * List attendance records with filtering
     */
    getAll(req: Request, res: Response, next: NextFunction): Promise<void>;
    /**
     * POST /api/v1/attendance/manual
     * Manager manual attendance entry or override
     */
    manualEntry(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const attendanceController: AttendanceController;
export default attendanceController;
//# sourceMappingURL=attendance.controller.d.ts.map