"use strict";
/**
 * OMEGA SPA POS — Logger Utility
 *
 * Simple structured logging utility.
 * Can be replaced with Winston or Pino in production if needed.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.logger = {
    info: (message, meta) => {
        console.log(`[INFO] ${new Date().toISOString()} — ${message}`, meta ? JSON.stringify(meta) : '');
    },
    warn: (message, meta) => {
        console.warn(`[WARN] ${new Date().toISOString()} — ${message}`, meta ? JSON.stringify(meta) : '');
    },
    error: (message, meta) => {
        console.error(`[ERROR] ${new Date().toISOString()} — ${message}`, meta ? JSON.stringify(meta) : '');
    },
    debug: (message, meta) => {
        if (process.env.NODE_ENV === 'development') {
            console.debug(`[DEBUG] ${new Date().toISOString()} — ${message}`, meta ? JSON.stringify(meta) : '');
        }
    },
};
//# sourceMappingURL=logger.js.map