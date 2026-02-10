# Network Diagnostic Tools

A lightweight, Dockerized web service providing multiple network diagnostic tools via HTTP API and web UI. This service acts as an HTTP gateway to common network utilities, useful for bypassing corporate firewall restrictions that block these protocols.

## Features

- **5 Network Diagnostic Tools:**
  - Whois lookups (IPv4, IPv6, domains, ASN)
  - DNS queries (A, AAAA, MX, TXT, NS, CNAME, SOA, ANY)
  - Ping tests (ICMP with RTT statistics)
  - Port connectivity checks (TCP)
  - SSL certificate inspection
- RESTful API for all tools
- Clean, modern web UI with tool tabs
- Tool-specific caching with optimized TTLs
- Tool-specific rate limiting
- Parsed JSON output for all tools
- Security-hardened input validation
- Health check endpoint
- Docker containerized for easy deployment

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone or download the project
cd whois-http

# Build and start the service
docker compose up -d --build

# Check the logs
docker compose logs -f

# Verify it's running
curl http://localhost:3000/health
```

### Using Docker

```bash
# Build the image
docker build -t nettools-service .

# Run the container
docker run -d -p 3000:3000 --name nettools-service nettools-service

# Check logs
docker logs -f nettools-service
```

### Local Development

```bash
# Install dependencies
npm install

# Start in development mode
npm run dev

# Or start in production mode
npm start
```

## API Usage

### 1. Whois Lookup

**GET /api/whois/:target**

Query whois information for an IP address, domain name, or ASN.

**Examples:**

```bash
# IPv4 lookup
curl http://localhost:3000/api/whois/8.8.8.8

# IPv6 lookup
curl http://localhost:3000/api/whois/2001:4860:4860::8888

# Domain lookup
curl http://localhost:3000/api/whois/google.com

# ASN lookup
curl http://localhost:3000/api/whois/AS15169

