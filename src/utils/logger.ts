/**
 * OMEGA SPA POS — Logger Utility
 *
 * Simple structured logging utility.
 * Can be replaced with Winston or Pino in production if needed.
 */

export const logger = {
  info: (message: string, meta?: Record<string, unknown>): void => {
    console.log(`[INFO] ${new Date().toISOString()} — ${message}`, meta ? JSON.stringify(meta) : '');
  },

  warn: (message: string, meta?: Record<string, unknown>): void => {
    console.warn(`[WARN] ${new Date().toISOString()} — ${message}`, meta ? JSON.stringify(meta) : '');
  },

  error: (message: string, meta?: Record<string, unknown>): void => {
    console.error(`[ERROR] ${new Date().toISOString()} — ${message}`, meta ? JSON.stringify(meta) : '');
  },

  debug: (message: string, meta?: Record<string, unknown>): void => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} — ${message}`, meta ? JSON.stringify(meta) : '');
    }
  },
};
