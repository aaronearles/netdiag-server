const express = require('express');
const router = express.Router();
const { validateTargetMiddleware, validateTarget } = require('../middleware/validator');
const { whoisLimiter } = require('../middleware/rateLimiter');
const whoisClient = require('../services/whoisClient');
const parser = require('../services/parser');
const cache = require('../services/cache');
const logger = require('../utils/logger');

// Batch whois endpoint
router.post('/whois/batch', whoisLimiter, express.json(), async (req, res) => {
  const startTime = Date.now();

  try {
    const { targets, fields } = req.body;

    // Validate request body
    if (!targets || !Array.isArray(targets) || targets.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Request body must include a "targets" array with at least one target',
        timestamp: new Date().toISOString()
      });
    }

    // Limit batch size
    if (targets.length > 50) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 50 targets per batch request',
        timestamp: new Date().toISOString()
      });
    }

    // Process each target
    const results = [];

    for (const target of targets) {
      const targetStr = String(target).trim();

      // Validate target format
      const validation = validateTarget(targetStr);
      if (!validation.valid) {
        results.push({
          success: false,
          target: targetStr,
          error: validation.error || 'Invalid target format'
        });
        continue;
      }

      try {
        // Check cache first
        let cachedData = cache.get('whois', targetStr);
        let parsedData;
        let rawOutput;
        let fromCache = false;

        if (cachedData) {
          parsedData = cachedData.parsed;
          rawOutput = cachedData.raw;
          fromCache = true;
        } else {
          // Query whois
          const result = await whoisClient.queryWhois(targetStr);

          if (!result.success) {
            results.push({
              success: false,
              target: targetStr,
              error: result.error || 'Whois query failed'
            });
            continue;
          }

          rawOutput = result.stdout;
          parsedData = parser.parseWhoisOutput(rawOutput);

          // Cache the result
          cache.set('whois', targetStr, {
            raw: rawOutput,
            parsed: parsedData
          });
        }

        // Filter fields if requested
        let outputData = parsedData;
        if (fields && Array.isArray(fields) && fields.length > 0) {
          outputData = parser.filterFields(parsedData, fields);
        }

        // Add successful result
        results.push({
          success: true,
          target: targetStr,
          parsed: outputData,
          cached: fromCache
        });

      } catch (error) {
        logger.error('Batch whois error for target', {
          target: targetStr,
          error: error.message
        });

        results.push({
          success: false,
          target: targetStr,
          error: 'Internal error processing target'
        });
      }
    }

    const responseTime = Date.now() - startTime;
    logger.info('Batch whois request completed', {
      ip: req.ip,
      targetCount: targets.length,
      successCount: results.filter(r => r.success).length,
      responseTime
    });

    return res.json({
      success: true,
      results: results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    const responseTime = Date.now() - startTime;
    logger.error('Batch whois request failed', {
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
