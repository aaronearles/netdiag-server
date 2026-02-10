const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

async function getCertificateInfo(hostname, port = 443) {
  const timeout = 10000;

  const command = `echo | openssl s_client -connect ${hostname}:${port} -servername ${hostname} 2>/dev/null | openssl x509 -noout -text`;

  try {
    logger.debug(`Fetching SSL certificate for: ${hostname}:${port}`);

    const { stdout, stderr } = await execAsync(command, { timeout });

    if (!stdout || stdout.trim().length === 0) {
      throw new Error('No certificate data received');
    }

    const cert = parseCertificate(stdout, hostname, port);

    return {
      success: true,
      certificate: cert
    };
  } catch (error) {
    logger.error(`SSL certificate fetch failed for ${hostname}:${port}`, {
      error: error.message,
      code: error.code
    });

    return {
      success: false,
      error: `Failed to retrieve certificate: ${error.message}`
    };
  }
}

function parseCertificate(certText, hostname, port) {
  const cert = {
    subject: {},
    issuer: {},
    validity: {},
    subject_alt_names: [],
    key: {},
    signature_algorithm: null,
    serial_number: null,
    version: null,
    self_signed: false
  };

  const subjectMatch = certText.match(/Subject:([^\n]+)/);
  if (subjectMatch) {
    cert.subject = parseDistinguishedName(subjectMatch[1]);
  }

  const issuerMatch = certText.match(/Issuer:([^\n]+)/);
  if (issuerMatch) {
    cert.issuer = parseDistinguishedName(issuerMatch[1]);
  }

  const notBeforeMatch = certText.match(/Not Before\s*:\s*([^\n]+)/);
  const notAfterMatch = certText.match(/Not After\s*:\s*([^\n]+)/);

  if (notBeforeMatch && notAfterMatch) {
    const notBefore = new Date(notBeforeMatch[1].trim());
    const notAfter = new Date(notAfterMatch[1].trim());
    const now = new Date();
    const daysRemaining = Math.floor((notAfter - now) / (1000 * 60 * 60 * 24));

    cert.validity = {
      not_before: notBefore.toISOString(),
      not_after: notAfter.toISOString(),
      days_remaining: daysRemaining,
      expired: now > notAfter,
      valid: now >= notBefore && now <= notAfter
    };
  }

  const sanSection = certText.match(/X509v3 Subject Alternative Name:\s*\n\s+([^\n]+)/);
  if (sanSection) {
    cert.subject_alt_names = sanSection[1]
      .split(',')
      .map(san => san.trim())
      .filter(san => san.startsWith('DNS:'))
      .map(san => san.replace('DNS:', ''));
  }

  const keyAlgoMatch = certText.match(/Public Key Algorithm:\s*([^\n]+)/);
  const keySizeMatch = certText.match(/Public-Key:\s*\((\d+)\s+bit\)/);

  if (keyAlgoMatch) {
    const algo = keyAlgoMatch[1].trim();
    cert.key.algorithm = algo.includes('rsaEncryption') ? 'RSA' :
                        algo.includes('id-ecPublicKey') ? 'ECDSA' : algo;
  }

  if (keySizeMatch) {
    cert.key.size = parseInt(keySizeMatch[1], 10);
  }

  const sigAlgoMatch = certText.match(/Signature Algorithm:\s*([^\n]+)/);
  if (sigAlgoMatch) {
    cert.signature_algorithm = sigAlgoMatch[1].trim();
  }

  const serialMatch = certText.match(/Serial Number:\s*\n?\s*(?:[\da-f]+:)?([^\n]+)/i);
  if (serialMatch) {
    cert.serial_number = serialMatch[1].trim().replace(/\s+/g, '');
  }

  const versionMatch = certText.match(/Version:\s*(\d+)/);
  if (versionMatch) {
    cert.version = parseInt(versionMatch[1], 10);
  }

  cert.self_signed = JSON.stringify(cert.subject) === JSON.stringify(cert.issuer);

  return cert;
}

function parseDistinguishedName(dn) {
  const parts = {};
  const entries = dn.split(',').map(e => e.trim());

  entries.forEach(entry => {
    const eqIndex = entry.indexOf('=');
    if (eqIndex > 0) {
      const key = entry.substring(0, eqIndex).trim();
      const value = entry.substring(eqIndex + 1).trim();

      if (key && value) {
        const normalizedKey = key.toLowerCase();
        if (normalizedKey === 'cn') parts.common_name = value;
        else if (normalizedKey === 'o') parts.organization = value;
        else if (normalizedKey === 'ou') parts.organizational_unit = value;
        else if (normalizedKey === 'c') parts.country = value;
        else if (normalizedKey === 'st') parts.state = value;
        else if (normalizedKey === 'l') parts.locality = value;
      }
    }
  });

  return parts;
}

module.exports = { getCertificateInfo };
