/**
 * OMEGA SPA POS — Attendance Service
 * Handles employee clock-in, clock-out, live sync, and database persistence.
 */
export interface ClockInInput {
    employeeId?: string;
    date?: string;
    photoBase64?: string;
}
export interface ClockOutInput {
    employeeId?: string;
    date?: string;
    photoBase64?: string;
}
export interface ManualAttendanceInput {
    employeeId: string;
    date: string;
    clockInTime: string;
    clockOutTime?: string;
    status?: string;
    reason: string;
    photoBase64?: string;
    allowOverride?: boolean;
    managerId: string;
}
export interface AttendanceFilters {
    employeeId?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
}
export declare const COMPANY_TIMEZONE = "Africa/Douala";
/**
 * Returns today's date formatted as YYYY-MM-DD in Africa/Douala timezone
 */
export declare function getCompanyTodayDateStr(): string;
/**
 * Formats a Date or ISO string into 12-hour AM/PM string in Africa/Douala
 */
export declare function formatTimeInCompanyTz(d: Date | string | null | undefined): string | null;
/**
 * Formats a Date or ISO string into 24-hour "HH:mm" string in Africa/Douala
 */
export declare function format24HourInCompanyTz(d: Date | string | null | undefined): string | null;
/**
 * Converts a company date (YYYY-MM-DD) and 24-hour time (HH:mm) into a UTC Date object.
 * Africa/Douala is WAT (UTC+01:00) year-round without DST.
 */
export declare function parseCompanyTimeToUtc(dateStr: string, timeStr: string): Date;
/**
 * Calculates duration in minutes and returns "Xh Ym" string
 */
export declare function calculateDuration(clockIn: Date | string | null | undefined, clockOut: Date | string | null | undefined, fallbackWorkingHours?: any): string | null;
/**
 * Formats a Prisma attendance record into a standardized frontend-friendly response
 */
export declare function formatAttendanceRecord(att: any): {
    id: any;
    employeeId: any;
    employeeName: any;
    employeeRole: any;
    date: string;
    clockIn: string | null;
    clockInRaw: string | null;
    clockInPhoto: any;
    photo: any;
    clockOut: string | null;
    clockOutRaw: string | null;
    clockOutPhoto: any;
    workingHours: string | null;
    status: any;
    isManual: boolean;
    isManualEntry: boolean;
    reason: any;
    addedByManager: any;
    managerName: any;
    createdAt: any;
    updatedAt: any;
} | null;
declare class AttendanceService {
    /**
     * Clock In an employee for today
     */
    clockIn(employeeId: string, file?: Express.Multer.File, photoBase64?: string, targetDateStr?: string, authUserId?: string): Promise<{
        id: any;
        employeeId: any;
        employeeName: any;
        employeeRole: any;
        date: string;
        clockIn: string | null;
        clockInRaw: string | null;
        clockInPhoto: any;
        photo: any;
        clockOut: string | null;
        clockOutRaw: string | null;
        clockOutPhoto: any;
        workingHours: string | null;
        status: any;
        isManual: boolean;
        isManualEntry: boolean;
        reason: any;
        addedByManager: any;
        managerName: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    /**
     * Clock Out an employee for today
     */
    clockOut(employeeId: string, file?: Express.Multer.File, photoBase64?: string, targetDateStr?: string): Promise<{
        id: any;
        employeeId: any;
        employeeName: any;
        employeeRole: any;
        date: string;
        clockIn: string | null;
        clockInRaw: string | null;
        clockInPhoto: any;
        photo: any;
        clockOut: string | null;
        clockOutRaw: string | null;
        clockOutPhoto: any;
        workingHours: string | null;
        status: any;
        isManual: boolean;
        isManualEntry: boolean;
        reason: any;
        addedByManager: any;
        managerName: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
    /**
     * Get today's attendance record for an employee, or for all employees (manager view)
     */
    getTodayAttendance(employeeId?: string, dateStr?: string): Promise<{
        record: {
            id: any;
            employeeId: any;
            employeeName: any;
            employeeRole: any;
            date: string;
            clockIn: string | null;
            clockInRaw: string | null;
            clockInPhoto: any;
            photo: any;
            clockOut: string | null;
            clockOutRaw: string | null;
            clockOutPhoto: any;
            workingHours: string | null;
            status: any;
            isManual: boolean;
            isManualEntry: boolean;
            reason: any;
            addedByManager: any;
            managerName: any;
            createdAt: any;
            updatedAt: any;
        } | null;
        records?: undefined;
    } | {
        records: ({
            id: any;
            employeeId: any;
            employeeName: any;
            employeeRole: any;
            date: string;
            clockIn: string | null;
            clockInRaw: string | null;
            clockInPhoto: any;
            photo: any;
            clockOut: string | null;
            clockOutRaw: string | null;
            clockOutPhoto: any;
            workingHours: string | null;
            status: any;
            isManual: boolean;
            isManualEntry: boolean;
            reason: any;
            addedByManager: any;
            managerName: any;
            createdAt: any;
            updatedAt: any;
        } | null)[];
        record?: undefined;
    }>;
    /**
     * Get attendance records with filters (manager history or employee history)
     */
    getAttendanceRecords(filters: AttendanceFilters): Promise<({
        id: any;
        employeeId: any;
        employeeName: any;
        employeeRole: any;
        date: string;
        clockIn: string | null;
        clockInRaw: string | null;
        clockInPhoto: any;
        photo: any;
        clockOut: string | null;
        clockOutRaw: string | null;
        clockOutPhoto: any;
        workingHours: string | null;
        status: any;
        isManual: boolean;
        isManualEntry: boolean;
        reason: any;
        addedByManager: any;
        managerName: any;
        createdAt: any;
        updatedAt: any;
    } | null)[]>;
    /**
     * Manager Manual Attendance Entry / Override
     */
    addManualAttendance(data: ManualAttendanceInput, file?: Express.Multer.File): Promise<{
        id: any;
        employeeId: any;
        employeeName: any;
        employeeRole: any;
        date: string;
        clockIn: string | null;
        clockInRaw: string | null;
        clockInPhoto: any;
        photo: any;
        clockOut: string | null;
        clockOutRaw: string | null;
        clockOutPhoto: any;
        workingHours: string | null;
        status: any;
        isManual: boolean;
        isManualEntry: boolean;
        reason: any;
        addedByManager: any;
        managerName: any;
        createdAt: any;
        updatedAt: any;
    } | null>;
}
export declare const attendanceService: AttendanceService;
export default attendanceService;
//# sourceMappingURL=attendance.service.d.ts.map