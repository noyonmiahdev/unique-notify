/**
 * Rate Limiting Middleware
 * Protects against brute-force attacks on auth endpoints and API abuse
 */
const rateLimit = require('express-rate-limit');
const { logAudit } = require('../services/auditService');

// Admin Login Brute-force protection: 5 attempts per 15 minutes
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many admin authentication attempts. For security reasons, please try again in 15 minutes.'
  },
  handler: (req, res, next, options) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logAudit({
      userId: null,
      action: 'ADMIN_BRUTE_FORCE_BLOCKED',
      ip: String(ip),
      userAgent: req.headers['user-agent'],
      details: { emailAttempted: req.body?.email || 'unknown', endpoint: req.originalUrl }
    });
    res.status(429).json(options.message);
  }
});

// Client User Login & Register Limiter: 10 attempts per 15 minutes
const userAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please wait 15 minutes before trying again.'
  },
  handler: (req, res, next, options) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logAudit({
      userId: null,
      action: 'USER_AUTH_RATE_LIMIT_EXCEEDED',
      ip: String(ip),
      userAgent: req.headers['user-agent'],
      details: { emailAttempted: req.body?.email || 'unknown', endpoint: req.originalUrl }
    });
    res.status(429).json(options.message);
  }
});

// Public API Rate Limiter: 120 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'API rate limit exceeded. Standard limit is 120 requests per minute.'
  }
});

module.exports = {
  adminLoginLimiter,
  userAuthLimiter,
  apiLimiter
};
