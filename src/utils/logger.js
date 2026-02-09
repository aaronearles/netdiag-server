function getTimestamp() {
  return new Date().toISOString();
}

function log(level, message, meta = {}) {
  const timestamp = getTimestamp();
  const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[${timestamp}] [${level}]${metaStr} ${message}`);
}

function info(message, meta) {
  log('INFO', message, meta);
}

function error(message, meta) {
  log('ERROR', message, meta);
}

function warn(message, meta) {
  log('WARN', message, meta);
}

function debug(message, meta) {
  if (process.env.NODE_ENV !== 'production') {
    log('DEBUG', message, meta);
  }
}

function logRequest(target, ip, cached, responseTime) {
  info('Whois request', { target, ip, cached, responseTime });
}

module.exports = {
  info,
  error,
  warn,
  debug,
  logRequest
};
