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

  return parsed;
}

function filterFields(parsed, fields) {
  if (!fields || !Array.isArray(fields) || fields.length === 0) {
    return parsed;
  }

  const filtered = {};

  for (const field of fields) {
    const trimmedField = field.trim();
    if (parsed.hasOwnProperty(trimmedField)) {
      filtered[trimmedField] = parsed[trimmedField];
    }
  }

  return filtered;
}

module.exports = {
  parseWhoisOutput,
  filterFields
};
