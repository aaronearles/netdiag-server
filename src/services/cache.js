const NodeCache = require('node-cache');

const caches = {
  whois: new NodeCache({
    stdTTL: 3600,
    checkperiod: 720,
    useClones: false
  }),
  dns: new NodeCache({
    stdTTL: 300,
    checkperiod: 60,
    useClones: false
  }),
  ping: new NodeCache({
    stdTTL: 60,
    checkperiod: 12,
    useClones: false
  }),
  port: new NodeCache({
    stdTTL: 60,
    checkperiod: 12,
    useClones: false
  }),
  ssl: new NodeCache({
    stdTTL: 86400,
    checkperiod: 17280,
    useClones: false
  })
};

function normalizeKey(key) {
  return key.toLowerCase().trim();
}

function getCache(tool) {
  return caches[tool] || caches.whois;
}

function get(tool, key) {
  const cache = getCache(tool);
  const normalizedKey = normalizeKey(key);
  return cache.get(normalizedKey);
}

function set(tool, key, data) {
  const cache = getCache(tool);
  const normalizedKey = normalizeKey(key);
  return cache.set(normalizedKey, data);
}

function has(tool, key) {
  const cache = getCache(tool);
  const normalizedKey = normalizeKey(key);
  return cache.has(normalizedKey);
}

function getStats(tool) {
  if (tool) {
    const cache = getCache(tool);
    return cache.getStats();
  }

  const allStats = {};
  for (const [toolName, cache] of Object.entries(caches)) {
    allStats[toolName] = cache.getStats();
  }
  return allStats;
}

module.exports = {
  get,
  set,
  has,
  getStats,
  getCache
};
