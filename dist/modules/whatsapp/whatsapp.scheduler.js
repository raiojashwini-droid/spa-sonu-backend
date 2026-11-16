"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.timeStringToCron = timeStringToCron;
exports.rescheduleWhatsAppJob = rescheduleWhatsAppJob;
exports.initWhatsAppScheduler = initWhatsAppScheduler;
exports.stopWhatsAppScheduler = stopWhatsAppScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const logger_1 = require("../../utils/logger");
const whatsapp_service_1 = require("./whatsapp.service");
const holiday_service_1 = require("./holiday.service");
const database_1 = __importDefault(require("../../config/database"));
const WHATSAPP_TIMEZONE = 'Africa/Douala';
const scheduledJobs = [];
const jobRegistry = {};
/**
 * Converts "HH:mm" (e.g. "10:00", "19:30") into a cron expression ("0 10 * * *", "30 19 * * *")
 */
function timeStringToCron(timeStr, defaultHour = 10, defaultMinute = 0) {
    if (!timeStr)
        return `${defaultMinute} ${defaultHour} * * *`;
    const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match)
        return `${defaultMinute} ${defaultHour} * * *`;
    const hour = Math.min(23, Math.max(0, parseInt(match[1], 10)));
    const minute = Math.min(59, Math.max(0, parseInt(match[2], 10)));
    return `${minute} ${hour} * * *`;
}
/**
 * Creates a guarded cron job that prevents duplicate concurrent runs
 */
function createGuardedJob(name, cronExpression, handler, registryKey) {
    const state = {
        task: null,
        name,
        cronExpression,
        isRunning: false,
        handler,
    };
    state.task = node_cron_1.default.schedule(cronExpression, async () => {
        if (state.isRunning) {
            logger_1.logger.warn(`[WhatsApp Scheduler] ${name}: Previous run still in progress. Skipping.`);
            return;
        }
        state.isRunning = true;
        try {
            logger_1.logger.info(`[WhatsApp Scheduler] ${name}: Starting...`);
            await handler();
            logger_1.logger.info(`[WhatsApp Scheduler] ${name}: Completed successfully.`);
        }
        catch (err) {
            logger_1.logger.error(`[WhatsApp Scheduler] ${name}: Error during execution`, {
                error: err?.message || String(err),
            });
        }
        finally {
            state.isRunning = false;
        }
    }, {
        timezone: WHATSAPP_TIMEZONE,
    });
    scheduledJobs.push(state);
    if (registryKey) {
        jobRegistry[registryKey.toUpperCase()] = state;
    }
    return state;
}
/**
 * Dynamically reschedules an automation job to a new time without server restart.
 */
function rescheduleWhatsAppJob(type, newTiming) {
    const key = type.toUpperCase().replace(/-/g, '_');
    const job = jobRegistry[key];
    if (!job) {
        logger_1.logger.info(`[WhatsApp Scheduler] Job ${key} not registered for dynamic daily rescheduling (event-driven or relative).`);
        return false;
    }
    const newCron = timeStringToCron(newTiming);
    logger_1.logger.info(`[WhatsApp Scheduler] Rescheduling ${job.name} (${key}) to ${newTiming} -> cron "${newCron}" (${WHATSAPP_TIMEZONE})`);
    try {
        job.task.stop();
    }
    catch (err) {
        logger_1.logger.warn(`[WhatsApp Scheduler] Error stopping task ${job.name}:`, err?.message || err);
    }
    job.cronExpression = newCron;
    job.task = node_cron_1.default.schedule(newCron, async () => {
        if (job.isRunning) {
            logger_1.logger.warn(`[WhatsApp Scheduler] ${job.name}: Previous run still in progress. Skipping.`);
            return;
        }
        job.isRunning = true;
        try {
            logger_1.logger.info(`[WhatsApp Scheduler] ${job.name}: Starting (rescheduled time ${newTiming})...`);
            await job.handler();
            logger_1.logger.info(`[WhatsApp Scheduler] ${job.name}: Completed successfully.`);
        }
        catch (err) {
            logger_1.logger.error(`[WhatsApp Scheduler] ${job.name}: Error during execution`, {
                error: err?.message || String(err),
            });
        }
        finally {
            job.isRunning = false;
        }
    }, { timezone: WHATSAPP_TIMEZONE });
    return true;
}
/**
 * Initializes all WhatsApp automation cron jobs
 */
