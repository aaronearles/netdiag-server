const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const rateLimitWindow = parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10);
const rateLimitMax = parseInt(process.env.RATE_LIMIT_MAX || '60', 10);

const limiter = rateLimit({
  windowMs: rateLimitWindow,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      timestamp: new Date().toISOString()
    });
  },
  skip: (req) => {
    const trustedIPs = process.env.RATE_LIMIT_WHITELIST
      ? process.env.RATE_LIMIT_WHITELIST.split(',').map(ip => ip.trim())
      : [];

    return trustedIPs.includes(req.ip);
  }
});

module.exports = limiter;
