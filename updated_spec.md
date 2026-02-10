# Network Diagnostic HTTP Service - Updated Specification

## Project Overview

Expand the existing whois-http service into a comprehensive network diagnostic toolkit. This service runs on a Docker host (dockerint01) that can access network diagnostic tools, bypassing corporate firewall restrictions. It provides HTTP/JSON APIs and a web UI for common network troubleshooting tasks.

## Current Status

✅ **Working:** Whois lookups at `https://whois.internal.earles.io/api/whois/:target`

## New Tools to Add

This spec adds four new diagnostic tools:
1. **DNS Lookups** - Query DNS records (A, AAAA, MX, TXT, NS, etc.)
2. **Ping** - ICMP connectivity testing with latency stats
3. **Port Check** - TCP port connectivity testing
4. **SSL Certificate Info** - Certificate details and expiration using openssl

## Technology Stack

**Backend:**
- Node.js 20 + Express (existing)
- System commands: `whois`, `dig`, `ping`, `openssl`, `nc` or `bash`
- node-cache for in-memory caching (existing)

**Frontend:**
- HTML/CSS/JavaScript with Tailwind CSS
- Multi-tool interface with tabs or tool selector

**Container:**
- Alpine Linux base image
- Additional packages: `bind-tools` (dig), `iputils` (ping), `openssl`, `netcat-openbsd`

## Updated API Structure

### Existing Endpoint

```
GET /api/whois/:target[?fields=field1,field2]
```

### New Endpoints

```
GET /api/dns/:hostname[?type=A|AAAA|MX|TXT|NS|CNAME|SOA|ANY]
GET /api/ping/:target[?count=4]
GET /api/port/:host/:port
GET /api/ssl/:hostname[?port=443]
GET /health
GET /
```

## Detailed API Specifications

### 1. DNS Lookup - GET /api/dns/:hostname

Query DNS records for a hostname.

**Parameters:**
- `:hostname` - Domain name to query (e.g., google.com)

**Query Parameters:**
- `type` (optional) - Record type: A, AAAA, MX, TXT, NS, CNAME, SOA, ANY (default: A)

**Implementation:**
```bash
# A record
dig +short google.com A

# Multiple types
dig +short google.com ANY

# Specific record with details
dig google.com MX +noall +answer
```