function initWhatsAppScheduler() {
    if (scheduledJobs.length > 0) {
        logger_1.logger.info('[WhatsApp Scheduler] WhatsApp scheduler already active.');
        return;
    }
    logger_1.logger.info(`[WhatsApp Scheduler] Initializing WhatsApp automation cron jobs (timezone: ${WHATSAPP_TIMEZONE})`);
    // 1. Every hour: Appointment reminders (24h and 2h relative window checks)
    createGuardedJob('Appointment Reminders (24h/2h)', '0 * * * *', async () => {
        const result = await whatsapp_service_1.whatsappService.processScheduledReminders();
        logger_1.logger.info('[WhatsApp Scheduler] Appointment reminders processed', {
            totalScheduled: result.processedCount,
            reminders24hSent: result.reminders24hSent,
            reminders2hSent: result.reminders2hSent,
            skipped: result.skippedCount,
        });
    }, 'APPOINTMENT_REMINDERS');
    // 2. Daily Birthdays & Anniversaries (Default 09:00)
    createGuardedJob('Birthday & Anniversary Greetings', '0 9 * * *', async () => {
        const result = await whatsapp_service_1.whatsappService.processCelebrationReminders();
        logger_1.logger.info('[WhatsApp Scheduler] Celebrations processed', {
            clients: result.processedClients,
            birthdaysSent: result.birthdaysSent,
            anniversariesSent: result.anniversariesSent,
            skipped: result.skippedCount,
        });
    }, 'BIRTHDAY');
    // 3. Daily Rebooking Reminders for Inactive Clients (Default 10:00)
    createGuardedJob('Rebooking Inactive Clients', '0 10 * * *', async () => {
        const result = await whatsapp_service_1.whatsappService.processRebookingReminders();
        logger_1.logger.info('[WhatsApp Scheduler] Rebooking reminders processed', {
            processedCount: result.processedCount,
            sentCount: result.sentCount,
            skippedCount: result.skippedCount,
        });
    }, 'REBOOKING');
    // 4. Daily Close Boss Summary (Default 19:30)
    createGuardedJob('Daily Close Boss Summary', '30 19 * * *', async () => {
        const todayStr = new Date().toISOString().split('T')[0];
        const systemAuthUser = { id: 'system', role: 'MANAGER', email: 'system@omegaspa.com' };
        const bossPhone = whatsapp_service_1.whatsappService.getBossPhoneNumber();
        const result = await whatsapp_service_1.whatsappService.triggerDailyCloseBoss({ businessDate: todayStr, recipientPhone: bossPhone }, systemAuthUser);
        logger_1.logger.info('[WhatsApp Scheduler] Daily close summary dispatched to Boss', {
            bossPhone,
            alreadySent: result.alreadySent,
            logId: result.log?.id,
        });
    }, 'DAILY_CLOSE_BOSS');
    // 5. Daily 00:00 (Midnight): Auto-purge WhatsApp message logs
    createGuardedJob('Auto-Purge Old WhatsApp Logs', '0 0 * * *', async () => {
        const retentionDays = whatsapp_service_1.whatsappService.getRetentionDays();
        const result = await whatsapp_service_1.whatsappService.purgeOldMessageLogs(retentionDays);
        logger_1.logger.info('[WhatsApp Scheduler] Daily auto-purge of old WhatsApp message logs completed', {
            retentionDays,
            deletedCount: result.deletedCount,
            cutoffDate: result.cutoffDate.toISOString(),
        });
    }, 'PURGE_LOGS');
    // 6. Daily 09:00 (Africa/Douala): Holiday & Occasion Greetings Dispatch
    createGuardedJob('Holiday & Occasion Greetings', '0 9 * * *', async () => {
        try {
            const now = new Date();
            const doualaStr = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Africa/Douala',
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
            }).format(now);
            const year = parseInt(doualaStr.split('-')[0], 10);
            const todaysHolidays = holiday_service_1.holidayService.getHolidaysForDate(doualaStr);
            if (todaysHolidays.length === 0) {
                logger_1.logger.info(`[WhatsApp Scheduler] No active holidays found for today (${doualaStr})`);
                return;
            }
            for (const h of todaysHolidays) {
                logger_1.logger.info(`[WhatsApp Scheduler] Dispatching greetings for holiday: ${h.name} (${h.code})`);
                const dispatchRes = await holiday_service_1.holidayService.dispatchHolidayGreetings(h.code, year);
                logger_1.logger.info(`[WhatsApp Scheduler] Completed holiday dispatch for ${h.name}:`, dispatchRes);
            }
        }
        catch (err) {
            logger_1.logger.error('[WhatsApp Scheduler] Error during holiday greetings dispatch:', err);
        }
    }, 'HOLIDAY_GREETINGS');
    // Asynchronously load and apply any saved custom timings from the database
    (async () => {
        try {
            const customSettings = await database_1.default.whatsAppAutomation.findMany({
                where: { timing: { not: null } },
            });
            for (const auto of customSettings) {
                if (auto.timing && auto.timing.trim()) {
                    rescheduleWhatsAppJob(auto.type, auto.timing.trim());
                }
            }
        }
        catch (err) {
            logger_1.logger.warn('[WhatsApp Scheduler] Note: Could not query custom timings from DB on startup:', err?.message || err);
        }
    })();
    logger_1.logger.info(`✓ [WhatsApp Scheduler] WhatsApp automation cron jobs registered and running (${WHATSAPP_TIMEZONE})`);
}
/**
 * Stops all WhatsApp scheduled cron tasks
 */
function stopWhatsAppScheduler() {
    for (const job of scheduledJobs) {
        job.task.stop();
        logger_1.logger.info(`[WhatsApp Scheduler] Stopped: ${job.name}`);
    }
    scheduledJobs.length = 0;
    logger_1.logger.info('[WhatsApp Scheduler] All WhatsApp automation cron jobs stopped.');
}
//# sourceMappingURL=whatsapp.scheduler.js.map