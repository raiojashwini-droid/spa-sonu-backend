/**
 * Rate Limiting Middleware — P0 Security Fix
 *
 * Three tiers:
 * 1. loginLimiter:   Strict — 5 attempts per 15 minutes per IP (brute-force protection)
 * 2. authLimiter:    Moderate — 20 requests per 15 minutes per IP (sensitive auth endpoints)
 * 3. apiLimiter:     General — 100 requests per 1 minute per IP (general API protection)
 */
export declare const loginLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
//# sourceMappingURL=rateLimiter.d.ts.map