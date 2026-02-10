// Field normalization mapping - maps RIR-specific fields to standardized names
const FIELD_MAPPINGS = {
  // Organization/Owner
  'OrgName': 'Organization',
  'org-name': 'Organization',
  'organisation': 'Organization',
  'owner': 'Organization',

  // IP Range
  'NetRange': 'IPRange',
  'inetnum': 'IPRange',
  'inet6num': 'IPRange',

  // CIDR
  'CIDR': 'CIDR',
  'route': 'CIDR',
  'route6': 'CIDR',

  // Network Name
  'NetName': 'NetworkName',
  'netname': 'NetworkName',

  // Network Type/Status
  'NetType': 'NetworkType',
  'status': 'NetworkType',

  // Country
  'Country': 'Country',
  'country': 'Country',

  // Registration Date
  'RegDate': 'RegistrationDate',
  'created': 'RegistrationDate',

  // Last Updated
  'Updated': 'LastUpdated',
  'last-modified': 'LastUpdated',
  'changed': 'LastUpdated',

  // Contacts
  'OrgTechHandle': 'TechContact',
  'tech-c': 'TechContact',
  'OrgAbuseHandle': 'AbuseContact',
  'abuse-c': 'AbuseContact',
  'abuse-mailbox': 'AbuseEmail',
  'OrgAbuseEmail': 'AbuseEmail',

  // Description
  'descr': 'Description',
  'NetHandle': 'Handle',
  'nic-hdl': 'Handle',
};

function parseWhoisOutput(rawOutput) {
  if (!rawOutput || typeof rawOutput !== 'string') {
    return {};
  }

  const lines = rawOutput.split('\n');
  const parsed = {};
  let currentKey = null;
  let currentValue = [];

  for (let line of lines) {
    line = line.trim();

    if (!line || line.startsWith('#') || line.startsWith('%')) {
      continue;
    }

    const colonIndex = line.indexOf(':');

    if (colonIndex > 0) {
      if (currentKey && currentValue.length > 0) {
        const value = currentValue.join(' ').trim();
        if (value) {
          parsed[currentKey] = value;
        }
      }

      currentKey = line.substring(0, colonIndex).trim();
      const value = line.substring(colonIndex + 1).trim();
      currentValue = value ? [value] : [];
    } else if (currentKey && line) {
      currentValue.push(line);
    }
  }

  if (currentKey && currentValue.length > 0) {
    const value = currentValue.join(' ').trim();
    if (value) {
      parsed[currentKey] = value;
    }
  }

  // Add normalized fields alongside original fields
  const normalized = {};
  for (const [originalKey, value] of Object.entries(parsed)) {
    // Keep original field
    normalized[originalKey] = value;

    // Add normalized version if mapping exists
    if (FIELD_MAPPINGS[originalKey]) {
      const standardKey = FIELD_MAPPINGS[originalKey];
      // Only set if not already present (first occurrence wins)
      if (!normalized[standardKey]) {
        normalized[standardKey] = value;
      }
    }
  }

  return normalized;
}

function filterFields(parsed, fields) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return parsed;
  }

  const filtered = {};

  // Create case-insensitive lookup map
  const parsedLower = {};
  for (const [key, value] of Object.entries(parsed)) {
    parsedLower[key.toLowerCase()] = { originalKey: key, value };
  }

  for (const field of fields) {
    const trimmedField = field.trim();
    const fieldLower = trimmedField.toLowerCase();

    // Try exact match first
    if (parsed.hasOwnProperty(trimmedField)) {
      filtered[trimmedField] = parsed[trimmedField];
    }
    // Try case-insensitive match
    else if (parsedLower[fieldLower]) {
      const { originalKey, value } = parsedLower[fieldLower];
      filtered[originalKey] = value;
    }
  }

  return filtered;
}

module.exports = {
  parseWhoisOutput,
  filterFields
};
