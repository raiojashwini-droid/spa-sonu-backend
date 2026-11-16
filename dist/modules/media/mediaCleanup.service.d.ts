/**
 * OMEGA SPA POS — Cloudinary Media Retention & Auto Cleanup Service
 *
 * Implements strict media retention policies:
 * 1. Cleaning Proof Photos: 30-day retention -> deletes from Cloudinary & deletes CleaningMedia row
 * 2. Attendance Photos: 30-day retention -> deletes from Cloudinary & sets clockInPhoto/clockOutPhoto = null
 * 3. Client Treatment Photos (BEFORE/AFTER): PERMANENT -> never deleted
 *
 * Safety & Audit:
 * - Creates a system audit log prior to every Cloudinary deletion
 * - Re-uses mediaService.deleteFromCloudinary
 * - Non-crashing, resilient error handling
 */
export declare const MEDIA_RETENTION_CONFIG: {
    readonly CLEANING_RETENTION_DAYS: 30;
    readonly ATTENDANCE_RETENTION_DAYS: 30;
    readonly TIMEZONE: "Africa/Douala";
    readonly CRON_EXPRESSION: "0 0 * * *";
};
export interface MediaDeletionAuditLog {
    mediaType: 'CLEANING_BEFORE' | 'CLEANING_AFTER' | 'ATTENDANCE_LOGIN' | 'ATTENDANCE_LOGOUT';
    publicId: string;
    deletionDate: string;
    deletionReason: string;
    deletedBy: 'SYSTEM';
    status: 'SUCCESS' | 'FAILED' | 'SKIPPED_PROTECTED';
    details?: string;
}
export interface MediaCleanupResult {
    startedAt: string;
    completedAt: string;
    retentionDays: number;
    cleaning: {
        scanned: number;
        deleted: number;
        failed: number;
    };
    attendance: {
        scanned: number;
        cleaned: number;
        failed: number;
    };
    auditLogs: MediaDeletionAuditLog[];
}
export declare class MediaCleanupService {
    private auditLogs;
    private readonly maxAuditLogs;
    /**
     * Records a structured system audit log before/after deletion
     */
    private recordAuditLog;
    /**
     * Retrieves recent system audit logs
     */
    getAuditLogs(limit?: number): MediaDeletionAuditLog[];
    /**
     * Safety guard to ensure client treatment photos are NEVER deleted
     */
    private isProtectedClientAsset;
    /**
     * 1. Cleaning Photos Retention Cleanup
     * Deletes Cloudinary assets and removes database CleaningMedia rows older than retentionDays (default 30).
     */
    cleanupExpiredCleaningPhotos(retentionDays?: number): Promise<{
        scanned: number;
        deleted: number;
        failed: number;
    }>;
    /**
     * 2. Attendance Photos Retention Cleanup
     * Deletes Cloudinary assets and clears clockInPhoto/clockOutPhoto in Attendance records older than retentionDays (default 30).
     */
    cleanupExpiredAttendancePhotos(retentionDays?: number): Promise<{
        scanned: number;
        cleaned: number;
        failed: number;
    }>;
    /**
     * 3. Orchestrated Cleanup Execution
     * Executes cleaning and attendance cleanups. Safe top-level wrapper that never throws or crashes the server.
     */
    cleanupExpiredMedia(retentionDays?: number): Promise<MediaCleanupResult>;
}
export declare const mediaCleanupService: MediaCleanupService;
//# sourceMappingURL=mediaCleanup.service.d.ts.map