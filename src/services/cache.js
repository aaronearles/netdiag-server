const NodeCache = require('node-cache');

const cacheTTL = parseInt(process.env.CACHE_TTL || '3600', 10);

const cache = new NodeCache({
  stdTTL: cacheTTL,
  checkperiod: cacheTTL * 0.2,
  useClones: false
});

function normalizeTarget(target) {
  return target.toLowerCase().trim();
}

function get(target) {
  const key = normalizeTarget(target);
  return cache.get(key);
}

function set(target, data) {
  const key = normalizeTarget(target);
  return cache.set(key, data);
}

function has(target) {
  const key = normalizeTarget(target);
  return cache.has(key);
}

function getStats() {
  return cache.getStats();
}

module.exports = {
  get,
  set,
  has,
  getStats
};
