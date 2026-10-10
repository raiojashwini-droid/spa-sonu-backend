// Configure Douala, Cameroon (UTC+1) timezone across the entire Node.js runtime
process.env.TZ = 'Africa/Douala';

import app from './app';
import { env } from './config/env';
import { APP_NAME, APP_TIMEZONE } from './config/constants';
import { logger } from './utils/logger';
import { initMediaCleanupScheduler } from './modules/media/mediaCleanup.scheduler';
import { initWhatsAppScheduler } from './modules/whatsapp/whatsapp.scheduler';
import { initSocialMediaScheduler } from './modules/social/social.scheduler';

const PORT = env.PORT;

app.listen(PORT, () => {
  logger.info(`${APP_NAME} Backend running on port ${PORT}`);
  logger.info(`Timezone: ${APP_TIMEZONE} (${process.env.TZ})`);
  logger.info(`Environment: ${env.NODE_ENV}`);
  logger.info(`Health check: http://localhost:${PORT}/`);
  logger.info(`Cloudinary Cloud: ${env.CLOUDINARY_CLOUD_NAME}`);

  // Automatically initialize media retention auto-cleanup scheduler (00:00 midnight Africa/Douala)
  try {
    initMediaCleanupScheduler();
  } catch (err: any) {
    logger.error('Failed to initialize media cleanup scheduler on startup:', {
      error: err?.message || String(err),
    });
  }

  // Automatically initialize WhatsApp automation scheduler (reminders, celebrations, rebooking, daily close)
  try {
    initWhatsAppScheduler();
  } catch (err: any) {
    logger.error('Failed to initialize WhatsApp automation scheduler on startup:', {
      error: err?.message || String(err),
    });
  }

  // Automatically initialize Social Media scheduler (auto-publishes scheduled posts)
  try {
    initSocialMediaScheduler();
  } catch (err: any) {
    logger.error('Failed to initialize Social Media scheduler on startup:', {
      error: err?.message || String(err),
    });
  }
});