**Response Example (A record):**
```json
{
  "success": true,
  "hostname": "google.com",
  "type": "A",
  "records": [
    "142.250.185.46"
  ],
  "query_time_ms": 23,
  "cached": false,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

**Response Example (MX records):**
```json
{
  "success": true,
  "hostname": "google.com",
  "type": "MX",
  "records": [
    {
      "priority": 10,
      "host": "smtp.google.com"
    }
  ],
  "query_time_ms": 31,
  "cached": false,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

**Response Example (ANY/multiple types):**
```json
{
  "success": true,
  "hostname": "google.com",
  "type": "ANY",
  "records": {
    "A": ["142.250.185.46"],
    "AAAA": ["2607:f8b0:4004:c07::71"],
    "MX": [
      {"priority": 10, "host": "smtp.google.com"}
    ],
    "NS": ["ns1.google.com", "ns2.google.com"],
    "TXT": ["v=spf1 include:_spf.google.com ~all"]
  },
  "query_time_ms": 45,
  "cached": false,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "NXDOMAIN: Domain does not exist",
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

### 2. Ping Test - GET /api/ping/:target

ICMP echo request to test connectivity and measure latency.

**Parameters:**
- `:target` - IP address or hostname

**Query Parameters:**
- `count` (optional) - Number of packets (1-10, default: 4)

**Implementation:**
```bash
# Linux
ping -c 4 -W 2 8.8.8.8

# Parse output for packet loss and RTT stats
```

**Response Example:**
```json
{
  "success": true,
  "target": "8.8.8.8",
  "resolved_ip": "8.8.8.8",
  "packets_sent": 4,
  "packets_received": 4,
  "packet_loss_percent": 0,
  "time_ms": 3234,
  "rtt": {
    "min": 8.234,
    "avg": 9.123,
    "max": 10.567,
    "stddev": 0.842
  },
  "cached": false,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

**Response Example (with packet loss):**
```json
{
  "success": true,
  "target": "192.168.1.99",
  "resolved_ip": "192.168.1.99",
  "packets_sent": 4,
  "packets_received": 2,
  "packet_loss_percent": 50,
  "time_ms": 4012,
  "rtt": {
    "min": 245.123,
    "avg": 312.456,
    "max": 379.789,
    "stddev": 67.333
  },
  "cached": false,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

**Error Response (host unreachable):**
```json
{
  "success": false,
  "target": "10.0.0.1",
  "error": "100% packet loss - host unreachable",
  "packets_sent": 4,
  "packets_received": 0,
  "packet_loss_percent": 100,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

### 3. Port Check - GET /api/port/:host/:port

Test TCP connectivity to a specific port.

**Parameters:**
- `:host` - IP address or hostname
- `:port` - Port number (1-65535)

**Implementation Option 1 (using netcat):**
```bash
nc -zv -w 5 google.com 443
```

**Implementation Option 2 (using bash built-in):**
```bash
timeout 5 bash -c "echo > /dev/tcp/google.com/443" 2>/dev/null
```

**Response Example (open port):**
```json
{
  "success": true,
  "host": "google.com",
  "resolved_ip": "142.250.185.46",
  "port": 443,
  "open": true,
  "response_time_ms": 12.3,
  "cached": false,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

**Response Example (closed port):**
```json
{
  "success": true,
  "host": "google.com",
  "resolved_ip": "142.250.185.46",
  "port": 9999,
  "open": false,
  "response_time_ms": 5002.1,
  "cached": false,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid port number. Must be between 1 and 65535",
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

### 4. SSL Certificate Info - GET /api/ssl/:hostname

Retrieve SSL/TLS certificate information using openssl.

**Parameters:**
- `:hostname` - Domain name

**Query Parameters:**
- `port` (optional) - Port number (default: 443)

**Implementation:**
```bash
# Get certificate
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -text

# Get specific fields
openssl s_client -connect example.com:443 -servername example.com 2>/dev/null </dev/null | \
  openssl x509 -noout -dates -subject -issuer -ext subjectAltName
```

**Response Example:**
```json
{
  "success": true,
  "hostname": "google.com",
  "port": 443,
  "certificate": {
    "subject": {
      "common_name": "*.google.com",
      "organization": "Google LLC",
      "country": "US"
    },
    "issuer": {
      "common_name": "GTS CA 1C3",
      "organization": "Google Trust Services LLC",
      "country": "US"
    },
    "validity": {
      "not_before": "2025-01-13T08:26:49Z",
      "not_after": "2025-04-07T08:26:48Z",
      "days_remaining": 56,
      "expired": false,
      "valid": true
    },
    "subject_alt_names": [
      "*.google.com",
      "*.android.com",
      "*.appengine.google.com",
      "*.cloud.google.com",
      "*.google-analytics.com",
      "google.com"
    ],
    "key": {
      "algorithm": "RSA",
      "size": 2048
    },
    "signature_algorithm": "SHA256withRSA",
    "serial_number": "0A:3F:1B:2C:4D:5E:6F:7A:8B:9C:0D:1E:2F:3A:4B:5C",
    "version": 3,
    "self_signed": false
  },
  "chain_valid": true,
  "cached": false,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

**Response Example (expired certificate):**
```json
{
  "success": true,
  "hostname": "expired.badssl.com",
  "port": 443,
  "certificate": {
    "subject": {
      "common_name": "*.badssl.com"
    },
    "issuer": {
      "common_name": "COMODO RSA Domain Validation Secure Server CA"
    },
    "validity": {
      "not_before": "2015-04-09T00:00:00Z",
      "not_after": "2015-04-12T23:59:59Z",
      "days_remaining": -3952,
      "expired": true,
      "valid": false
    },
    "subject_alt_names": ["*.badssl.com", "badssl.com"],
    "key": {
      "algorithm": "RSA",
      "size": 2048
    },
    "signature_algorithm": "SHA256withRSA",
    "serial_number": "00:D7:4D:17:34:52:0B:B0:8D:32:60:F5:4D:8F:82:C6:46",
    "version": 3,
    "self_signed": false
  },
  "warnings": [
    "Certificate has expired"
  ],
  "chain_valid": false,
  "cached": false,
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Connection timeout - unable to connect to google.com:443",
  "timestamp": "2026-02-09T22:45:00.000Z"
}
```

## Updated Project Structure

```
whois-http/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── package.json
├── server.js
├── src/
│   ├── routes/
│   │   ├── whois.js          # Existing
│   │   ├── dns.js             # NEW
│   │   ├── ping.js            # NEW
│   │   ├── port.js            # NEW
│   │   └── ssl.js             # NEW
│   ├── services/
│   │   ├── whoisClient.js     # Existing
│   │   ├── dnsClient.js       # NEW
│   │   ├── pingClient.js      # NEW
│   │   ├── portClient.js      # NEW
│   │   ├── sslClient.js       # NEW
│   │   ├── parser.js          # Update for new formats
│   │   └── cache.js           # Existing
│   ├── middleware/
│   │   ├── rateLimiter.js     # Update with tool-specific limits
│   │   └── validator.js       # Update with new validators
│   └── utils/
│       └── logger.js          # Existing
├── public/
│   ├── index.html             # Update with multi-tool UI
│   ├── styles.css             # Update styling
│   └── app.js                 # Update with new tool handlers
└── README.md                  # Update with new endpoints
```

## Implementation Details

### 1. Updated Dockerfile

```dockerfile
FROM node:20-alpine

# Install network diagnostic tools
RUN apk add --no-cache \
    whois \
    bind-tools \
    iputils \
    openssl \
    netcat-openbsd \
    bash

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "server.js"]
```

### 2. src/services/dnsClient.js

DNS query service using `dig`:

```javascript
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function queryDNS(hostname, type = 'A') {
  const timeout = 5000;
  const validTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'ANY'];
  
  if (!validTypes.includes(type.toUpperCase())) {
    throw new Error(`Invalid DNS record type: ${type}`);
  }

  const command = `dig +short ${hostname} ${type}`;
  
  try {
    const { stdout, stderr } = await execAsync(command, { timeout });
    
    if (stderr && !stdout) {
      throw new Error(stderr);
    }
    
    return parseDigOutput(stdout, type);
  } catch (error) {
    throw new Error(`DNS query failed: ${error.message}`);
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
      return lines;
    
    case 'MX':
      return lines.map(line => {
        const [priority, host] = line.split(' ');
        return { priority: parseInt(priority), host };
      });
    
    case 'TXT':
      return lines.map(line => line.replace(/^"|"$/g, ''));
    
    case 'SOA':
      // Parse SOA record fields
      return lines;
    
    case 'ANY':
      // Need more complex parsing for ANY queries
      return parseAnyRecords(lines);
    
    default:
      return lines;
  }
}

module.exports = { queryDNS };
```

### 3. src/services/pingClient.js

Ping service using system `ping` command:

```javascript
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function pingHost(target, count = 4) {
  // Validate count
  count = Math.min(Math.max(parseInt(count) || 4, 1), 10);
  
  const timeout = (count * 2 + 5) * 1000; // 2s per packet + 5s buffer
  const command = `ping -c ${count} -W 2 ${target}`;
  
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(command, { timeout });
    const duration = Date.now() - startTime;
    
    return parsePingOutput(stdout, target, count, duration);
  } catch (error) {
    // Ping returns non-zero exit code for packet loss
    if (error.stdout) {
      return parsePingOutput(error.stdout, target, count, null);
    }
    throw new Error(`Ping failed: ${error.message}`);
  }
}

function parsePingOutput(output, target, packetsSent, duration) {
  const lines = output.split('\n');
  
  // Parse packet statistics
  const packetLine = lines.find(line => line.includes('packets transmitted'));
  const statsLine = lines.find(line => line.includes('rtt min/avg/max'));
  
  let packetsReceived = 0;
  let packetLoss = 100;
  
  if (packetLine) {
    const match = packetLine.match(/(\d+) packets transmitted, (\d+) received/);
    if (match) {
      packetsReceived = parseInt(match[2]);
      packetLoss = ((packetsSent - packetsReceived) / packetsSent) * 100;
    }
  }
  
  let rtt = null;
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
  
  return {
    target,
    packets_sent: packetsSent,
    packets_received: packetsReceived,
    packet_loss_percent: Math.round(packetLoss * 10) / 10,
    time_ms: duration,
    rtt
  };
}

module.exports = { pingHost };
```

### 4. src/services/portClient.js

Port connectivity test:

```javascript
const net = require('net');

async function checkPort(host, port, timeout = 5000) {
  return new Promise((resolve) => {
    const startTime = Date.now();
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
        open: true,
        response_time_ms: responseTime
      });
    });
    
    socket.on('timeout', () => {
      cleanup();
      resolve({
        open: false,
        response_time_ms: timeout
      });
    });
    
    socket.on('error', () => {
      const responseTime = Date.now() - startTime;
      cleanup();
      resolve({
        open: false,
        response_time_ms: responseTime
      });
    });
    
    socket.connect(port, host);
  });
}

