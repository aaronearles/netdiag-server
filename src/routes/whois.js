const express = require('express');
const router = express.Router();
const { validateTargetMiddleware } = require('../middleware/validator');
const { whoisLimiter } = require('../middleware/rateLimiter');
const whoisClient = require('../services/whoisClient');
const parser = require('../services/parser');
const cache = require('../services/cache');
const logger = require('../utils/logger');

router.get('/whois/:target', whoisLimiter, validateTargetMiddleware, async (req, res) => {
  const target = req.validatedTarget;
  const startTime = Date.now();
  let fromCache = false;

  try {
    let cachedData = cache.get('whois', target);

    if (cachedData) {
      fromCache = true;
      const responseTime = Date.now() - startTime;
      logger.logRequest(target, req.ip, true, responseTime);

      const fieldsParam = req.query.fields;
      if (fieldsParam) {
        const fields = fieldsParam.split(',').map(f => f.trim());
        const filtered = parser.filterFields(cachedData.parsed, fields);

        return res.json({
          success: true,
          target: target,
          raw: cachedData.raw,
          parsed: filtered,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }

      return res.json({
        success: true,
        target: target,
        raw: cachedData.raw,
        parsed: cachedData.parsed,
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    const result = await whoisClient.queryWhois(target);

    if (!result.success) {
      const responseTime = Date.now() - startTime;
      logger.error('Whois query failed', {
        target,
        ip: req.ip,
        error: result.error,
        responseTime
      });

      return res.status(500).json({
        success: false,
        error: 'Whois query failed',
        details: result.stderr || result.error,
        timestamp: new Date().toISOString()
      });
    }

    const rawOutput = result.stdout;
    const parsedData = parser.parseWhoisOutput(rawOutput);

    const dataToCache = {
      raw: rawOutput,
      parsed: parsedData
    };

    cache.set('whois', target, dataToCache);

    const responseTime = Date.now() - startTime;
    logger.logRequest(target, req.ip, false, responseTime);

    const fieldsParam = req.query.fields;
    if (fieldsParam) {
      const fields = fieldsParam.split(',').map(f => f.trim());
      const filtered = parser.filterFields(parsedData, fields);

      return res.json({
        success: true,
        target: target,
        raw: rawOutput,
        parsed: filtered,
        cached: false,
        timestamp: new Date().toISOString()
      });
    }

    return res.json({
      success: true,
      target: target,
      raw: rawOutput,
      parsed: parsedData,
      cached: false,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Unexpected error in whois route', {
      target,
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
