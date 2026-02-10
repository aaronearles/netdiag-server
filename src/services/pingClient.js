const { execFile } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execFileAsync = promisify(execFile);

async function pingHost(target, count = 4) {
  count = Math.min(Math.max(parseInt(count) || 4, 1), 10);

  const timeout = (count * 2 + 5) * 1000;

  try {
    const startTime = Date.now();
    logger.debug(`Executing ping for: ${target} count ${count}`);

    const { stdout, stderr } = await execFileAsync('ping', ['-c', count.toString(), '-W', '2', target], {
      timeout,
      maxBuffer: 1024 * 1024
    });

    const duration = Date.now() - startTime;

    return parsePingOutput(stdout, target, count, duration);
  } catch (error) {
    if (error.stdout) {
      const duration = error.killed ? null : Date.now() - Date.now();
      return parsePingOutput(error.stdout, target, count, duration);
    }

    logger.error(`Ping failed for ${target}`, {
      error: error.message,
      code: error.code
    });

    return {
      success: false,
      target,
      error: error.message,
      packets_sent: count,
      packets_received: 0,
      packet_loss_percent: 100
    };
  }
}

function parsePingOutput(output, target, packetsSent, duration) {
  const lines = output.split('\n');

  let packetsReceived = 0;
  let packetLoss = 100;
  let resolvedIP = null;

  const ipMatch = output.match(/PING [^\s]+ \(([^\)]+)\)/);
  if (ipMatch) {
    resolvedIP = ipMatch[1];
  }

  const packetLine = lines.find(line => line.includes('packets transmitted'));
  if (packetLine) {
    const match = packetLine.match(/(\d+) packets transmitted, (\d+)(?:\s+packets)?\s+received/);
    if (match) {
      packetsReceived = parseInt(match[2], 10);
      packetLoss = ((packetsSent - packetsReceived) / packetsSent) * 100;
    }
  }

  let rtt = null;
  const statsLine = lines.find(line => line.includes('rtt min/avg/max'));
  if (statsLine && packetsReceived > 0) {
    const match = statsLine.match(/= ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/);
    if (match) {
      rtt = {
        min: parseFloat(match[1]),
        avg: parseFloat(match[2]),
        max: parseFloat(match[3]),
        stddev: parseFloat(match[4])
      };
    }
  }

  const result = {
    success: true,
    target,
    packets_sent: packetsSent,
    packets_received: packetsReceived,
    packet_loss_percent: Math.round(packetLoss * 10) / 10,
    time_ms: duration,
    rtt
  };

  if (resolvedIP) {
    result.resolved_ip = resolvedIP;
  }

  return result;
}

module.exports = { pingHost };
