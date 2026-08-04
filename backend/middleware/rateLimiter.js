const rateLimit = require('express-rate-limit');

const isDev = process.env.NODE_ENV !== 'production';
const rateLimitDisabled =
  process.env.DISABLE_RATE_LIMIT === 'true' || isDev;

/** No-op when rate limiting is off (local dev). */
const noopLimiter = (req, res, next) => next();

/**
 * General API rate limiter — SPA + chat apps need a higher ceiling.
 * Disabled in development so admin/member/client panels work without 429 errors.
 */
const apiLimiter = rateLimitDisabled
  ? noopLimiter
  : rateLimit({
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000,
      max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 2000,
      message: {
        message: 'Too many requests from this IP, please try again later.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.method === 'OPTIONS',
    });

/**
 * Auth endpoints — stricter in production only.
 */
const authLimiter = rateLimitDisabled
  ? noopLimiter
  : rateLimit({
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 50,
      message: {
        message: 'Too many login attempts. Please try again after 15 minutes.',
      },
      standardHeaders: true,
      legacyHeaders: false,
      skip: (req) => req.method === 'OPTIONS',
    });

module.exports = { apiLimiter, authLimiter, rateLimitDisabled };