module.exports = { checkPort };
```

### 5. src/services/sslClient.js

SSL certificate information using openssl:

```javascript
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function getCertificateInfo(hostname, port = 443) {
  const timeout = 10000;
  
  // Get certificate with all details
  const command = `echo | openssl s_client -connect ${hostname}:${port} -servername ${hostname} 2>/dev/null | openssl x509 -noout -text`;
  
  try {
    const { stdout } = await execAsync(command, { timeout });
    return parseCertificate(stdout, hostname, port);
  } catch (error) {
    throw new Error(`Failed to retrieve certificate: ${error.message}`);
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
  
  // Parse Subject
  const subjectMatch = certText.match(/Subject:([^\n]+)/);
  if (subjectMatch) {
    cert.subject = parseDistinguishedName(subjectMatch[1]);
  }
  
  // Parse Issuer
  const issuerMatch = certText.match(/Issuer:([^\n]+)/);
  if (issuerMatch) {
    cert.issuer = parseDistinguishedName(issuerMatch[1]);
  }
  
  // Parse Validity
  const notBeforeMatch = certText.match(/Not Before: ([^\n]+)/);
  const notAfterMatch = certText.match(/Not After : ([^\n]+)/);
  
  if (notBeforeMatch && notAfterMatch) {
    const notBefore = new Date(notBeforeMatch[1]);
    const notAfter = new Date(notAfterMatch[1]);
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
  
  // Parse Subject Alternative Names
  const sanMatch = certText.match(/X509v3 Subject Alternative Name:[^\n]*\n\s+([^\n]+)/);
  if (sanMatch) {
    cert.subject_alt_names = sanMatch[1]
      .split(', ')
      .filter(san => san.startsWith('DNS:'))
      .map(san => san.replace('DNS:', ''));
  }
  
  // Parse Public Key Info
  const keyMatch = certText.match(/Public Key Algorithm: ([^\n]+)/);
  const keySizeMatch = certText.match(/Public-Key: \((\d+) bit\)/);
  
  if (keyMatch) {
    const algo = keyMatch[1].trim();
    cert.key.algorithm = algo.includes('rsaEncryption') ? 'RSA' : 
                         algo.includes('id-ecPublicKey') ? 'ECDSA' : algo;
  }
  
  if (keySizeMatch) {
    cert.key.size = parseInt(keySizeMatch[1]);
  }
  
  // Parse Signature Algorithm
  const sigMatch = certText.match(/Signature Algorithm: ([^\n]+)/);
  if (sigMatch) {
    cert.signature_algorithm = sigMatch[1].trim();
  }
  
  // Parse Serial Number
  const serialMatch = certText.match(/Serial Number:\s*\n?\s*([^\n]+)/);
  if (serialMatch) {
    cert.serial_number = serialMatch[1].trim().replace(/\s+/g, '');
  }
  
  // Parse Version
  const versionMatch = certText.match(/Version: (\d+)/);
  if (versionMatch) {
    cert.version = parseInt(versionMatch[1]);
  }
  
  // Check if self-signed
  cert.self_signed = JSON.stringify(cert.subject) === JSON.stringify(cert.issuer);
  
  return cert;
}

function parseDistinguishedName(dn) {
  const parts = {};
  const entries = dn.split(',').map(e => e.trim());
  
  entries.forEach(entry => {
    const [key, ...valueParts] = entry.split('=');
    const value = valueParts.join('=').trim();
    
    if (key && value) {
      const normalizedKey = key.trim().toLowerCase();
      if (normalizedKey === 'cn') parts.common_name = value;
      else if (normalizedKey === 'o') parts.organization = value;
      else if (normalizedKey === 'ou') parts.organizational_unit = value;
      else if (normalizedKey === 'c') parts.country = value;
      else if (normalizedKey === 'st') parts.state = value;
      else if (normalizedKey === 'l') parts.locality = value;
    }
  });
  
  return parts;
}

module.exports = { getCertificateInfo };
```

### 6. Updated src/middleware/rateLimiter.js

Tool-specific rate limiting:

```javascript
const rateLimit = require('express-rate-limit');

// Fast operations - 60/min
const fastLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

// Medium operations - 30/min
const mediumLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

// Slow operations - 20/min
const slowLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { success: false, error: 'Too many requests, please try again later.' }
});

