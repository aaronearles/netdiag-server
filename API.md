# NetDiag API Reference

Complete API documentation for the NetDiag network diagnostic tools service.

## Base URL

```
http://localhost:3000
```

Replace `localhost` with your server hostname (e.g., `dockerint01`) in production.

## Table of Contents

- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Caching](#caching)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Health Check](#health-check)
  - [Whois Lookup](#whois-lookup)
  - [Batch Whois Lookup](#batch-whois-lookup)
  - [DNS Lookup](#dns-lookup)
  - [Ping Test](#ping-test)
  - [Port Check](#port-check)
  - [SSL Certificate](#ssl-certificate)
- [Field Normalization](#field-normalization)
- [Response Formats](#response-formats)
- [Client Libraries](#client-libraries)

## Authentication

Currently, no authentication is required. The service is designed for internal network use.

## Rate Limiting

Different tools have different rate limits based on resource usage:

| Tool | Rate Limit | Window |
|------|------------|--------|
| Whois | 60 requests/minute | Per IP |
| DNS | 60 requests/minute | Per IP |
| Ping | 30 requests/minute | Per IP |
| Port | 60 requests/minute | Per IP |
| SSL | 30 requests/minute | Per IP |

When rate limit is exceeded, the API returns HTTP 429 with:

```json
{
  "error": "Too many requests, please try again later."
}
```

## Caching

Results are cached to improve performance and reduce load on external services:

| Tool | Cache TTL |
|------|-----------|
| Whois | 1 hour (3600s) |
| DNS | 5 minutes (300s) |
| Ping | 1 minute (60s) |
| Port | 1 minute (60s) |
| SSL | 24 hours (86400s) |

Cached responses include `"cached": true` in the response body.

## Error Handling

### Success Response

All successful responses include:

```json
{
  "success": true,
  ...
}
```

### Error Response

All error responses include:

```json
{
  "success": false,
  "error": "Error message description",
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

### HTTP Status Codes

| Status Code | Meaning | When Used |
|-------------|---------|-----------|
| 200 | OK | Request successful |
| 400 | Bad Request | Invalid input (malformed IP, domain, etc.) |
| 404 | Not Found | Endpoint doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error or external service failure |

## Endpoints

### Health Check

Check if the service is running and healthy.

**Endpoint:** `GET /health`

**Parameters:** None

**Response:**

```json
{
  "status": "ok",
  "uptime": 3600,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Example:**

```bash
curl http://localhost:3000/health
```

---

### Whois Lookup

Query whois information for an IP address, domain name, or ASN.

**Endpoint:** `GET /api/whois/:target`

**URL Parameters:**

- `target` (required) - IP address (IPv4/IPv6), domain name, or ASN

**Query Parameters:**

- `fields` (optional) - Comma-separated list of fields to return (e.g., `Organization,CIDR,Country`)

**Field Normalization:**

The API normalizes whois fields across different Regional Internet Registries (ARIN, APNIC, RIPE, LACNIC, AFRINIC). Standardized field names are added alongside original RIR-specific fields. See [Field Normalization](#field-normalization) for details.

**Supported Targets:**

- IPv4: `8.8.8.8`
- IPv6: `2001:4860:4860::8888`
- Domain: `google.com`
- ASN: `AS15169`

**Response:**

```json
{
  "success": true,
  "target": "8.8.8.8",
  "raw": "# ARIN WHOIS data...\n\nNetRange: 8.8.8.0 - 8.8.8.255\n...",
  "parsed": {
    "NetRange": "8.8.8.0 - 8.8.8.255",
    "IPRange": "8.8.8.0 - 8.8.8.255",
    "CIDR": "8.8.8.0/24",
    "NetName": "LVLT-GOGL-8-8-8",
    "NetworkName": "LVLT-GOGL-8-8-8",
    "Organization": "Google LLC (GOGL)",
    "Country": "US"
  },
  "cached": false,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Filtered Response (with `?fields=Organization,CIDR,Country`):**

```json
{
  "success": true,
  "target": "8.8.8.8",
  "raw": "# ARIN WHOIS data...",
  "parsed": {
    "Organization": "Google LLC (GOGL)",
    "CIDR": "8.8.8.0/24",
    "Country": "US"
  },
  "cached": false,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

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

# Filtered fields (case-insensitive)
curl "http://localhost:3000/api/whois/8.8.8.8?fields=Organization,CIDR,Country"
curl "http://localhost:3000/api/whois/8.8.8.8?fields=organization,cidr,country"
```

**Cache TTL:** 1 hour
**Rate Limit:** 60 requests/minute

---

### Batch Whois Lookup

Query whois information for multiple targets in a single request.

**Endpoint:** `POST /api/whois/batch`

**Request Body:**

```json
{
  "targets": ["8.8.8.8", "1.1.1.1", "google.com"]
}
```

**Optional Parameters:**

- `fields` (optional) - Array of fields to return for all results

```json
{
  "targets": ["8.8.8.8", "1.1.1.1"],
  "fields": ["Organization", "Country", "CIDR"]
}
```

**Response:**

Returns an array of results in the same order as the input targets.

```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "target": "8.8.8.8",
      "parsed": {
        "Organization": "Google LLC (GOGL)",
        "CIDR": "8.8.8.0/24",
        "Country": "US"
      },
      "cached": false
    },
    {
      "success": true,
      "target": "1.1.1.1",
      "parsed": {
        "Organization": "APNIC Research and Development",
        "CIDR": "1.1.1.0/24",
        "Country": "AU"
      },
      "cached": false
    }
  ],
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Error Handling:**

If individual targets fail, they are included in the results with `success: false`:

```json
{
  "success": true,
  "results": [
    {
      "success": true,
      "target": "8.8.8.8",
      "parsed": { ... }
    },
    {
      "success": false,
      "target": "invalid-ip",
      "error": "Invalid target format"
    }
  ],
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Limits:**

- Maximum 50 targets per batch request
- Each target counts toward rate limit individually
- Batch requests exceeding 50 targets return HTTP 400

**Examples:**

```bash
# Batch lookup
curl -X POST http://localhost:3000/api/whois/batch \
  -H "Content-Type: application/json" \
  -d '{"targets": ["8.8.8.8", "1.1.1.1", "google.com"]}'

# Batch with filtered fields
curl -X POST http://localhost:3000/api/whois/batch \
  -H "Content-Type: application/json" \
  -d '{"targets": ["8.8.8.8", "1.1.1.1"], "fields": ["Organization", "Country"]}'
```

**Cache TTL:** 1 hour (per target)
**Rate Limit:** 60 requests/minute (batch request counts as 1, but each target counts individually toward limit)

---

### DNS Lookup

Query DNS records for a hostname.

**Endpoint:** `GET /api/dns/:hostname`

**URL Parameters:**

- `hostname` (required) - Domain name to query

**Query Parameters:**

- `type` (optional) - DNS record type (default: `A`)
  - Supported: `A`, `AAAA`, `MX`, `TXT`, `NS`, `CNAME`, `SOA`, `ANY`

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

**Cache TTL:** 5 minutes
**Rate Limit:** 60 requests/minute

---

### Ping Test

Perform ICMP ping test with packet statistics.

**Endpoint:** `GET /api/ping/:target`

**URL Parameters:**

- `target` (required) - IP address or hostname

**Query Parameters:**

- `count` (optional) - Number of packets to send (1-10, default: 4)

**Response:**

```json
{
  "success": true,
  "target": "8.8.8.8",
  "packets_sent": 4,
  "packets_received": 4,
  "packet_loss_percent": 0,
  "time_ms": 3042,
  "rtt": {
    "min": 14.2,
    "avg": 15.1,
    "max": 16.8,
    "stddev": 1.2
  },
  "raw": "PING 8.8.8.8 (8.8.8.8): 56 data bytes\n...",
  "cached": false,
  "timestamp": "2026-02-10T10:00:00.000Z"
}
```

**Note:** If 100% packet loss occurs, `success` may be `false` but response is still returned with packet statistics.

**Examples:**

```bash
# Ping with default count (4)
curl http://localhost:3000/api/ping/8.8.8.8

# Ping with custom count
curl "http://localhost:3000/api/ping/google.com?count=10"
```

**Cache TTL:** 1 minute
**Rate Limit:** 30 requests/minute

---

### Port Check

Check TCP port connectivity.

**Endpoint:** `GET /api/port/:host/:port`

**URL Parameters:**

- `host` (required) - IP address or hostname
- `port` (required) - Port number (1-65535)

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

**Examples:**

```bash
# Check HTTPS port
curl http://localhost:3000/api/port/google.com/443

# Check SSH port
curl http://localhost:3000/api/port/8.8.8.8/22

# Check custom port
curl http://localhost:3000/api/port/example.com/8080
```

**Cache TTL:** 1 minute
**Rate Limit:** 60 requests/minute

---

### SSL Certificate

Retrieve and inspect SSL/TLS certificate information.

**Endpoint:** `GET /api/ssl/:hostname`

**URL Parameters:**

- `hostname` (required) - Server hostname

**Query Parameters:**

- `port` (optional) - Port number (default: 443)

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

**Examples:**

```bash
# Check HTTPS certificate
curl http://localhost:3000/api/ssl/google.com

# Check certificate on custom port
curl "http://localhost:3000/api/ssl/example.com?port=8443"
```

**Cache TTL:** 24 hours
**Rate Limit:** 30 requests/minute

---

## Field Normalization

The whois API normalizes field names across different Regional Internet Registries (RIRs) to provide a consistent interface. Both original and normalized field names are included in responses.

### Standardized Fields

| Standard Field | Description | ARIN Field | APNIC/RIPE Field |
|----------------|-------------|------------|------------------|
| `Organization` | Organization name | `OrgName` | `org-name`, `organisation` |
| `IPRange` | IP address range | `NetRange` | `inetnum`, `inet6num` |
| `CIDR` | CIDR notation | `CIDR` | `route`, `route6` |
| `NetworkName` | Network name | `NetName` | `netname` |
| `NetworkType` | Network type/status | `NetType` | `status` |
| `Country` | Country code | `Country` | `country` |
| `RegistrationDate` | Registration date | `RegDate` | `created` |
| `LastUpdated` | Last update date | `Updated` | `last-modified`, `changed` |
| `TechContact` | Technical contact | `OrgTechHandle` | `tech-c` |
| `AbuseContact` | Abuse contact handle | `OrgAbuseHandle` | `abuse-c` |
| `AbuseEmail` | Abuse email address | `OrgAbuseEmail` | `abuse-mailbox` |
| `Description` | Description | - | `descr` |
| `Handle` | Network handle | `NetHandle` | `nic-hdl` |

For complete mapping details, see [FIELDS.md](FIELDS.md).

### Case Insensitivity

Field filtering is case-insensitive:

```bash
# These all return the same results:
curl "http://localhost:3000/api/whois/8.8.8.8?fields=Organization,CIDR"
curl "http://localhost:3000/api/whois/8.8.8.8?fields=organization,cidr"
curl "http://localhost:3000/api/whois/8.8.8.8?fields=ORGANIZATION,CIDR"
```

## Response Formats

### Standard Response Structure

All API endpoints return JSON with a consistent structure:

```json
{
  "success": boolean,
  "...": "tool-specific fields",
  "cached": boolean,
  "timestamp": "ISO 8601 datetime"
}
```

### Common Fields

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request was successful |
| `cached` | boolean | Whether the result was served from cache |
| `timestamp` | string | ISO 8601 timestamp of the response |
| `error` | string | Error message (only present if `success: false`) |

### Raw Output

Most tools include a `raw` field containing the unprocessed output from the underlying command:

```json
{
  "raw": "Raw command output..."
}
```

This is useful for debugging or when you need access to unparsed data.

## Client Libraries

Official client libraries are available:

- **PowerShell**: [netdiag-powershell](https://github.com/aaronearles/netdiag-powershell)
- **Python**: [netdiag-python](https://github.com/aaronearles/netdiag-python) (coming soon)

### Example Usage (PowerShell)

```powershell
# Single whois lookup
netdiag whois -Target 8.8.8.8 -Fields Organization,Country

# Batch whois lookup (when implemented in client)
netdiag whois -Targets @('8.8.8.8', '1.1.1.1') -Fields Organization,Country
```

## Changelog

### Version 1.1.0 (2026-02-10)
- Added batch whois endpoint (`POST /api/whois/batch`)
- Added field normalization across RIRs
- Improved error handling and validation

### Version 1.0.0 (2026-02-09)
- Initial release
- Five diagnostic tools: whois, DNS, ping, port, SSL
- Caching and rate limiting
- Web UI
