/**
 * OMEGA SPA POS — WhatsApp Automation Scheduler
 *
 * Background cron jobs for automated WhatsApp message dispatch.
 * Uses node-cron with Africa/Douala timezone.
 *
 * Jobs:
 *   - Every hour (0 * * * *): Appointment 24h & 2h reminders
 *   - Daily 09:00 (0 9 * * *): Birthday & Anniversary greetings
 *   - Daily 10:00 (0 10 * * *): Rebooking inactive client reminders
 *   - Daily 19:30 (30 19 * * *): Daily Close Boss Summary
 *
 * Automatically initialized during backend startup via server.ts.
 */
/**
 * Converts "HH:mm" (e.g. "10:00", "19:30") into a cron expression ("0 10 * * *", "30 19 * * *")
 */
export declare function timeStringToCron(timeStr: string, defaultHour?: number, defaultMinute?: number): string;
/**
 * Dynamically reschedules an automation job to a new time without server restart.
 */
export declare function rescheduleWhatsAppJob(type: string, newTiming: string): boolean;
/**
 * Initializes all WhatsApp automation cron jobs
 */
export declare function initWhatsAppScheduler(): void;
/**
 * Stops all WhatsApp scheduled cron tasks
 */
export declare function stopWhatsAppScheduler(): void;
//# sourceMappingURL=whatsapp.scheduler.d.ts.map