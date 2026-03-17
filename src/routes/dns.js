const express = require('express');
const router = express.Router();
const { validateHostname, validateDNSRecordType } = require('../middleware/validator');
const { dnsLimiter } = require('../middleware/rateLimiter');
const dnsClient = require('../services/dnsClient');
const cache = require('../services/cache');
const logger = require('../utils/logger');

router.get('/dns/:hostname', dnsLimiter, async (req, res) => {
  const hostname = req.params.hostname;
  const type = (req.query.type || 'A').toUpperCase();
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

  if (!validateDNSRecordType(type)) {
    logger.warn('Invalid DNS record type', {
      hostname,
      type,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: 'Invalid DNS record type. Valid types: A, AAAA, MX, TXT, NS, CNAME, SOA, PTR, ANY',
      timestamp: new Date().toISOString()
    });
  }

  const cacheKey = `${hostname}:${type}`;

  try {
    let cachedData = cache.get('dns', cacheKey);

    if (cachedData) {
      const responseTime = Date.now() - startTime;
      logger.info('DNS request', { hostname, type, ip: req.ip, cached: true, responseTime });

      return res.json({
        success: true,
        hostname,
        type: cachedData.queryType || type,
        records: cachedData.records,
        is_reverse_lookup: cachedData.isReverseLookup || false,
        query_time_ms: responseTime,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const result = await dnsClient.queryDNS(hostname, type);

    if (!result.success) {
      const responseTime = Date.now() - startTime;
      logger.error('DNS query failed', {
        hostname,
        type,
        ip: req.ip,
        error: result.error,
        responseTime
      });

      return res.status(500).json({
        success: false,
        error: result.error || 'DNS query failed',
        timestamp: new Date().toISOString()
      });
    }

    const dataToCache = {
      records: result.records,
      queryType: result.queryType,
      isReverseLookup: result.isReverseLookup
    };

    cache.set('dns', cacheKey, dataToCache);

    const responseTime = Date.now() - startTime;
    logger.info('DNS request', { hostname, type, ip: req.ip, cached: false, responseTime, isReverseLookup: result.isReverseLookup });

    return res.json({
      success: true,
      hostname,
      type: result.queryType,
      records: result.records,
      is_reverse_lookup: result.isReverseLookup || false,
      query_time_ms: responseTime,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Unexpected error in DNS route', {
      hostname,
      type,
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
