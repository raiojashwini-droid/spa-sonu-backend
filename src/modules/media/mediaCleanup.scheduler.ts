/**
 * OMEGA SPA POS — Cloudinary Media Retention Scheduler
 *
 * Runs daily at midnight (00:00 Africa/Douala) to purge expired media:
 * - Cleaning proof photos older than 30 days
 * - Attendance verification photos older than 30 days
 *
 * Automatically initialized during backend startup.
 */

import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../../utils/logger';
import { mediaCleanupService, MEDIA_RETENTION_CONFIG, MediaCleanupResult } from './mediaCleanup.service';

let scheduledTask: ScheduledTask | null = null;
let isJobRunning = false;

/**
 * Initializes and starts the media cleanup background cron job
 */
export function initMediaCleanupScheduler(): ScheduledTask {
  if (scheduledTask) {
    logger.info('[Media Scheduler] Media cleanup scheduler already active.');
    return scheduledTask;
  }

  logger.info(
    `[Media Scheduler] Initializing daily media cleanup cron ('${MEDIA_RETENTION_CONFIG.CRON_EXPRESSION}') in timezone '${MEDIA_RETENTION_CONFIG.TIMEZONE}'`
  );

  scheduledTask = cron.schedule(
    MEDIA_RETENTION_CONFIG.CRON_EXPRESSION,
    async () => {
      if (isJobRunning) {
        logger.warn('[Media Scheduler] Previous cleanup job still in progress. Skipping duplicate tick.');
        return;
      }

      isJobRunning = true;
      try {
        logger.info('[Media Scheduler] Triggering midnight scheduled media cleanup...');
        const result = await mediaCleanupService.cleanupExpiredMedia();
        logger.info('[Media Scheduler] Scheduled media cleanup finished successfully.', {
          cleaningDeleted: result.cleaning.deleted,
          attendanceCleaned: result.attendance.cleaned,
        });
      } catch (err: any) {
        logger.error('[Media Scheduler] Critical error during scheduled media cleanup:', {
          error: err?.message || String(err),
        });
      } finally {
        isJobRunning = false;
      }
    },

    {
      timezone: MEDIA_RETENTION_CONFIG.TIMEZONE,
    }
  );

  logger.info(`✓ [Media Scheduler] Media retention auto-cleanup job successfully scheduled (00:00 midnight ${MEDIA_RETENTION_CONFIG.TIMEZONE}).`);
  return scheduledTask;
}

/**
 * Stops the scheduled cron task if running
 */
export function stopMediaCleanupScheduler(): void {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    logger.info('[Media Scheduler] Media cleanup scheduler stopped.');
  }
}

/**
 * Manually invokes cleanup for testing or management triggers
 */
export async function triggerManualCleanup(retentionDays?: number): Promise<MediaCleanupResult> {
  if (isJobRunning) {
    throw new Error('A media cleanup job is already currently running.');
  }

  isJobRunning = true;
  try {
    return await mediaCleanupService.cleanupExpiredMedia(retentionDays);
  } finally {
    isJobRunning = false;
  }
}
