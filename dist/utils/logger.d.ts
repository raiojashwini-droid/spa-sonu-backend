/**
 * OMEGA SPA POS — Logger Utility
 *
 * Simple structured logging utility.
 * Can be replaced with Winston or Pino in production if needed.
 */
export declare const logger: {
    info: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
    debug: (message: string, meta?: Record<string, unknown>) => void;
};
//# sourceMappingURL=logger.d.ts.map