# Whois HTTP Service - Implementation Specification

## Project Overview

Build a Dockerized web service that provides whois lookups via HTTP API and web UI. This service will run on a Docker host (dockerint01) that can access whois servers, bypassing corporate firewall restrictions that block the whois protocol.

## Objectives

- Create a REST API for whois queries accepting HTTP requests like `http://dockerint01:3000/api/whois/167.183.216.11`
- Provide a simple web UI accessible at `http://dockerint01:3000/`
- Support both raw whois output and parsed/filtered JSON responses
- Run as a lightweight Docker container
- Include caching and rate limiting for production use

## Technology Stack

**Backend:**
- Node.js 20 + Express
- System `whois` command (via child_process)
- Optional: node-cache for in-memory caching

**Frontend:**
- Simple HTML/CSS/JavaScript (no frameworks)
- Tailwind CSS via CDN for styling

**Container:**
- Alpine Linux base image
- System whois package installed

## Requirements

### Functional Requirements

1. **API Endpoints:**
   - `GET /api/whois/:target` - Full whois data for IP or domain
   - `GET /api/whois/:target?fields=field1,field2` - Filtered response with specific fields
   - `GET /health` - Health check endpoint
   - `GET /` - Web UI

2. **Input Support:**
   - IPv4 addresses (e.g., 167.183.216.11)
   - IPv6 addresses (e.g., 2001:4860:4860::8888)
   - Domain names (e.g., google.com)
   - ASN numbers (e.g., AS15169)

3. **Response Formats:**
   - Raw whois text output
   - Parsed JSON with structured data
   - Filtered JSON with requested fields only

4. **Web UI Features:**
   - Input form for IP/domain
   - Display both raw and parsed output
   - Copy-to-clipboard functionality
   - Recent queries history (localStorage)
   - Responsive design

### Non-Functional Requirements

1. **Performance:**
   - Response caching (1-hour TTL)
   - Concurrent request handling
   - Lightweight Docker image (<100MB)

2. **Security:**
   - Input validation and sanitization
   - Rate limiting (60 requests/minute per IP)
   - No command injection vulnerabilities
   - Request logging

3. **Reliability:**
   - Graceful error handling
   - Clear error messages
   - Health check endpoint
   - Proper logging to stdout/stderr

## API Specification

### GET /api/whois/:target

Returns complete whois information for the specified target.

**Parameters:**
- `:target` - IP address, domain name, or ASN

**Query Parameters:**
- `fields` (optional) - Comma-separated list of fields to return (e.g., `?fields=NetRange,Organization,Country`)

**Response (Full):**
```json
{
  "success": true,
  "target": "167.183.216.11",
  "raw": "# ARIN WHOIS data...\n\nNetRange: 167.183.0.0 - 167.183.255.255\n...",
  "parsed": {
    "NetRange": "167.183.0.0 - 167.183.255.255",
    "CIDR": "167.183.0.0/16",
    "NetName": "NORTHSIDEHOSP",
    "Organization": "Northside Hospital (NORTHS)",
    "Country": "US",
    "OrgName": "Northside Hospital",
    "Address": "1000 Johnson Ferry Road",
    "City": "Atlanta",
    "StateProv": "GA",
    "PostalCode": "30342"
  },
  "cached": false,
  "timestamp": "2026-02-09T15:30:00.000Z"
}
```

**Response (Filtered with ?fields=NetRange,Organization,Country):**
```json
{
  "success": true,
  "target": "167.183.216.11",
  "filtered": {
    "NetRange": "167.183.0.0 - 167.183.255.255",
    "Organization": "Northside Hospital (NORTHS)",
    "Country": "US"
  },
  "cached": false,
  "timestamp": "2026-02-09T15:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid IP address or domain",
  "timestamp": "2026-02-09T15:30:00.000Z"
}
```

### GET /health

Health check endpoint for monitoring.

**Response:**
```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-02-09T15:30:00.000Z"
}
```

## Project Structure

```
whois-service/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── package.json
├── server.js
├── src/
│   ├── routes/
│   │   └── whois.js
│   ├── services/
│   │   ├── whoisClient.js
│   │   ├── parser.js
│   │   └── cache.js
│   ├── middleware/
│   │   ├── rateLimiter.js
│   │   └── validator.js
│   └── utils/
│       └── logger.js
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── README.md
```

## Implementation Details

### 1. package.json

