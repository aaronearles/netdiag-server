const net = require('net');
const { lookup } = require('dns').promises;
const logger = require('../utils/logger');

async function checkPort(host, port, timeout = 5000) {
  return new Promise(async (resolve) => {
    const startTime = Date.now();
    let resolved_ip = host;

    try {
      const lookupResult = await lookup(host);
      resolved_ip = lookupResult.address;
    } catch (error) {
      logger.debug(`DNS lookup failed for ${host}`, { error: error.message });
    }

    const socket = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        socket.destroy();
      }
    };

    socket.setTimeout(timeout);

    socket.on('connect', () => {
      const responseTime = Date.now() - startTime;
      cleanup();
      resolve({
        success: true,
        open: true,
        resolved_ip,
        response_time_ms: Math.round(responseTime * 10) / 10
      });
    });

    socket.on('timeout', () => {
      const responseTime = Date.now() - startTime;
      cleanup();
      resolve({
        success: true,
        open: false,
        resolved_ip,
        response_time_ms: Math.round(responseTime * 10) / 10,
        reason: 'Connection timeout'
      });
    });

    socket.on('error', (err) => {
      const responseTime = Date.now() - startTime;
      cleanup();
      resolve({
        success: true,
        open: false,
        resolved_ip,
        response_time_ms: Math.round(responseTime * 10) / 10,
        reason: err.code || 'Connection refused'
      });
    });

    try {
      socket.connect(port, host);
    } catch (error) {
      const responseTime = Date.now() - startTime;
      cleanup();
      resolve({
        success: false,
        error: error.message,
        response_time_ms: Math.round(responseTime * 10) / 10
      });
    }
  });
}

module.exports = { checkPort };
