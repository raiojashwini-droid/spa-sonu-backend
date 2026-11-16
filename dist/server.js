"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Configure Douala, Cameroon (UTC+1) timezone across the entire Node.js runtime
process.env.TZ = 'Africa/Douala';
const app_1 = __importDefault(require("./app"));
const env_1 = require("./config/env");
const constants_1 = require("./config/constants");
const logger_1 = require("./utils/logger");
const mediaCleanup_scheduler_1 = require("./modules/media/mediaCleanup.scheduler");
const whatsapp_scheduler_1 = require("./modules/whatsapp/whatsapp.scheduler");
const social_scheduler_1 = require("./modules/social/social.scheduler");
const PORT = env_1.env.PORT;
app_1.default.listen(PORT, () => {
    logger_1.logger.info(`${constants_1.APP_NAME} Backend running on port ${PORT}`);
    logger_1.logger.info(`Timezone: ${constants_1.APP_TIMEZONE} (${process.env.TZ})`);
    logger_1.logger.info(`Environment: ${env_1.env.NODE_ENV}`);
    logger_1.logger.info(`Health check: http://localhost:${PORT}/`);
    logger_1.logger.info(`Cloudinary Cloud: ${env_1.env.CLOUDINARY_CLOUD_NAME}`);
    // Automatically initialize media retention auto-cleanup scheduler (00:00 midnight Africa/Douala)
    try {
        (0, mediaCleanup_scheduler_1.initMediaCleanupScheduler)();
    }
    catch (err) {
        logger_1.logger.error('Failed to initialize media cleanup scheduler on startup:', {
            error: err?.message || String(err),
        });
    }
    // Automatically initialize WhatsApp automation scheduler (reminders, celebrations, rebooking, daily close)
    try {
        (0, whatsapp_scheduler_1.initWhatsAppScheduler)();
    }
    catch (err) {
        logger_1.logger.error('Failed to initialize WhatsApp automation scheduler on startup:', {
            error: err?.message || String(err),
        });
    }
    // Automatically initialize Social Media scheduler (auto-publishes scheduled posts)
    try {
        (0, social_scheduler_1.initSocialMediaScheduler)();
    }
    catch (err) {
        logger_1.logger.error('Failed to initialize Social Media scheduler on startup:', {
            error: err?.message || String(err),
        });
    }
});
//# sourceMappingURL=server.js.map