module.exports = {
  whoisLimiter: fastLimiter,    // whois
  dnsLimiter: fastLimiter,      // dns
  pingLimiter: mediumLimiter,   // ping
  portLimiter: fastLimiter,     // port
  sslLimiter: mediumLimiter     // ssl
};
```

### 7. Updated src/middleware/validator.js

Add validators for new tools:

```javascript
function validateHostname(hostname) {
  // Basic hostname validation
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return hostnameRegex.test(hostname);
}

function validateIPv4(ip) {
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const parts = ip.split('.');
  return parts.every(part => {
    const num = parseInt(part);
    return num >= 0 && num <= 255;
  });
}

function validateIPv6(ip) {
  const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4})$/;
  return ipv6Regex.test(ip);
}

function validateDNSRecordType(type) {
  const validTypes = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'ANY'];
  return validTypes.includes(type.toUpperCase());
}

function validatePort(port) {
  const portNum = parseInt(port);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

function sanitizeInput(input) {
  // Remove any shell metacharacters
  return input.replace(/[;&|`$(){}[\]<>'"\\]/g, '');
}

module.exports = {
  validateHostname,
  validateIPv4,
  validateIPv6,
  validateDNSRecordType,
  validatePort,
  sanitizeInput
};
```

### 8. Updated Web UI (public/index.html)

Multi-tool interface with tabs:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Network Diagnostic Tools</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen">
  <div class="container mx-auto px-4 py-8 max-w-6xl">
    <header class="mb-8">
      <h1 class="text-4xl font-bold text-gray-800 mb-2">Network Diagnostic Tools</h1>
      <p class="text-gray-600">Corporate network bypass for common network utilities</p>
    </header>

    <!-- Tool Selector Tabs -->
    <div class="mb-6 border-b border-gray-200">
      <nav class="-mb-px flex space-x-4">
        <button class="tool-tab active py-2 px-4 border-b-2 font-medium text-sm" data-tool="whois">
          Whois Lookup
        </button>
        <button class="tool-tab py-2 px-4 border-b-2 font-medium text-sm" data-tool="dns">
          DNS Query
        </button>
        <button class="tool-tab py-2 px-4 border-b-2 font-medium text-sm" data-tool="ping">
          Ping Test
        </button>
        <button class="tool-tab py-2 px-4 border-b-2 font-medium text-sm" data-tool="port">
          Port Check
        </button>
        <button class="tool-tab py-2 px-4 border-b-2 font-medium text-sm" data-tool="ssl">
          SSL Certificate
        </button>
      </nav>
    </div>

    <!-- Tool Panels -->
    <div id="tool-panels">
      
      <!-- Whois Panel -->
      <div class="tool-panel" data-tool="whois">
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-2xl font-semibold mb-4">Whois Lookup</h2>
          <form id="whois-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                IP Address or Domain
              </label>
              <input 
                type="text" 
                id="whois-input"
                placeholder="e.g., 8.8.8.8 or google.com"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Filter Fields (optional, comma-separated)
              </label>
              <input 
                type="text" 
                id="whois-fields"
                placeholder="e.g., OrgName,CIDR,Country"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Lookup
            </button>
          </form>
        </div>
        <div id="whois-results"></div>
      </div>

      <!-- DNS Panel -->
      <div class="tool-panel hidden" data-tool="dns">
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-2xl font-semibold mb-4">DNS Query</h2>
          <form id="dns-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Hostname
              </label>
              <input 
                type="text" 
                id="dns-input"
                placeholder="e.g., google.com"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Record Type
              </label>
              <select 
                id="dns-type"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="A">A</option>
                <option value="AAAA">AAAA</option>
                <option value="MX">MX</option>
                <option value="TXT">TXT</option>
                <option value="NS">NS</option>
                <option value="CNAME">CNAME</option>
                <option value="SOA">SOA</option>
                <option value="ANY">ANY</option>
              </select>
            </div>
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Query
            </button>
          </form>
        </div>
        <div id="dns-results"></div>
      </div>

      <!-- Ping Panel -->
      <div class="tool-panel hidden" data-tool="ping">
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-2xl font-semibold mb-4">Ping Test</h2>
          <form id="ping-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Target IP or Hostname
              </label>
              <input 
                type="text" 
                id="ping-input"
                placeholder="e.g., 8.8.8.8 or google.com"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Packet Count (1-10)
              </label>
              <input 
                type="number" 
                id="ping-count"
                value="4"
                min="1"
                max="10"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Ping
            </button>
          </form>
        </div>
        <div id="ping-results"></div>
      </div>

      <!-- Port Panel -->
      <div class="tool-panel hidden" data-tool="port">
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-2xl font-semibold mb-4">Port Connectivity Check</h2>
          <form id="port-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Host
              </label>
              <input 
                type="text" 
                id="port-host"
                placeholder="e.g., google.com or 8.8.8.8"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Port (1-65535)
              </label>
              <input 
                type="number" 
                id="port-number"
                placeholder="e.g., 443"
                min="1"
                max="65535"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Check Port
            </button>
          </form>
        </div>
        <div id="port-results"></div>
      </div>

      <!-- SSL Panel -->
      <div class="tool-panel hidden" data-tool="ssl">
        <div class="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 class="text-2xl font-semibold mb-4">SSL Certificate Information</h2>
          <form id="ssl-form" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Hostname
              </label>
              <input 
                type="text" 
                id="ssl-hostname"
                placeholder="e.g., google.com"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Port (optional, default: 443)
              </label>
              <input 
                type="number" 
                id="ssl-port"
                placeholder="443"
                value="443"
                min="1"
                max="65535"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button type="submit" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
              Check Certificate
            </button>
          </form>
        </div>
        <div id="ssl-results"></div>
      </div>

    </div>
  </div>

  <script src="app.js"></script>
</body>
</html>
```

### 9. Cache Configuration

Different TTLs for different tools:

```javascript
// src/services/cache.js
const NodeCache = require('node-cache');

const caches = {
  whois: new NodeCache({ stdTTL: 3600 }),      // 1 hour
  dns: new NodeCache({ stdTTL: 300 }),         // 5 minutes
  ping: new NodeCache({ stdTTL: 60 }),         // 1 minute
  port: new NodeCache({ stdTTL: 60 }),         // 1 minute
  ssl: new NodeCache({ stdTTL: 86400 })        // 24 hours
};

function getCache(tool) {
  return caches[tool] || caches.whois;
}

module.exports = { getCache };
```

## Security & Operational Considerations

### Input Validation

**DNS:**
- Validate hostname format
- Sanitize for command injection
- Validate record type against whitelist

**Ping:**
- Validate target (IP or hostname)
- Limit count to 1-10
- Sanitize input

**Port:**
- Validate port number (1-65535)
- Validate host format
- Timeout after 5 seconds

**SSL:**
- Validate hostname format
- Validate port number
- Timeout after 10 seconds
- Handle connection failures gracefully

### Timeouts

- DNS: 5 seconds
- Ping: (count * 2) + 5 seconds
- Port: 5 seconds
- SSL: 10 seconds
- Whois: 30 seconds (existing)

### Rate Limiting

- **Fast** (60/min): whois, dns, port
- **Medium** (30/min): ping, ssl

### Caching Strategy

- **Whois**: 1 hour (data rarely changes)
- **DNS**: 5 minutes (respect TTL but cache for performance)
- **Ping**: 1 minute (latency changes frequently)
- **Port**: 1 minute (connectivity changes frequently)
- **SSL**: 24 hours (certificates don't change often)

### Logging

Log all requests with:
- Tool type
- Target/input
- Source IP
- Timestamp
- Cached status
- Response time
- Success/failure

## Testing Instructions

### DNS Tests

```bash
# A record
curl "http://dockerint01:3000/api/dns/google.com"

# MX records
curl "http://dockerint01:3000/api/dns/google.com?type=MX"

# All records
curl "http://dockerint01:3000/api/dns/google.com?type=ANY"

# IPv6 (AAAA)
curl "http://dockerint01:3000/api/dns/google.com?type=AAAA"

# TXT records
curl "http://dockerint01:3000/api/dns/google.com?type=TXT"
```

### Ping Tests

```bash
# Basic ping
curl "http://dockerint01:3000/api/ping/8.8.8.8"

# Custom count
curl "http://dockerint01:3000/api/ping/google.com?count=10"

# Unreachable host
curl "http://dockerint01:3000/api/ping/192.168.1.999"
```

### Port Tests

```bash
# Open port
curl "http://dockerint01:3000/api/port/google.com/443"

# Closed port
curl "http://dockerint01:3000/api/port/google.com/9999"

# HTTP port
curl "http://dockerint01:3000/api/port/example.com/80"
```

### SSL Tests

```bash
# Standard HTTPS
curl "http://dockerint01:3000/api/ssl/google.com"

# Custom port
curl "http://dockerint01:3000/api/ssl/example.com?port=8443"

# Expired certificate
curl "http://dockerint01:3000/api/ssl/expired.badssl.com"
```

### Combined Testing Script

```bash
#!/bin/bash
BASE_URL="http://dockerint01:3000"

echo "Testing Whois..."
curl "$BASE_URL/api/whois/8.8.8.8?fields=OrgName,CIDR" | jq

echo -e "\nTesting DNS..."
curl "$BASE_URL/api/dns/google.com?type=A" | jq

echo -e "\nTesting Ping..."
curl "$BASE_URL/api/ping/8.8.8.8" | jq

echo -e "\nTesting Port..."
curl "$BASE_URL/api/port/google.com/443" | jq

echo -e "\nTesting SSL..."
curl "$BASE_URL/api/ssl/google.com" | jq

echo -e "\nTesting Health..."
curl "$BASE_URL/health" | jq
```

## Deployment Updates

### Build and Deploy

```bash
# Rebuild with new packages
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f

# Verify all tools are available
docker-compose exec whois-service which dig
docker-compose exec whois-service which ping
docker-compose exec whois-service which openssl
docker-compose exec whois-service which nc
```

### Verify Installation

```bash
# Test inside container
docker-compose exec whois-service dig +short google.com
docker-compose exec whois-service ping -c 1 8.8.8.8
docker-compose exec whois-service echo | openssl s_client -connect google.com:443 -servername google.com 2>/dev/null | head -20
docker-compose exec whois-service nc -zv google.com 443 2>&1
```

## Example Usage Scenarios

### Scenario 1: Troubleshoot DNS resolution

```bash
# Check if DNS is resolving correctly
curl "http://dockerint01:3000/api/dns/internal-app.company.com"

# Compare A and AAAA records
curl "http://dockerint01:3000/api/dns/internal-app.company.com?type=A"
curl "http://dockerint01:3000/api/dns/internal-app.company.com?type=AAAA"
```

### Scenario 2: Test connectivity to service

```bash
# First check if host is reachable
curl "http://dockerint01:3000/api/ping/prod-server.company.com"

# Then check if specific port is open
curl "http://dockerint01:3000/api/port/prod-server.company.com/443"

# Finally check SSL certificate
curl "http://dockerint01:3000/api/ssl/prod-server.company.com"
```

### Scenario 3: Certificate expiration monitoring

```bash
# Check certificate expiration
curl "http://dockerint01:3000/api/ssl/api.company.com" | jq '.certificate.validity.days_remaining'

# Get expiration date
curl "http://dockerint01:3000/api/ssl/api.company.com" | jq '.certificate.validity.not_after'
```

### Scenario 4: Network latency comparison

```bash
# Compare latency to different DNS servers
curl "http://dockerint01:3000/api/ping/8.8.8.8?count=10" | jq '.rtt.avg'
curl "http://dockerint01:3000/api/ping/1.1.1.1?count=10" | jq '.rtt.avg'
curl "http://dockerint01:3000/api/ping/208.67.222.222?count=10" | jq '.rtt.avg'
```

## Success Criteria

- [ ] All existing whois functionality continues to work
- [ ] DNS queries return correct records for all types
- [ ] Ping tests return accurate latency statistics
- [ ] Port checks correctly identify open/closed ports
- [ ] SSL certificate info shows all relevant details
- [ ] Rate limiting works per tool
- [ ] Caching reduces duplicate queries
- [ ] Web UI displays all tools correctly
- [ ] All tools accessible from corporate desktop
- [ ] Docker image builds successfully with all dependencies
- [ ] Health check passes
- [ ] Logging captures all tool usage

## Future Enhancements (Not in this spec)

- Traceroute / MTR
- HTTP header inspection
- GeoIP lookup
- Batch queries (multiple targets at once)
- Historical data / trending
- Alert notifications (cert expiration)
- Export reports (PDF, CSV)
- User authentication
- API usage statistics dashboard

## Notes

- Keep implementation simple and maintainable
- Use system commands directly (dig, ping, openssl) rather than libraries where possible
- All tools should have similar response structure for consistency
- Prioritize reliability over features
- Extensive error handling for network failures
- Clear error messages for users
- Consider adding prometheus metrics endpoint later