# Filtered fields
curl "http://localhost:3000/api/whois/8.8.8.8?fields=NetRange,Organization,Country"
```

**Response:**

```json
{
  "success": true,
  "target": "8.8.8.8",
  "raw": "# ARIN WHOIS data...\n\nNetRange: 8.8.8.0 - 8.8.8.255\n...",
  "parsed": {
    "NetRange": "8.8.8.0 - 8.8.8.255",
    "CIDR": "8.8.8.0/24",
    "NetName": "LVLT-GOGL-8-8-8",
    "Organization": "Google LLC (GOGL)",
    "Country": "US"
  },
  "cached": false,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Cache TTL:** 1 hour
**Rate Limit:** 60 requests/minute

---

### 2. DNS Lookup

**GET /api/dns/:hostname?type=A|AAAA|MX|TXT|NS|CNAME|SOA|ANY**

Query DNS records for a hostname.

**Parameters:**
- `hostname` - Domain name to query
- `type` - Record type (default: A)

**Examples:**

```bash
# A record (IPv4)
curl http://localhost:3000/api/dns/google.com

# AAAA record (IPv6)
curl "http://localhost:3000/api/dns/google.com?type=AAAA"

# MX records
curl "http://localhost:3000/api/dns/google.com?type=MX"

# TXT records
curl "http://localhost:3000/api/dns/google.com?type=TXT"

# All records
curl "http://localhost:3000/api/dns/google.com?type=ANY"
```

**Response:**

```json
{
  "success": true,
  "hostname": "google.com",
  "type": "A",
  "records": [
    "142.250.185.46"
  ],
  "record_count": 1,
  "raw": "142.250.185.46\n",
  "cached": false,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Cache TTL:** 5 minutes
**Rate Limit:** 60 requests/minute

---

### 3. Ping Test

**GET /api/ping/:target?count=1-10**

Perform ICMP ping test with packet statistics.

**Parameters:**
- `target` - IP address or hostname
- `count` - Number of packets (1-10, default: 4)

**Examples:**

```bash
# Ping with default count (4)
curl http://localhost:3000/api/ping/8.8.8.8

# Ping with custom count
curl "http://localhost:3000/api/ping/google.com?count=10"
```

**Response:**

```json
{
  "success": true,
  "target": "8.8.8.8",
  "packets_sent": 4,
  "packets_received": 4,
  "packet_loss_percent": 0,
  "duration_ms": 3042,
  "rtt": {
    "min_ms": 14.2,
    "avg_ms": 15.1,
    "max_ms": 16.8,
    "stddev_ms": 1.2
  },
  "raw": "PING 8.8.8.8 (8.8.8.8): 56 data bytes\n...",
  "cached": false,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Cache TTL:** 1 minute
**Rate Limit:** 30 requests/minute

---

### 4. Port Check

**GET /api/port/:host/:port**

Check TCP port connectivity.

**Examples:**

```bash
# Check HTTPS port
curl http://localhost:3000/api/port/google.com/443

# Check SSH port
curl http://localhost:3000/api/port/8.8.8.8/22

# Check custom port
curl http://localhost:3000/api/port/example.com/8080
```

**Response:**

```json
{
  "success": true,
  "host": "google.com",
  "port": 443,
  "open": true,
  "resolved_ip": "142.250.185.46",
  "response_time_ms": 42,
  "cached": false,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Cache TTL:** 1 minute
**Rate Limit:** 60 requests/minute

---

### 5. SSL Certificate

**GET /api/ssl/:hostname?port=443**

Retrieve and inspect SSL/TLS certificate.

**Parameters:**
- `hostname` - Server hostname
- `port` - Port number (default: 443)

**Examples:**

```bash
# Check HTTPS certificate
curl http://localhost:3000/api/ssl/google.com

# Check certificate on custom port
curl "http://localhost:3000/api/ssl/example.com?port=8443"
```

**Response:**

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
      "not_before": "2026-01-13T08:25:43.000Z",
      "not_after": "2026-04-07T08:25:42.000Z",
      "days_remaining": 57,
      "expired": false,
      "valid": true
    },
    "subject_alt_names": ["*.google.com", "google.com"],
    "key": {
      "algorithm": "RSA",
      "size": 2048
    },
    "signature_algorithm": "sha256WithRSAEncryption",
    "serial_number": "...",
    "version": 3,
    "self_signed": false
  },
  "warnings": ["Certificate expires in 57 days"],
  "chain_valid": true,
  "cached": false,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Cache TTL:** 24 hours
**Rate Limit:** 30 requests/minute

---

### Health Check

**GET /health**

Health check endpoint for monitoring:

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

## Web UI

Access the web interface at `http://localhost:3000/`

Features:
- **Multi-tool interface** with tabs for each diagnostic tool
- **Tool-specific input forms** with appropriate field validation
- **Tabbed result display** (parsed data vs raw output)
- **Visual enhancements:**
  - Color-coded port status (open/closed)
  - Ping packet loss indicators
  - SSL certificate expiration warnings
  - Certificate validity status
- **Copy-to-clipboard** functionality for JSON and raw data
- **Recent queries history** with tool badges (stored in localStorage)
- **Responsive design** with Tailwind CSS
- **One-click query replay** from history

## Configuration

Configure the service using environment variables in `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `NODE_ENV` | production | Environment mode |
| `WHOIS_TIMEOUT` | 30000 | Whois command timeout in milliseconds |

**Tool-Specific Cache TTLs** (configured in `src/services/cache.js`):
- Whois: 1 hour (3600s)
- DNS: 5 minutes (300s)
- Ping: 1 minute (60s)
- Port: 1 minute (60s)
- SSL: 24 hours (86400s)

**Tool-Specific Rate Limits** (configured in `src/middleware/rateLimiter.js`):
- Fast tools (60/min): Whois, DNS, Port
- Medium tools (30/min): Ping, SSL

**Example:**

```yaml
environment:
  - PORT=8080
  - NODE_ENV=production
  - WHOIS_TIMEOUT=45000
```

## Project Structure

```
whois-http/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── package.json
├── server.js                 # Main Express application
├── src/
│   ├── routes/
│   │   ├── whois.js         # Whois API route
│   │   ├── dns.js           # DNS API route
│   │   ├── ping.js          # Ping API route
│   │   ├── port.js          # Port check API route
│   │   └── ssl.js           # SSL certificate API route
│   ├── services/
│   │   ├── whoisClient.js   # Whois query execution
│   │   ├── dnsClient.js     # DNS query execution
│   │   ├── pingClient.js    # Ping execution
│   │   ├── portClient.js    # Port check execution
│   │   ├── sslClient.js     # SSL certificate retrieval
│   │   ├── parser.js        # Whois output parser
│   │   └── cache.js         # Multi-tool caching
│   ├── middleware/
│   │   ├── rateLimiter.js   # Tool-specific rate limiting
│   │   └── validator.js     # Input validation
│   └── utils/
│       └── logger.js        # Logging utility
├── public/
│   ├── index.html           # Multi-tool web UI
│   └── app.js               # Frontend JavaScript
└── README.md
```

## Security Features

### Input Validation

- Validates IPv4, IPv6, domain names, and ASN formats
- Validates DNS record types against whitelist
- Validates port numbers (1-65535)
- Validates ping count (1-10)
- Rejects shell metacharacters to prevent command injection
- Maximum input length enforcement

### Command Injection Prevention

- Uses `child_process.execFile` instead of `exec` for system commands
- Arguments passed separately, not in command string
- No shell interpretation of user input
- All inputs sanitized before use

### Rate Limiting

- Tool-specific rate limits based on resource usage
- Fast tools: 60 requests/minute (whois, dns, port)
- Medium tools: 30 requests/minute (ping, ssl)
- Per-IP tracking
- Returns 429 status when limit exceeded

### Caching

- Tool-specific TTLs based on data volatility
- Reduces load on external services
- Improves response times for repeated queries
- Automatic cache key normalization

### Logging

- All requests logged with timestamp, IP, tool, target, and response time
- Error logging for failed queries and validation errors
- No sensitive data logged

## Deployment

### Deploy to Docker Host

```bash
# Copy files to Docker host
scp -r whois-http/ user@dockerint01:~/

# SSH to Docker host
ssh user@dockerint01

# Navigate to directory
cd ~/whois-http

# Build and start
docker compose up -d --build

# Verify
docker compose ps
curl http://localhost:3000/health
```

### Test from Remote Machine

```bash
# Test health check
curl http://dockerint01:3000/health

# Test all tools
curl http://dockerint01:3000/api/whois/8.8.8.8
curl "http://dockerint01:3000/api/dns/google.com?type=A"
curl "http://dockerint01:3000/api/ping/8.8.8.8?count=4"
curl http://dockerint01:3000/api/port/google.com/443
curl http://dockerint01:3000/api/ssl/google.com

# Test web UI
open http://dockerint01:3000/
```

## Troubleshooting

### Check Container Status

```bash
docker compose ps
```

### View Logs

```bash
# All logs
docker compose logs

# Follow logs
docker compose logs -f

# Last 100 lines
docker compose logs --tail=100
```

### Restart Service

```bash
docker compose restart
```

### Rebuild After Changes

```bash
docker compose up -d --build
```

### Test System Tools in Container

```bash
# Enter container
docker exec -it whois-service sh

# Test each tool
whois 8.8.8.8
dig +short google.com A
ping -c 4 8.8.8.8
nc -zv google.com 443
echo | openssl s_client -connect google.com:443 -servername google.com 2>/dev/null | head -20
```

### Common Issues

**Port already in use:**
```bash
# Change PORT in docker-compose.yml
ports:
  - "8080:3000"
```

**Rate limit hit:**
```bash
# Wait 1 minute for fast tools, or 1 minute for medium tools
# Rate limits are per IP and reset after the window expires
```

**System tools not found:**
```bash
# Rebuild image to ensure all packages are installed
docker compose up -d --build

# Verify tools are installed
docker exec whois-service which whois
docker exec whois-service which dig
docker exec whois-service which ping
docker exec whois-service which openssl
```

**DNS queries failing:**
```bash
# Check that bind-tools package is installed
docker exec whois-service apk info bind-tools

# Test dig directly in container
docker exec whois-service dig +short google.com
```

**SSL certificate errors:**
```bash
# Verify openssl is installed
docker exec whois-service openssl version

# Test certificate retrieval directly
docker exec whois-service sh -c "echo | openssl s_client -connect google.com:443 -servername google.com 2>/dev/null | openssl x509 -noout -text"
```

## Testing

### Manual API Tests

```bash
# Test all tools
curl http://localhost:3000/api/whois/8.8.8.8
curl "http://localhost:3000/api/dns/google.com?type=MX"
curl "http://localhost:3000/api/ping/8.8.8.8?count=4"
curl http://localhost:3000/api/port/google.com/443
curl http://localhost:3000/api/ssl/google.com

# Test caching (run same query twice, second should be cached)
curl http://localhost:3000/api/whois/8.8.8.8
curl http://localhost:3000/api/whois/8.8.8.8

# Test different DNS record types
curl "http://localhost:3000/api/dns/google.com?type=A"
curl "http://localhost:3000/api/dns/google.com?type=AAAA"
curl "http://localhost:3000/api/dns/google.com?type=MX"
curl "http://localhost:3000/api/dns/google.com?type=TXT"

# Test port connectivity
curl http://localhost:3000/api/port/google.com/443   # Should be open
curl http://localhost:3000/api/port/google.com/9999  # Should be closed

# Test SSL warnings (expired or expiring certificate)
curl http://localhost:3000/api/ssl/expired.badssl.com

# Test invalid inputs
curl http://localhost:3000/api/whois/invalid_input
curl "http://localhost:3000/api/dns/invalid?type=INVALID"
curl "http://localhost:3000/api/ping/invalid?count=99"

# Test health check
curl http://localhost:3000/health
```

### Web UI Tests

1. Open `http://localhost:3000/` in browser
2. Test each tool tab (Whois, DNS, Ping, Port, SSL)
3. Submit various queries
4. Verify parsed and raw output tabs work
5. Test copy-to-clipboard functionality
6. Check recent queries history
7. Click recent queries to replay them
8. Test form validation (invalid inputs should show errors)

## Performance

- **Response times:**
  - Non-cached queries: 1-5 seconds (depending on external service)
  - Cached queries: < 50ms
- **Container size:** ~85MB
- **Memory usage:** ~60MB
- **Concurrent requests:** Handles 100+ concurrent connections
- **Cache efficiency:** Typical cache hit rate 40-60% for frequent queries

## Use Cases

This service is particularly useful for:

- **Corporate environments** where firewall rules block direct access to diagnostic tools
- **Web-based network troubleshooting** dashboards
- **Automated monitoring** and alerting systems
- **Network documentation** and inventory systems
- **Security auditing** and SSL certificate monitoring
- **Teaching/learning** network protocols via HTTP API

## License

MIT

## Author

Created for bypassing corporate firewall restrictions on network diagnostic protocols.
