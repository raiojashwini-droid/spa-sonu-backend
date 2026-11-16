"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocialMediaScheduler = initSocialMediaScheduler;
const node_cron_1 = __importDefault(require("node-cron"));
const database_1 = __importDefault(require("../../config/database"));
const logger_1 = require("../../utils/logger");
const social_service_1 = require("./social.service");
/**
 * Social Media Background Scheduler
 *
 * Runs every minute (* * * * *).
 * Queries database for scheduled posts that are due (scheduledFor <= now and status === 'SCHEDULED').
 * Executes automatic publishing via Meta Graph API & TikTok.
 */
function initSocialMediaScheduler() {
    logger_1.logger.info('Initializing Social Media Post Scheduler (running every minute)...');
    const db = database_1.default;
    node_cron_1.default.schedule('* * * * *', async () => {
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
            if (duePosts.length === 0)
                return;
            logger_1.logger.info(`[Social Scheduler] Found ${duePosts.length} scheduled post(s) ready to publish.`);
            for (const post of duePosts) {
                try {
                    logger_1.logger.info(`[Social Scheduler] Publishing scheduled post ${post.id}...`);
                    await social_service_1.socialService.executePublish(post.id);
                }
                catch (err) {
                    logger_1.logger.error(`[Social Scheduler] Error publishing post ${post.id}:`, {
                        error: err?.message || String(err),
                    });
                }
            }
        }
        catch (err) {
            logger_1.logger.error('[Social Scheduler] Error checking scheduled posts:', {
                error: err?.message || String(err),
            });
        }
    });
}
//# sourceMappingURL=social.scheduler.js.map