```json
{
  "name": "whois-service",
  "version": "1.0.0",
  "description": "HTTP service for whois lookups",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "node-cache": "^5.1.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

### 2. server.js

Main Express application with:
- Express server setup
- Middleware configuration (JSON parsing, rate limiting)
- Route mounting
- Static file serving
- Error handling
- Server startup on port 3000 (configurable via ENV)

### 3. src/services/whoisClient.js

Whois query service:
- Execute system `whois` command via `child_process.exec`
- Handle timeouts (30 second default)
- Return raw whois output
- Error handling for invalid targets or command failures

**Key function:**
```javascript
async function queryWhois(target) {
  // Execute: whois <target>
  // Return: { stdout, stderr, success }
}
```

### 4. src/services/parser.js

Parse whois output into structured JSON:
- Split output into lines
- Extract key-value pairs (e.g., "NetRange: 167.183.0.0 - 167.183.255.255")
- Handle multi-line values
- Return object with all parsed fields

**Common fields to extract:**
- IP whois: NetRange, CIDR, NetName, NetHandle, Organization, OrgName, Country, Address, City, StateProv, PostalCode, OrgAbuseEmail, OrgTechEmail
- Domain whois: Registrar, Creation Date, Expiration Date, Nameservers, Registrant info

### 5. src/services/cache.js

In-memory cache implementation:
- Use `node-cache` with 1-hour TTL
- Cache key: normalized target (lowercase, trimmed)
- Methods: get(target), set(target, data), has(target)

### 6. src/middleware/rateLimiter.js

Rate limiting middleware:
- Use `express-rate-limit`
- Limit: 60 requests per minute per IP
- Return 429 status when limit exceeded

### 7. src/middleware/validator.js

Input validation:
- Validate IPv4 addresses (regex: `^(\d{1,3}\.){3}\d{1,3}$`)
- Validate IPv6 addresses
- Validate domain names (basic regex for valid characters)
- Validate ASN format (AS followed by numbers)
- Sanitize input to prevent command injection
- Return 400 for invalid input

### 8. src/routes/whois.js

API route handlers:
- `GET /api/whois/:target` - Main whois endpoint
  - Check cache first
  - Validate input
  - Query whois
  - Parse response
  - Filter fields if requested
  - Cache result
  - Return JSON response
- Handle errors and return appropriate status codes

### 9. src/utils/logger.js

Simple logging utility:
- Log format: `[timestamp] [level] message`
- Log to stdout
- Include request logging (target, IP, timestamp, cached status)

### 10. public/index.html

Web UI with:
- Clean, modern design using Tailwind CSS
- Input form with:
  - Text input for IP/domain
  - Submit button
  - Clear button
- Results section with tabs:
  - Raw output (pre-formatted text)
  - Parsed data (formatted table)
- Copy-to-clipboard buttons
- Recent queries section (last 10 queries from localStorage)
- Dark mode toggle (optional)
- Responsive layout

### 11. public/app.js

Frontend JavaScript:
- Form submission handler (prevent default, fetch API)
- Display results in both raw and parsed formats
- Copy-to-clipboard functionality
- localStorage for recent queries
- Error handling and display

### 12. Dockerfile

```dockerfile
FROM node:20-alpine

# Install whois package
RUN apk add --no-cache whois

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

### 13. docker-compose.yml

```yaml
services:
  whois-service:
    build: .
    container_name: whois-service
    ports:
      - "3000:3000"
    environment:
      - PORT=3000
      - CACHE_TTL=3600
      - RATE_LIMIT_WINDOW=60000
      - RATE_LIMIT_MAX=60
      - NODE_ENV=production
    restart: unless-stopped
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 14. .dockerignore

```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
*.md
```

### 15. README.md

Documentation including:
- Project description
- Quick start guide
- API usage examples
- Docker deployment instructions
- Configuration options
- Troubleshooting

## Security Considerations

### Input Validation

1. **Whitelist approach:** Only allow valid IP, domain, and ASN formats
2. **Sanitization:** Remove any shell metacharacters or suspicious patterns
3. **Validation regex:**
   - IPv4: `^(\d{1,3}\.){3}\d{1,3}$` with additional validation (0-255 per octet)
   - Domain: `^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$`
   - ASN: `^AS\d+$`

### Command Injection Prevention

1. **Never use shell:** Use `child_process.execFile` instead of `exec`
2. **Argument array:** Pass target as separate argument, not in command string
3. **Validation:** Reject any input with shell metacharacters: `; | & $ ( ) < > \` ' "`

### Rate Limiting

