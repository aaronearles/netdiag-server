const { execFile } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execFileAsync = promisify(execFile);

const whoisTimeout = parseInt(process.env.WHOIS_TIMEOUT || '30000', 10);

async function queryWhois(target) {
  try {
    logger.debug(`Executing whois query for: ${target}`);

    const { stdout, stderr } = await execFileAsync('whois', [target], {
      timeout: whoisTimeout,
      maxBuffer: 1024 * 1024
    });

    if (stderr && stderr.trim()) {
      logger.warn(`Whois stderr output for ${target}`, { stderr: stderr.trim() });
    }

    return {
      success: true,
      stdout: stdout,
      stderr: stderr || ''
    };
  } catch (error) {
    logger.error(`Whois query failed for ${target}`, {
      error: error.message,
      code: error.code
    });

    return {
      success: false,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      error: error.message
    };
  }
}

module.exports = {
  queryWhois
};
