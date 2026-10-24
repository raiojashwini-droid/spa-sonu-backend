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

import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../../utils/logger';
import { whatsappService } from './whatsapp.service';
import prisma from '../../config/database';

const WHATSAPP_TIMEZONE = 'Africa/Douala';

interface SchedulerState {
  task: ScheduledTask;
  name: string;
  cronExpression: string;
  isRunning: boolean;
  handler: () => Promise<void>;
}

const scheduledJobs: SchedulerState[] = [];
const jobRegistry: Record<string, SchedulerState> = {};

/**
 * Converts "HH:mm" (e.g. "10:00", "19:30") into a cron expression ("0 10 * * *", "30 19 * * *")
 */
export function timeStringToCron(timeStr: string, defaultHour = 10, defaultMinute = 0): string {
  if (!timeStr) return `${defaultMinute} ${defaultHour} * * *`;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return `${defaultMinute} ${defaultHour} * * *`;
  const hour = Math.min(23, Math.max(0, parseInt(match[1], 10)));
  const minute = Math.min(59, Math.max(0, parseInt(match[2], 10)));
  return `${minute} ${hour} * * *`;
}

/**
 * Creates a guarded cron job that prevents duplicate concurrent runs
 */
function createGuardedJob(
  name: string,
  cronExpression: string,
  handler: () => Promise<void>,
  registryKey?: string
): SchedulerState {
  const state: SchedulerState = {
    task: null as any,
    name,
    cronExpression,
    isRunning: false,
    handler,
  };

  state.task = cron.schedule(
    cronExpression,
    async () => {
      if (state.isRunning) {
        logger.warn(`[WhatsApp Scheduler] ${name}: Previous run still in progress. Skipping.`);
        return;
      }

      state.isRunning = true;
      try {
        logger.info(`[WhatsApp Scheduler] ${name}: Starting...`);
        await handler();
        logger.info(`[WhatsApp Scheduler] ${name}: Completed successfully.`);
      } catch (err: any) {
        logger.error(`[WhatsApp Scheduler] ${name}: Error during execution`, {
          error: err?.message || String(err),
        });
      } finally {
        state.isRunning = false;
      }
    },
    {
      timezone: WHATSAPP_TIMEZONE,
    }
  );

  scheduledJobs.push(state);
  if (registryKey) {
    jobRegistry[registryKey.toUpperCase()] = state;
  }

  return state;
}

/**
 * Dynamically reschedules an automation job to a new time without server restart.
 */
export function rescheduleWhatsAppJob(type: string, newTiming: string): boolean {
  const key = type.toUpperCase().replace(/-/g, '_');
  const job = jobRegistry[key];
  if (!job) {
    logger.info(`[WhatsApp Scheduler] Job ${key} not registered for dynamic daily rescheduling (event-driven or relative).`);
    return false;
  }

  const newCron = timeStringToCron(newTiming);
  logger.info(`[WhatsApp Scheduler] Rescheduling ${job.name} (${key}) to ${newTiming} -> cron "${newCron}" (${WHATSAPP_TIMEZONE})`);

  try {
    job.task.stop();
  } catch (err: any) {
    logger.warn(`[WhatsApp Scheduler] Error stopping task ${job.name}:`, err?.message || err);
  }

  job.cronExpression = newCron;
  job.task = cron.schedule(
    newCron,
    async () => {
      if (job.isRunning) {
        logger.warn(`[WhatsApp Scheduler] ${job.name}: Previous run still in progress. Skipping.`);
        return;
      }
      job.isRunning = true;
      try {
        logger.info(`[WhatsApp Scheduler] ${job.name}: Starting (rescheduled time ${newTiming})...`);
        await job.handler();
        logger.info(`[WhatsApp Scheduler] ${job.name}: Completed successfully.`);
      } catch (err: any) {
        logger.error(`[WhatsApp Scheduler] ${job.name}: Error during execution`, {
          error: err?.message || String(err),
        });
      } finally {
        job.isRunning = false;
      }
    },
    { timezone: WHATSAPP_TIMEZONE }
  );

  return true;
}

/**
 * Initializes all WhatsApp automation cron jobs
 */
