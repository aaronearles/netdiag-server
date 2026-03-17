const { execFile } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');
const { isValidIPv4, isValidIPv6 } = require('../middleware/validator');

const execFileAsync = promisify(execFile);

// Convert IP address to PTR format for reverse lookup
function ipToPTR(ip) {
  if (isValidIPv4(ip)) {
    // Convert 8.8.8.8 to 8.8.8.8.in-addr.arpa
    const octets = ip.split('.');
    return `${octets.reverse().join('.')}.in-addr.arpa`;
  } else if (isValidIPv6(ip)) {
    // Convert IPv6 to reverse nibble format (ip6.arpa)
    // Remove colons and expand to full format, then reverse nibbles
    const expanded = expandIPv6(ip);
    const nibbles = expanded.replace(/:/g, '').split('').reverse().join('.');
    return `${nibbles}.ip6.arpa`;
  }
  return ip;
}

// Expand IPv6 address to full format
function expandIPv6(ip) {
  const segments = ip.split(':');
  const fullSegments = [];

  for (let i = 0; i < segments.length; i++) {
    if (segments[i] === '') {
      // Handle :: compression
      const remaining = 8 - segments.filter(s => s !== '').length;
      for (let j = 0; j <= remaining; j++) {
        fullSegments.push('0000');
      }
    } else {
      fullSegments.push(segments[i].padStart(4, '0'));
    }
  }

  return fullSegments.slice(0, 8).join(':');
}

async function queryDNS(hostname, type = 'A') {
  const timeout = 5000;
  const validTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'ANY', 'PTR'];

  let queryHostname = hostname;
  let queryType = type.toUpperCase();

  // Auto-detect reverse lookup: if hostname is an IP and type is not explicitly set, do PTR
  if ((isValidIPv4(hostname) || isValidIPv6(hostname)) && type === 'A') {
    queryType = 'PTR';
    queryHostname = ipToPTR(hostname);
    logger.debug(`Auto-detected IP address, performing reverse lookup: ${queryHostname}`);
  }

  if (!validTypes.includes(queryType)) {
    throw new Error(`Invalid DNS record type: ${type}`);
  }

  try {
    logger.debug(`Executing DNS query for: ${queryHostname} type ${queryType}`);

    const { stdout, stderr } = await execFileAsync('dig', ['+short', queryHostname, queryType], {
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

    const records = parseDigOutput(stdout, queryType);

    return {
      success: true,
      records,
      raw: stdout,
      queryType,  // Return actual query type used (PTR for reverse lookups)
      isReverseLookup: queryType === 'PTR'
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

    case 'PTR':
      // PTR records: remove trailing dots from hostnames
      return lines.map(line => line.trim().replace(/\.$/, ''));

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
