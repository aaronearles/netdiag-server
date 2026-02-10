# Network Diagnostic Tools - Implementation TODO

## Phase 1: Infrastructure Updates
- [ ] Update Dockerfile to install new tools (bind-tools, iputils, openssl, netcat-openbsd, bash)
- [ ] Update cache.js to support multiple cache instances with different TTLs
- [ ] Update rateLimiter.js to support tool-specific rate limits
- [ ] Update validator.js with new validation functions (hostname, port, DNS type)

## Phase 2: DNS Lookup Implementation
- [ ] Create src/services/dnsClient.js
- [ ] Create src/routes/dns.js with GET /api/dns/:hostname endpoint
- [ ] Add DNS route to server.js
- [ ] Test DNS A records
- [ ] Test DNS AAAA records
- [ ] Test DNS MX records
- [ ] Test DNS TXT records
- [ ] Test DNS NS records
- [ ] Test DNS CNAME records
- [ ] Test DNS SOA records
- [ ] Test DNS ANY queries
- [ ] Test DNS caching
- [ ] Test DNS error handling

## Phase 3: Ping Implementation
- [ ] Create src/services/pingClient.js
- [ ] Create src/routes/ping.js with GET /api/ping/:target endpoint
- [ ] Add ping route to server.js
- [ ] Test ping with valid IPv4
- [ ] Test ping with hostname
- [ ] Test ping with custom count
- [ ] Test ping with unreachable host
- [ ] Test ping caching
- [ ] Test ping error handling

## Phase 4: Port Check Implementation
- [ ] Create src/services/portClient.js
- [ ] Create src/routes/port.js with GET /api/port/:host/:port endpoint
- [ ] Add port route to server.js
- [ ] Test open port (443 on google.com)
- [ ] Test closed port
- [ ] Test invalid port number
- [ ] Test timeout behavior
- [ ] Test port caching
- [ ] Test port error handling

## Phase 5: SSL Certificate Implementation
- [ ] Create src/services/sslClient.js
- [ ] Create src/routes/ssl.js with GET /api/ssl/:hostname endpoint
- [ ] Add SSL route to server.js
- [ ] Test valid certificate
- [ ] Test expired certificate
- [ ] Test self-signed certificate
- [ ] Test custom port
- [ ] Test certificate parsing (subject, issuer, validity)
- [ ] Test SAN (Subject Alternative Names)
- [ ] Test days remaining calculation
- [ ] Test SSL caching
- [ ] Test SSL error handling

## Phase 6: Web UI Updates
- [ ] Update public/index.html with multi-tool tabs
- [ ] Add DNS query form
- [ ] Add ping test form
- [ ] Add port check form
- [ ] Add SSL certificate form
- [ ] Update public/app.js with tab switching logic
- [ ] Add DNS result display handler
- [ ] Add ping result display handler
- [ ] Add port result display handler
- [ ] Add SSL result display handler
- [ ] Add loading states for all tools
- [ ] Add error handling for all tools
- [ ] Test UI for all tools in browser

## Phase 7: Documentation & Testing
- [ ] Update README.md with all new endpoints
- [ ] Add usage examples for all tools
- [ ] Add troubleshooting section for new tools
- [ ] Create comprehensive test script
- [ ] Test all tools from command line
- [ ] Test all tools from web UI
- [ ] Test rate limiting for each tool
- [ ] Test caching for each tool
- [ ] Verify Docker image size is reasonable
- [ ] Performance test with concurrent requests

## Phase 8: Deployment & Verification
- [ ] Rebuild Docker image with --no-cache
- [ ] Deploy to dockerint01
- [ ] Verify all system commands are available in container
- [ ] Test all tools from corporate desktop
- [ ] Monitor logs for errors
- [ ] Verify health check endpoint still works

## Implementation Order

We'll implement in this order:
1. Infrastructure (Phase 1) - Foundation for everything
2. DNS (Phase 2) - Simplest new tool, good starting point
3. Port Check (Phase 4) - Uses Node.js net module, no parsing needed
4. Ping (Phase 3) - Moderate complexity with output parsing
5. SSL (Phase 5) - Most complex with extensive parsing
6. Web UI (Phase 6) - After all APIs work
7. Documentation (Phase 7) - Document what we built
8. Deployment (Phase 8) - Final rollout

## Success Metrics
- All 5 tools (whois, dns, ping, port, ssl) working via API
- Web UI provides access to all tools
- Response times < 5 seconds for all tools
- Rate limiting prevents abuse
- Caching reduces duplicate queries
- Clear error messages for all failure cases
- Docker image < 150MB
- Service accessible from corporate desktop