export function initWhatsAppScheduler(): void {
  if (scheduledJobs.length > 0) {
    logger.info('[WhatsApp Scheduler] WhatsApp scheduler already active.');
    return;
  }

  logger.info(`[WhatsApp Scheduler] Initializing WhatsApp automation cron jobs (timezone: ${WHATSAPP_TIMEZONE})`);

  // 1. Every hour: Appointment reminders (24h and 2h relative window checks)
  createGuardedJob(
    'Appointment Reminders (24h/2h)',
    '0 * * * *',
    async () => {
      const result = await whatsappService.processScheduledReminders();
      logger.info('[WhatsApp Scheduler] Appointment reminders processed', {
        totalScheduled: result.processedCount,
        reminders24hSent: result.reminders24hSent,
        reminders2hSent: result.reminders2hSent,
        skipped: result.skippedCount,
      });
    },
    'APPOINTMENT_REMINDERS'
  );

  // 2. Daily Birthdays & Anniversaries (Default 09:00)
  createGuardedJob(
    'Birthday & Anniversary Greetings',
    '0 9 * * *',
    async () => {
      const result = await whatsappService.processCelebrationReminders();
      logger.info('[WhatsApp Scheduler] Celebrations processed', {
        clients: result.processedClients,
        birthdaysSent: result.birthdaysSent,
        anniversariesSent: result.anniversariesSent,
        skipped: result.skippedCount,
      });
    },
    'BIRTHDAY'
  );

  // 3. Daily Rebooking Reminders for Inactive Clients (Default 10:00)
  createGuardedJob(
    'Rebooking Inactive Clients',
    '0 10 * * *',
    async () => {
      const result = await whatsappService.processRebookingReminders();
      logger.info('[WhatsApp Scheduler] Rebooking reminders processed', {
        processedCount: result.processedCount,
        sentCount: result.sentCount,
        skippedCount: result.skippedCount,
      });
    },
    'REBOOKING'
  );

  // 4. Daily Close Boss Summary (Default 19:30)
  createGuardedJob(
    'Daily Close Boss Summary',
    '30 19 * * *',
    async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const systemAuthUser = { id: 'system', role: 'MANAGER', email: 'system@omegaspa.com' };
      const bossPhone = whatsappService.getBossPhoneNumber();
      const result = await whatsappService.triggerDailyCloseBoss(
        { businessDate: todayStr, recipientPhone: bossPhone },
        systemAuthUser
      );
      logger.info('[WhatsApp Scheduler] Daily close summary dispatched to Boss', {
        bossPhone,
        alreadySent: result.alreadySent,
        logId: result.log?.id,
      });
    },
    'DAILY_CLOSE_BOSS'
  );

  // 5. Daily 00:00 (Midnight): Auto-purge WhatsApp message logs
  createGuardedJob(
    'Auto-Purge Old WhatsApp Logs',
    '0 0 * * *',
    async () => {
      const retentionDays = whatsappService.getRetentionDays();
      const result = await whatsappService.purgeOldMessageLogs(retentionDays);
      logger.info('[WhatsApp Scheduler] Daily auto-purge of old WhatsApp message logs completed', {
        retentionDays,
        deletedCount: result.deletedCount,
        cutoffDate: result.cutoffDate.toISOString(),
      });
    },
    'PURGE_LOGS'
  );

  // Asynchronously load and apply any saved custom timings from the database
  (async () => {
    try {
      const customSettings = await prisma.whatsAppAutomation.findMany({
        where: { timing: { not: null } },
      });
      for (const auto of customSettings) {
        if (auto.timing && auto.timing.trim()) {
          rescheduleWhatsAppJob(auto.type, auto.timing.trim());
        }
      }
    } catch (err: any) {
      logger.warn('[WhatsApp Scheduler] Note: Could not query custom timings from DB on startup:', err?.message || err);
    }
  })();

  logger.info(`✓ [WhatsApp Scheduler] WhatsApp automation cron jobs registered and running (${WHATSAPP_TIMEZONE})`);
}

/**
 * Stops all WhatsApp scheduled cron tasks
 */
export function stopWhatsAppScheduler(): void {
  for (const job of scheduledJobs) {
    job.task.stop();
    logger.info(`[WhatsApp Scheduler] Stopped: ${job.name}`);
  }
  scheduledJobs.length = 0;
  logger.info('[WhatsApp Scheduler] All WhatsApp automation cron jobs stopped.');
}
