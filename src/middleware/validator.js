const logger = require('../utils/logger');

const IPV4_REGEX = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_REGEX = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const ASN_REGEX = /^AS\d+$/i;

const SHELL_METACHARACTERS = /[;&|$()<>`\\'"]/;

function isValidIPv4(ip) {
  if (!IPV4_REGEX.test(ip)) {
    return false;
  }

  const octets = ip.split('.');
  for (const octet of octets) {
    const num = parseInt(octet, 10);
    if (num < 0 || num > 255) {
      return false;
    }
  }

  return true;
}

function isValidIPv6(ip) {
  return IPV6_REGEX.test(ip);
}

function isValidDomain(domain) {
  if (domain.length > 253) {
    return false;
  }

  return DOMAIN_REGEX.test(domain);
}

function isValidASN(asn) {
  return ASN_REGEX.test(asn);
}

function hasShellMetacharacters(input) {
  return SHELL_METACHARACTERS.test(input);
}

function validateTarget(target) {
  if (!target || typeof target !== 'string') {
    return { valid: false, error: 'Target must be a non-empty string' };
  }

  const trimmed = target.trim();

  if (trimmed.length === 0) {
    return { valid: false, error: 'Target cannot be empty' };
  }

  if (trimmed.length > 255) {
    return { valid: false, error: 'Target is too long' };
  }

  if (hasShellMetacharacters(trimmed)) {
    return { valid: false, error: 'Target contains invalid characters' };
  }

  if (isValidIPv4(trimmed)) {
    return { valid: true, type: 'ipv4', target: trimmed };
  }

  if (isValidIPv6(trimmed)) {
    return { valid: true, type: 'ipv6', target: trimmed };
  }

  if (isValidASN(trimmed)) {
    return { valid: true, type: 'asn', target: trimmed };
  }

  if (isValidDomain(trimmed)) {
    return { valid: true, type: 'domain', target: trimmed };
  }

  return { valid: false, error: 'Invalid IP address, domain name, or ASN format' };
}

function validateTargetMiddleware(req, res, next) {
  const target = req.params.target;
  const validation = validateTarget(target);

  if (!validation.valid) {
    logger.warn('Invalid target validation', {
      target,
      error: validation.error,
      ip: req.ip
    });

    return res.status(400).json({
      success: false,
      error: validation.error,
      timestamp: new Date().toISOString()
    });
  }

  req.validatedTarget = validation.target;
  req.targetType = validation.type;
  next();
}

function validateHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') {
    return false;
  }

  const trimmed = hostname.trim();

  if (trimmed.length === 0 || trimmed.length > 253) {
    return false;
  }

  if (hasShellMetacharacters(trimmed)) {
    return false;
  }

  return isValidIPv4(trimmed) || isValidIPv6(trimmed) || isValidDomain(trimmed);
}

function validateDNSRecordType(type) {
  const validTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'PTR', 'ANY'];
  return validTypes.includes(type.toUpperCase());
}

function validatePort(port) {
  const portNum = parseInt(port, 10);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

function validatePingCount(count) {
  const countNum = parseInt(count, 10);
  return !isNaN(countNum) && countNum >= 1 && countNum <= 10;
}

function sanitizeInput(input) {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input.replace(/[;&|`$(){}\[\]<>'"\\]/g, '');
}

module.exports = {
  validateTarget,
  validateTargetMiddleware,
  isValidIPv4,
  isValidIPv6,
  isValidDomain,
  isValidASN,
  validateHostname,
  validateDNSRecordType,
  validatePort,
  validatePingCount,
  sanitizeInput,
  hasShellMetacharacters
};
