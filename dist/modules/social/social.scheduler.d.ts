/**
 * Social Media Background Scheduler
 *
 * Runs every minute (* * * * *).
 * Queries database for scheduled posts that are due (scheduledFor <= now and status === 'SCHEDULED').
 * Executes automatic publishing via Meta Graph API & TikTok.
 */
export declare function initSocialMediaScheduler(): void;
//# sourceMappingURL=social.scheduler.d.ts.map