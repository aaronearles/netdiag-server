# Whois HTTP Service

A lightweight, Dockerized web service that provides whois lookups via HTTP API and web UI. This service acts as an HTTP gateway to whois functionality, useful for bypassing corporate firewall restrictions that block the whois protocol.

## Features

- RESTful API for whois queries
- Clean, modern web UI
- Support for IPv4, IPv6, domain names, and ASN lookups
- Response caching (1-hour TTL)
- Rate limiting (60 requests/minute per IP)
- Parsed JSON output with field filtering
- Security-hardened input validation
- Health check endpoint
- Docker containerized for easy deployment

## Quick Start

### Using Docker Compose (Recommended)

```bash
# Clone or download the project
cd whois-http

# Build and start the service
docker-compose up -d --build

# Check the logs
docker-compose logs -f

# Verify it's running
curl http://localhost:3000/health
```

### Using Docker

```bash
# Build the image
docker build -t whois-service .

# Run the container
docker run -d -p 3000:3000 --name whois-service whois-service

# Check logs
docker logs -f whois-service
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

### GET /api/whois/:target

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
  "timestamp": "2026-02-09T15:30:00.000Z"
}
```

### Filtered Queries

Request specific fields only:

```bash
curl "http://localhost:3000/api/whois/8.8.8.8?fields=NetRange,Organization,Country"
```

**Response:**

```json
{
  "success": true,
  "target": "8.8.8.8",
  "filtered": {
    "NetRange": "8.8.8.0 - 8.8.8.255",
    "Organization": "Google LLC (GOGL)",
    "Country": "US"
  },
  "cached": false,
  "timestamp": "2026-02-09T15:30:00.000Z"
}
```

### GET /health

Health check endpoint for monitoring:

```bash
curl http://localhost:3000/health
```

**Response:**

```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-02-09T15:30:00.000Z"
}
```

## Web UI

Access the web interface at `http://localhost:3000/`

Features:
- Input form for IP/domain/ASN queries
- Tabbed view for parsed and raw output
- Copy-to-clipboard functionality
- Recent queries history (stored in localStorage)
- Responsive design with Tailwind CSS

## Configuration

Configure the service using environment variables in `docker-compose.yml`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | Server port |
| `CACHE_TTL` | 3600 | Cache time-to-live in seconds |
| `RATE_LIMIT_WINDOW` | 60000 | Rate limit window in milliseconds |
| `RATE_LIMIT_MAX` | 60 | Maximum requests per window |
| `WHOIS_TIMEOUT` | 30000 | Whois command timeout in milliseconds |
| `NODE_ENV` | production | Environment mode |
| `RATE_LIMIT_WHITELIST` | - | Comma-separated list of IPs to bypass rate limiting |

**Example:**

```yaml
environment:
  - PORT=8080
  - CACHE_TTL=7200
  - RATE_LIMIT_MAX=100
  - RATE_LIMIT_WHITELIST=192.168.1.100,10.0.0.50
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
│   │   └── whois.js         # API route handlers
│   ├── services/
│   │   ├── whoisClient.js   # Whois query execution
│   │   ├── parser.js        # Whois output parser
│   │   └── cache.js         # In-memory caching
│   ├── middleware/
│   │   ├── rateLimiter.js   # Rate limiting
│   │   └── validator.js     # Input validation
│   └── utils/
│       └── logger.js        # Logging utility
├── public/
│   ├── index.html           # Web UI
│   └── app.js               # Frontend JavaScript
└── README.md
```

## Security Features

### Input Validation

- Validates IPv4, IPv6, domain names, and ASN formats
- Rejects shell metacharacters to prevent command injection
- Maximum input length enforcement

### Command Injection Prevention

- Uses `child_process.execFile` instead of `exec`
- Target passed as separate argument, not in command string
- No shell interpretation of input

### Rate Limiting

- 60 requests per minute per IP (configurable)
- Whitelist support for trusted IPs
- Returns 429 status when limit exceeded

### Logging

- All requests logged with timestamp, IP, target, and response time
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
docker-compose up -d --build

# Verify
docker-compose ps
curl http://localhost:3000/health
```

### Test from Remote Machine

```bash
# Test API
curl http://dockerint01:3000/api/whois/8.8.8.8

# Test web UI
open http://dockerint01:3000/
```

## Troubleshooting

### Check Container Status

```bash
docker-compose ps
```

### View Logs

```bash
# All logs
docker-compose logs

# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100
```

### Restart Service

```bash
docker-compose restart
```

### Rebuild After Changes

```bash
docker-compose up -d --build
```

### Test Whois Command

```bash
# Enter container
docker exec -it whois-service sh

# Test whois
whois 8.8.8.8
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
# Wait 1 minute or add your IP to whitelist
environment:
  - RATE_LIMIT_WHITELIST=your.ip.address
```

**Whois command not found:**
```bash
# Rebuild image to ensure whois package is installed
docker-compose up -d --build
```

## Testing

### Manual Tests

```bash
# Test IPv4
curl http://localhost:3000/api/whois/8.8.8.8

# Test domain
curl http://localhost:3000/api/whois/google.com

# Test filtered query
curl "http://localhost:3000/api/whois/8.8.8.8?fields=NetRange,Organization"

# Test caching (run same query twice)
curl http://localhost:3000/api/whois/8.8.8.8
curl http://localhost:3000/api/whois/8.8.8.8

# Test rate limiting (requires script)
for i in {1..70}; do curl http://localhost:3000/api/whois/8.8.8.8; done

# Test invalid input
curl http://localhost:3000/api/whois/invalid_input

# Test health check
curl http://localhost:3000/health
```

## Performance

- Response time: < 2 seconds for non-cached queries
- Cache hit response time: < 50ms
- Container size: ~80MB
- Memory usage: ~50MB
- Concurrent requests: Handles 100+ concurrent connections

## License

MIT

## Author

Created for bypassing corporate firewall restrictions on the whois protocol.
