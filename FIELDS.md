# Whois Field Normalization

The NetDiag API normalizes whois field names to provide a consistent interface regardless of which Regional Internet Registry (RIR) returns the data.

## Standardized Field Names

The following standardized field names are available across all RIRs:

| Standard Field | Description | ARIN Field | APNIC/RIPE Field |
|----------------|-------------|------------|------------------|
| `Organization` | Organization name | `OrgName`, `Organisation` | `org-name`, `organisation` |
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

## How It Works

1. **Original Fields Preserved**: The API response includes all original field names from the RIR
2. **Normalized Fields Added**: Standardized field names are added alongside original fields
3. **Case-Insensitive Filtering**: The `fields` query parameter is case-insensitive

## Examples

### Query ARIN IP (8.8.8.8)

```bash
# Without filtering - returns all fields (original + normalized)
curl "http://localhost:3000/api/whois/8.8.8.8"
```

Response includes both:
```json
{
  "OrgName": "Google LLC",      // Original ARIN field
  "Organization": "Google LLC", // Normalized field
  "NetRange": "8.8.8.0 - 8.8.8.255",
  "IPRange": "8.8.8.0 - 8.8.8.255",
  "CIDR": "8.8.8.0/24",
  ...
}
```

### Query APNIC IP (1.1.1.1)

```bash
curl "http://localhost:3000/api/whois/1.1.1.1"
```

Response includes both:
```json
{
  "org-name": "APNIC Research and Development",  // Original APNIC field
  "Organization": "APNIC Research and Development", // Normalized field
  "inetnum": "1.1.1.0 - 1.1.1.255",
  "IPRange": "1.1.1.0 - 1.1.1.255",
  "route": "1.1.1.0/24",
  "CIDR": "1.1.1.0/24",
  ...
}
```

### Filtering with Standardized Fields

**Using standardized names works for ANY RIR:**

```bash
# Works for both ARIN and APNIC!
curl "http://localhost:3000/api/whois/8.8.8.8?fields=Organization,CIDR,Country"
curl "http://localhost:3000/api/whois/1.1.1.1?fields=Organization,CIDR,Country"
```

**Case doesn't matter:**

```bash
curl "http://localhost:3000/api/whois/8.8.8.8?fields=organization,cidr,country"
curl "http://localhost:3000/api/whois/8.8.8.8?fields=ORGANIZATION,CIDR,COUNTRY"
```

**Original field names still work:**

```bash
# ARIN-specific field names
curl "http://localhost:3000/api/whois/8.8.8.8?fields=OrgName,NetRange"

# APNIC-specific field names
curl "http://localhost:3000/api/whois/1.1.1.1?fields=org-name,inetnum"
```

## PowerShell Client Usage

The PowerShell client benefits from standardized fields:

```powershell
# Works consistently for any IP!
netdiag whois -Target 8.8.8.8 -Fields Organization,CIDR,Country
netdiag whois -Target 1.1.1.1 -Fields Organization,CIDR,Country

# Access normalized fields in PowerShell
$result = netdiag whois -Target 8.8.8.8
$result.Parsed.Organization  # "Google LLC"
$result.Parsed.CIDR          # "8.8.8.0/24"
```

## Benefits

1. **Consistent API**: Same field names work regardless of RIR
2. **Backwards Compatible**: Original field names still available
3. **Case-Insensitive**: Filtering is forgiving
4. **Documentation**: Clear mapping between RIR-specific and standard names
5. **Client-Friendly**: Clients don't need RIR-specific logic

## Regional Internet Registries

Different RIRs manage IP addresses for different regions:

- **ARIN** - North America (e.g., 8.8.8.8)
- **APNIC** - Asia-Pacific (e.g., 1.1.1.1)
- **RIPE NCC** - Europe, Middle East (e.g., 8.8.4.4)
- **LACNIC** - Latin America
- **AFRINIC** - Africa

Each uses slightly different field naming conventions, which this normalization handles transparently.
