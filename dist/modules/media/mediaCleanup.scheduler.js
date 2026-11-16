"use strict";
/**
 * OMEGA SPA POS — Cloudinary Media Retention Scheduler
 *
 * Runs daily at midnight (00:00 Africa/Douala) to purge expired media:
 * - Cleaning proof photos older than 30 days
 * - Attendance verification photos older than 30 days
 *
 * Automatically initialized during backend startup.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initMediaCleanupScheduler = initMediaCleanupScheduler;
exports.stopMediaCleanupScheduler = stopMediaCleanupScheduler;
exports.triggerManualCleanup = triggerManualCleanup;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../../utils/logger");
const mediaCleanup_service_1 = require("./mediaCleanup.service");
let scheduledTask = null;
let isJobRunning = false;
/**
 * Initializes and starts the media cleanup background cron job
 */
function initMediaCleanupScheduler() {
    if (scheduledTask) {
        logger_1.logger.info('[Media Scheduler] Media cleanup scheduler already active.');
        return scheduledTask;
    }
    logger_1.logger.info(`[Media Scheduler] Initializing daily media cleanup cron ('${mediaCleanup_service_1.MEDIA_RETENTION_CONFIG.CRON_EXPRESSION}') in timezone '${mediaCleanup_service_1.MEDIA_RETENTION_CONFIG.TIMEZONE}'`);
    scheduledTask = node_cron_1.default.schedule(mediaCleanup_service_1.MEDIA_RETENTION_CONFIG.CRON_EXPRESSION, async () => {
        if (isJobRunning) {
            logger_1.logger.warn('[Media Scheduler] Previous cleanup job still in progress. Skipping duplicate tick.');
            return;
        }
        isJobRunning = true;
        try {
            logger_1.logger.info('[Media Scheduler] Triggering midnight scheduled media cleanup...');
            const result = await mediaCleanup_service_1.mediaCleanupService.cleanupExpiredMedia();
            logger_1.logger.info('[Media Scheduler] Scheduled media cleanup finished successfully.', {
                cleaningDeleted: result.cleaning.deleted,
                attendanceCleaned: result.attendance.cleaned,
            });
        }
        catch (err) {
            logger_1.logger.error('[Media Scheduler] Critical error during scheduled media cleanup:', {
                error: err?.message || String(err),
            });
        }
        finally {
            isJobRunning = false;
        }
    }, {
        timezone: mediaCleanup_service_1.MEDIA_RETENTION_CONFIG.TIMEZONE,
    });
    logger_1.logger.info(`✓ [Media Scheduler] Media retention auto-cleanup job successfully scheduled (00:00 midnight ${mediaCleanup_service_1.MEDIA_RETENTION_CONFIG.TIMEZONE}).`);
    return scheduledTask;
}
/**
 * Stops the scheduled cron task if running
 */
function stopMediaCleanupScheduler() {
    if (scheduledTask) {
        scheduledTask.stop();
        scheduledTask = null;
        logger_1.logger.info('[Media Scheduler] Media cleanup scheduler stopped.');
    }
}
/**
 * Manually invokes cleanup for testing or management triggers
 */
async function triggerManualCleanup(retentionDays) {
    if (isJobRunning) {
        throw new Error('A media cleanup job is already currently running.');
    }
    isJobRunning = true;
    try {
        return await mediaCleanup_service_1.mediaCleanupService.cleanupExpiredMedia(retentionDays);
    }
    finally {
        isJobRunning = false;
    }
}
//# sourceMappingURL=mediaCleanup.scheduler.js.map