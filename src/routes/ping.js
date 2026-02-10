const express = require('express');
const router = express.Router();
const { validateHostname, validatePingCount } = require('../middleware/validator');
const { pingLimiter } = require('../middleware/rateLimiter');
const pingClient = require('../services/pingClient');
const cache = require('../services/cache');
const logger = require('../utils/logger');

router.get('/ping/:target', pingLimiter, async (req, res) => {
  const target = req.params.target;
  const count = parseInt(req.query.count || '4', 10);
  const startTime = Date.now();

  if (!validateHostname(target)) {
    logger.warn('Invalid target validation', {
      target,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid target format',
      timestamp: new Date().toISOString()
    });
  }

  if (!validatePingCount(count)) {
    logger.warn('Invalid ping count', {
      target,
      count,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid count. Must be between 1 and 10',
      timestamp: new Date().toISOString()
    });
  }

  const cacheKey = `${target}:${count}`;

  try {
    let cachedData = cache.get('ping', cacheKey);

    if (cachedData) {
      const responseTime = Date.now() - startTime;
      logger.info('Ping request', { target, count, ip: req.ip, cached: true, responseTime });

      return res.json({
        ...cachedData,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const result = await pingClient.pingHost(target, count);

    if (!result.success) {
      const responseTime = Date.now() - startTime;
      logger.error('Ping failed', {
        target,
        count,
        ip: req.ip,
        error: result.error,
        responseTime
      });

      return res.json({
        success: false,
        target: result.target,
        error: result.error || `${result.packet_loss_percent}% packet loss - host unreachable`,
        packets_sent: result.packets_sent,
        packets_received: result.packets_received,
        packet_loss_percent: result.packet_loss_percent,
        timestamp: new Date().toISOString()
      });
    }

    cache.set('ping', cacheKey, result);

    const responseTime = Date.now() - startTime;
    logger.info('Ping request', { target, count, packet_loss: result.packet_loss_percent, ip: req.ip, cached: false, responseTime });

    return res.json({
      ...result,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Unexpected error in ping route', {
      target,
      count,
      ip: req.ip,
      error: error.message,
      stack: error.stack,
      responseTime
    });

    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
