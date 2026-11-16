/**
 * OMEGA SPA POS — Cloudinary Media Retention Scheduler
 *
 * Runs daily at midnight (00:00 Africa/Douala) to purge expired media:
 * - Cleaning proof photos older than 30 days
 * - Attendance verification photos older than 30 days
 *
 * Automatically initialized during backend startup.
 */
import { ScheduledTask } from 'node-cron';
import { MediaCleanupResult } from './mediaCleanup.service';
/**
 * Initializes and starts the media cleanup background cron job
 */
export declare function initMediaCleanupScheduler(): ScheduledTask;
/**
 * Stops the scheduled cron task if running
 */
export declare function stopMediaCleanupScheduler(): void;
/**
 * Manually invokes cleanup for testing or management triggers
 */
export declare function triggerManualCleanup(retentionDays?: number): Promise<MediaCleanupResult>;
//# sourceMappingURL=mediaCleanup.scheduler.d.ts.map