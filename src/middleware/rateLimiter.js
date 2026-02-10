const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

const trustedIPs = process.env.RATE_LIMIT_WHITELIST
  ? process.env.RATE_LIMIT_WHITELIST.split(',').map(ip => ip.trim())
  : [];

function createLimiter(max, windowMs = 60000) {
  return rateLimit({
    windowMs,
    max,
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
    skip: (req) => trustedIPs.includes(req.ip)
  });
}

const fastLimiter = createLimiter(60);
const mediumLimiter = createLimiter(30);
const slowLimiter = createLimiter(20);

module.exports = {
  whoisLimiter: fastLimiter,
  dnsLimiter: fastLimiter,
  pingLimiter: mediumLimiter,
  portLimiter: fastLimiter,
  sslLimiter: mediumLimiter,

  defaultLimiter: fastLimiter
};
