import cron from 'node-cron';
import prisma from '../../config/database';
import { logger } from '../../utils/logger';
import { socialService } from './social.service';

/**
 * Social Media Background Scheduler
 *
 * Runs every minute (* * * * *).
 * Queries database for scheduled posts that are due (scheduledFor <= now and status === 'SCHEDULED').
 * Executes automatic publishing via Meta Graph API & TikTok.
 */
export function initSocialMediaScheduler() {
  logger.info('Initializing Social Media Post Scheduler (running every minute)...');

  const db: any = prisma;

  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();
      const duePosts = await db.socialPost.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledFor: {
            lte: now,
          },
        },
      });

      if (duePosts.length === 0) return;

      logger.info(`[Social Scheduler] Found ${duePosts.length} scheduled post(s) ready to publish.`);

      for (const post of duePosts) {
        try {
          logger.info(`[Social Scheduler] Publishing scheduled post ${post.id}...`);
          await socialService.executePublish(post.id);
        } catch (err: any) {
          logger.error(`[Social Scheduler] Error publishing post ${post.id}:`, {
            error: err?.message || String(err),
          });
        }
      }
    } catch (err: any) {
      logger.error('[Social Scheduler] Error checking scheduled posts:', {
        error: err?.message || String(err),
      });
    }
  });
}
