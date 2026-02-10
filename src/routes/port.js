const express = require('express');
const router = express.Router();
const { validateHostname, validatePort } = require('../middleware/validator');
const { portLimiter } = require('../middleware/rateLimiter');
const portClient = require('../services/portClient');
const cache = require('../services/cache');
const logger = require('../utils/logger');

router.get('/port/:host/:port', portLimiter, async (req, res) => {
  const host = req.params.host;
  const port = req.params.port;
  const startTime = Date.now();

  if (!validateHostname(host)) {
    logger.warn('Invalid host validation', {
      host,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid host format',
      timestamp: new Date().toISOString()
    });
  }

  if (!validatePort(port)) {
    logger.warn('Invalid port validation', {
      host,
      port,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid port number. Must be between 1 and 65535',
      timestamp: new Date().toISOString()
    });
  }

  const portNum = parseInt(port, 10);
  const cacheKey = `${host}:${portNum}`;

  try {
    let cachedData = cache.get('port', cacheKey);

    if (cachedData) {
      const responseTime = Date.now() - startTime;
      logger.info('Port check request', { host, port: portNum, ip: req.ip, cached: true, responseTime });

      return res.json({
        success: true,
        host,
        resolved_ip: cachedData.resolved_ip,
        port: portNum,
        open: cachedData.open,
        response_time_ms: cachedData.response_time_ms,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const result = await portClient.checkPort(host, portNum);

    if (!result.success) {
      const responseTime = Date.now() - startTime;
      logger.error('Port check failed', {
        host,
        port: portNum,
        ip: req.ip,
        error: result.error,
        responseTime
      });

      return res.status(500).json({
        success: false,
        error: result.error || 'Port check failed',
        timestamp: new Date().toISOString()
      });
    }

    const dataToCache = {
      resolved_ip: result.resolved_ip,
      open: result.open,
      response_time_ms: result.response_time_ms
    };

    cache.set('port', cacheKey, dataToCache);

    const responseTime = Date.now() - startTime;
    logger.info('Port check request', { host, port: portNum, open: result.open, ip: req.ip, cached: false, responseTime });

    return res.json({
      success: true,
      host,
      resolved_ip: result.resolved_ip,
      port: portNum,
      open: result.open,
      response_time_ms: result.response_time_ms,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Unexpected error in port check route', {
      host,
      port: portNum,
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