1. **Per-IP limits:** 60 requests/minute
2. **Error handling:** Return 429 with Retry-After header
3. **Whitelist option:** Environment variable for trusted IPs (optional)

### Logging

1. **Access logs:** Timestamp, IP, target, cached status, response time
2. **Error logs:** Failed queries, validation errors, system errors
3. **No sensitive data:** Don't log full whois responses in access logs

## Testing Instructions

### Manual Testing

1. **Test IPv4:**
   ```bash
   curl http://dockerint01:3000/api/whois/8.8.8.8
   ```

2. **Test domain:**
   ```bash
   curl http://dockerint01:3000/api/whois/google.com
   ```

3. **Test filtered query:**
   ```bash
   curl "http://dockerint01:3000/api/whois/167.183.216.11?fields=NetRange,Organization,Country"
   ```

4. **Test caching:** Run same query twice, check `cached: true` on second request

5. **Test rate limiting:** Make 70 requests in quick succession, verify 429 response

6. **Test invalid input:**
   ```bash
   curl http://dockerint01:3000/api/whois/invalid_input
   # Should return 400 error
   ```

7. **Test health check:**
   ```bash
   curl http://dockerint01:3000/health
   ```

8. **Test web UI:** Open `http://dockerint01:3000/` in browser and test the form

## Deployment Instructions

1. **Clone/copy files to Docker host:**
   ```bash
   scp -r whois-service/ aearles@dockerint01:~/
   ```

2. **SSH to Docker host:**
   ```bash
   ssh aearles@dockerint01
   ```

3. **Build and run:**
   ```bash
   cd ~/whois-service
   docker compose up -d --build
   ```

4. **Verify:**
   ```bash
   docker compose ps
   docker compose logs -f
   curl http://localhost:3000/health
   ```

5. **Test from corporate desktop (WSL):**
   ```bash
   curl http://dockerint01:3000/api/whois/8.8.8.8
   ```

## Configuration Options

Environment variables (set in docker-compose.yml):

- `PORT` - Server port (default: 3000)
- `CACHE_TTL` - Cache time-to-live in seconds (default: 3600)
- `RATE_LIMIT_WINDOW` - Rate limit window in ms (default: 60000)
- `RATE_LIMIT_MAX` - Max requests per window (default: 60)
- `NODE_ENV` - Environment (production/development)
- `WHOIS_TIMEOUT` - Whois command timeout in ms (default: 30000)

## Future Enhancements

1. **Reverse DNS lookups** alongside whois
2. **Batch API** for multiple queries in one request
3. **Export functionality** (CSV, JSON download)
4. **Query history** stored in SQLite for persistence
5. **Authentication** (basic auth or API keys)
6. **Metrics endpoint** for monitoring (Prometheus format)
7. **Support for more RIRs** (RIPE, APNIC, etc.) with specific parsing

## Example Usage Scenarios

### Scenario 1: Quick IP lookup from corporate desktop

```bash
# From WSL on corporate desktop
curl http://dockerint01:3000/api/whois/1.1.1.1 | jq '.parsed.OrgName'
# Output: "Cloudflare, Inc."
```

### Scenario 2: Get specific fields for scripting

```bash
curl "http://dockerint01:3000/api/whois/8.8.8.8?fields=Organization,Country" | jq
# Output:
# {
#   "success": true,
#   "filtered": {
#     "Organization": "Google LLC",
#     "Country": "US"
#   }
# }
```

### Scenario 3: Web UI for non-technical users

1. Open browser to `http://dockerint01:3000/`
2. Enter IP or domain in form
3. Click "Lookup"
4. View formatted results
5. Click "Copy Raw" to copy to clipboard for documentation

## Success Criteria

- [ ] Docker container builds successfully
- [ ] Service starts and health check passes
- [ ] API returns correct whois data for IPs
- [ ] API returns correct whois data for domains
- [ ] Filtered queries work correctly
- [ ] Web UI loads and functions properly
- [ ] Caching reduces repeated query time
- [ ] Rate limiting prevents abuse
- [ ] Invalid input returns appropriate errors
- [ ] All queries are logged
- [ ] Service accessible from corporate desktop WSL

## Notes

- The corporate desktop cannot use whois protocol directly (blocked by firewall)
- The Docker host (dockerint01) can successfully run whois queries
- This service acts as an HTTP gateway to whois functionality
- Ensure no command injection vulnerabilities since this bypasses network security controls
- Consider adding basic authentication if service will be exposed beyond internal network