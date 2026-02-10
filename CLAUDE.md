# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Network Diagnostic Toolkit - A Dockerized HTTP/JSON API service providing corporate firewall bypass for network diagnostic tools (whois, DNS, ping, port checks, SSL certificates). Runs on dockerint01 (Alpine Linux container) and is accessible from corporate desktops via HTTP.

**Current Status:** Backend complete (5 tools), web UI needs multi-tool interface update.

## Architecture

### Three-Layer Pattern

All diagnostic tools follow this consistent pattern:

```
Route Layer (src/routes/*.js)
├─ Input validation (middleware)
├─ Rate limiting (tool-specific)
├─ Cache check (tool-specific TTL)
└─ Service Layer (src/services/*Client.js)
   ├─ Execute system command (execFile/exec)
   ├─ Parse output
   └─ Return structured data
```

**Critical:** Always use `execFile` (not `exec`) for system commands to prevent command injection. Target is passed as separate argument array, never concatenated into command string.

### Tool-Specific Configurations

Each tool has distinct operational characteristics defined in middleware:

**Cache TTLs** (src/services/cache.js):
- whois: 1 hour (data rarely changes)
- dns: 5 minutes (balance between TTL respect and performance)
- ping: 1 minute (latency fluctuates)
- port: 1 minute (connectivity changes)
- ssl: 24 hours (certificates stable)

**Rate Limits** (src/middleware/rateLimiter.js):
- Fast (60/min): whois, dns, port
- Medium (30/min): ping, ssl

**Timeouts**:
- DNS: 5s
- Port: 5s
- Ping: (count × 2) + 5s
- SSL: 10s
- Whois: 30s

### Cache System Architecture

Multi-tool cache system in `src/services/cache.js`:
- Separate NodeCache instance per tool
- API: `cache.get(tool, key)` and `cache.set(tool, key, data)`
- **Important:** All route handlers must use tool prefix: `cache.get('dns', cacheKey)` not `cache.get(cacheKey)`
- Keys are normalized (lowercase, trimmed) automatically

### Security Model

**Input Validation** (src/middleware/validator.js):
- All inputs validated before reaching service layer
- Shell metacharacters rejected: `; | & $ ( ) < > \ ' "`
- Type-specific validation: IPv4/IPv6 (octets 0-255), domains (RFC compliance), ports (1-65535)
- **Never** pass user input directly to shell commands

**Command Execution**:
- Use `execFile(command, [args])` not `exec(command + args)`
- Example: `execFile('dig', ['+short', hostname, type])` ✓
- Never: `exec('dig +short ' + hostname + ' ' + type)` ✗

## Development Workflow

### Local Development

```bash
npm install              # Install dependencies
npm run dev             # Run with nodemon (auto-reload)
npm start               # Run in production mode
```

### Docker Development

```bash
docker compose up -d --build    # Build and start
docker compose logs -f          # Follow logs
docker compose down             # Stop and remove

# Verify system tools available in container
docker compose exec whois-service which dig
docker compose exec whois-service which ping
docker compose exec whois-service which openssl
```

### Testing New Tools

When adding a new diagnostic tool:

1. Create service client in `src/services/` (use execFile, implement parsing)
2. Create route handler in `src/routes/` (validation, caching, rate limiting)
3. Register route in `server.js`: `app.use('/api', newRoutes);`
4. Add cache config in `src/services/cache.js`
5. Add rate limiter in `src/middleware/rateLimiter.js`
6. Add validators in `src/middleware/validator.js`
7. Test: `curl "http://localhost:3000/api/newtool/target"`

### API Testing

```bash
# Test all tools
curl "http://localhost:3000/api/whois/8.8.8.8"
curl "http://localhost:3000/api/dns/google.com?type=MX"
curl "http://localhost:3000/api/ping/8.8.8.8?count=4"
curl "http://localhost:3000/api/port/google.com/443"
curl "http://localhost:3000/api/ssl/google.com"

# Health check
curl "http://localhost:3000/health"
```

## Deployment

### Build and Deploy

```bash
# On development machine
docker compose down
docker compose build --no-cache
docker compose up -d

# Verify tools in container
docker compose exec whois-service sh
/ # dig +short google.com
/ # ping -c 1 8.8.8.8
/ # echo | openssl s_client -connect google.com:443 -servername google.com 2>/dev/null | head -10
```

### Deploy to dockerint01

```bash
# From local machine
scp -r . aearles@dockerint01:~/whois-http/
ssh aearles@dockerint01

# On dockerint01
cd ~/whois-http
docker compose up -d --build
docker compose logs -f

# Test from corporate desktop
curl http://dockerint01:3000/health
curl http://dockerint01:3000/api/whois/8.8.8.8
```

## Key Implementation Details

### System Commands Used

All tools rely on Alpine Linux packages (installed in Dockerfile):
- **whois**: whois command
- **bind-tools**: dig command for DNS
- **iputils**: ping command for ICMP
- **openssl**: s_client for SSL certificates
- **netcat-openbsd**: nc for port checks (fallback, Node.js net module preferred)
- **bash**: shell for complex command pipelines

### Parsing Patterns

Each service implements tool-specific parsing:
- **DNS**: Parse `dig +short` output by record type (MX needs priority extraction)
- **Ping**: Regex parse for packet stats and RTT min/avg/max/stddev
- **SSL**: Parse openssl x509 text output for Subject, Issuer, Validity, SANs
- **Whois**: Key-value pair extraction from unstructured text

### Error Handling

All routes follow this pattern:
```javascript
try {
  // Check cache
  if (cachedData) return res.json({...cachedData, cached: true});

  // Execute tool
  const result = await toolClient.execute(params);
  if (!result.success) return res.status(500).json({success: false, error: ...});

  // Cache and return
  cache.set(tool, key, result);
  return res.json({...result, cached: false});
} catch (error) {
  logger.error('Unexpected error', {error, stack});
  return res.status(500).json({success: false, error: 'Internal server error'});
}
```

## Reference Documentation

- **PROGRESS.md**: Current implementation status, what's complete vs pending
- **todo.md**: Full implementation plan with detailed task breakdown
- **updated_spec.md**: Complete technical specification with API contracts
- **README.md**: User-facing documentation with usage examples

## Common Pitfalls

1. **Cache API Change**: Old code used `cache.get(key)`, new multi-tool cache requires `cache.get(tool, key)`
2. **Rate Limiter Import**: Import specific limiter: `const { dnsLimiter } = require('../middleware/rateLimiter')` not default export
3. **Command Injection**: Always use `execFile` with argument array, never string concatenation
4. **Timeout Configuration**: Each tool has different timeout requirements based on expected operation duration
5. **Docker Compose v2**: Use `docker compose` (space) not `docker-compose` (hyphen) - the v1 command is deprecated
