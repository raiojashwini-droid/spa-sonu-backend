import rateLimit from 'express-rate-limit';

/**
 * Rate Limiting Middleware — P0 Security Fix
 *
 * Three tiers:
 * 1. loginLimiter:   Strict — 5 attempts per 15 minutes per IP (brute-force protection)
 * 2. authLimiter:    Moderate — 20 requests per 15 minutes per IP (sensitive auth endpoints)
 * 3. apiLimiter:     General — 100 requests per 1 minute per IP (general API protection)
 */

// Strict rate limit for login endpoint — prevents brute-force password attacks
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts per window
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  skipSuccessfulRequests: true, // Only count failed attempts (4xx/5xx)
});

// Moderate rate limit for sensitive auth-related endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per window
  message: {
    success: false,
    message: 'Too many requests to authentication endpoints. Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit — protects all routes from abuse/DoS
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: {
    success: false,
    message: 'Too many requests. Please slow down and try again in a minute.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
