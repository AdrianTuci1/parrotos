import rateLimit from 'express-rate-limit';
import { config } from '../config/index.js';

/**
 * Rate limiting middleware for production.
 * Prevents abuse and DDoS attacks.
 */

// General API rate limit — 100 requests per 15 minutes per IP
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests',
    retryAfter: '15 minutes',
  },
  skip: (req) => {
    // Skip health checks and internal requests
    return req.path === '/health' || req.path.startsWith('/health/');
  },
});

// Strict limit for auth endpoints — 5 attempts per 15 minutes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts',
    retryAfter: '15 minutes',
  },
});

// Medium limit for data endpoints — 50 requests per minute
export const dataLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many data requests',
    retryAfter: '1 minute',
  },
});

// Webhook limit — 1000 requests per minute (for external services)
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many webhook requests',
    retryAfter: '1 minute',
  },
});
