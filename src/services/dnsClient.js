const { execFile } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execFileAsync = promisify(execFile);

async function queryDNS(hostname, type = 'A') {
  const timeout = 5000;
  const validTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'ANY'];

  const upperType = type.toUpperCase();
  if (!validTypes.includes(upperType)) {
    throw new Error(`Invalid DNS record type: ${type}`);
  }

  try {
    logger.debug(`Executing DNS query for: ${hostname} type ${upperType}`);

    const { stdout, stderr } = await execFileAsync('dig', ['+short', hostname, upperType], {
      timeout,
      maxBuffer: 1024 * 1024
    });

    if (stderr && stderr.trim()) {
      logger.warn(`DNS stderr output for ${hostname}`, { stderr: stderr.trim() });
    }

    if (!stdout || stdout.trim().length === 0) {
      return {
        success: false,
        error: 'No DNS records found',
        records: []
      };
    }

    const records = parseDigOutput(stdout, upperType);

    return {
      success: true,
      records,
      raw: stdout
    };
  } catch (error) {
    logger.error(`DNS query failed for ${hostname}`, {
      error: error.message,
      code: error.code
    });

    return {
      success: false,
      error: error.message,
      records: []
    };
  }
}

function parseDigOutput(output, type) {
  const lines = output.trim().split('\n').filter(line => line.length > 0);

  if (lines.length === 0) {
    return [];
  }

  switch(type) {
    case 'A':
    case 'AAAA':
    case 'CNAME':
    case 'NS':
      return lines.map(line => line.trim());

    case 'MX':
      return lines.map(line => {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 2) {
          return {
            priority: parseInt(parts[0], 10),
            host: parts[1].replace(/\.$/, '')
          };
        }
        return { priority: 0, host: line.trim() };
      });

    case 'TXT':
      return lines.map(line => line.trim().replace(/^"|"$/g, ''));

    case 'SOA':
      return lines.map(line => line.trim());

    case 'ANY':
      return lines.map(line => line.trim());

    default:
      return lines.map(line => line.trim());
  }
}

module.exports = { queryDNS };
