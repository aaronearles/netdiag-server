const express = require('express');
const router = express.Router();
const { validateHostname, validatePort } = require('../middleware/validator');
const { sslLimiter } = require('../middleware/rateLimiter');
const sslClient = require('../services/sslClient');
const cache = require('../services/cache');
const logger = require('../utils/logger');

router.get('/ssl/:hostname', sslLimiter, async (req, res) => {
  const hostname = req.params.hostname;
  const port = parseInt(req.query.port || '443', 10);
  const startTime = Date.now();

  if (!validateHostname(hostname)) {
    logger.warn('Invalid hostname validation', {
      hostname,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid hostname format',
      timestamp: new Date().toISOString()
    });
  }

  if (!validatePort(port)) {
    logger.warn('Invalid port validation', {
      hostname,
      port,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid port number. Must be between 1 and 65535',
      timestamp: new Date().toISOString()
    });
  }

  const cacheKey = `${hostname}:${port}`;

  try {
    let cachedData = cache.get('ssl', cacheKey);

    if (cachedData) {
      const responseTime = Date.now() - startTime;
      logger.info('SSL certificate request', { hostname, port, ip: req.ip, cached: true, responseTime });

      const warnings = [];
      if (cachedData.certificate.validity.expired) {
        warnings.push('Certificate has expired');
      } else if (cachedData.certificate.validity.days_remaining < 30) {
        warnings.push(`Certificate expires in ${cachedData.certificate.validity.days_remaining} days`);
      }

      return res.json({
        success: true,
        hostname,
        port,
        certificate: cachedData.certificate,
        warnings: warnings.length > 0 ? warnings : undefined,
        chain_valid: !cachedData.certificate.validity.expired,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const result = await sslClient.getCertificateInfo(hostname, port);

    if (!result.success) {
      const responseTime = Date.now() - startTime;
      logger.error('SSL certificate fetch failed', {
        hostname,
        port,
        ip: req.ip,
        error: result.error,
        responseTime
      });

      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to retrieve SSL certificate',
        timestamp: new Date().toISOString()
      });
    }

    const dataToCache = {
      certificate: result.certificate
    };

    cache.set('ssl', cacheKey, dataToCache);

    const responseTime = Date.now() - startTime;
    logger.info('SSL certificate request', { hostname, port, ip: req.ip, cached: false, responseTime });

    const warnings = [];
    if (result.certificate.validity.expired) {
      warnings.push('Certificate has expired');
    } else if (result.certificate.validity.days_remaining < 30) {
      warnings.push(`Certificate expires in ${result.certificate.validity.days_remaining} days`);
    }

    if (result.certificate.self_signed) {
      warnings.push('Certificate is self-signed');
    }

    return res.json({
      success: true,
      hostname,
      port,
      certificate: result.certificate,
      warnings: warnings.length > 0 ? warnings : undefined,
      chain_valid: !result.certificate.validity.expired && !result.certificate.self_signed,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Unexpected error in SSL route', {
      hostname,
      port,
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
