const Redis = require('ioredis');
const env = require('./env');
const logger = require('../utils/logger');

let redis = null;

const getRedis = () => {
  if (redis) return redis;

  if (env.UPSTASH_REDIS_URL) {
    redis = new Redis(env.UPSTASH_REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 50, 2000),
      lazyConnect: true,
    });

    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', (err) => logger.error({ err }, 'Redis error'));

    return redis;
  }

  // Fallback: In-memory Map-based mock for development
  logger.warn('No Upstash Redis URL configured — using in-memory fallback');
  const store = new Map();
  return {
    get: async (key) => {
      const item = store.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        store.delete(key);
        return null;
      }
      return item.value;
    },
    set: async (key, value, ...args) => {
      const expiry = args[0] === 'EX' ? Date.now() + args[1] * 1000 : null;
      store.set(key, { value, expiry });
      return 'OK';
    },
    del: async (key) => {
      store.delete(key);
      return 1;
    },
    incr: async (key) => {
      const item = store.get(key);
      const val = item ? parseInt(item.value, 10) + 1 : 1;
      store.set(key, { value: String(val), expiry: item?.expiry || null });
      return val;
    },
    expire: async (key, seconds) => {
      const item = store.get(key);
      if (item) item.expiry = Date.now() + seconds * 1000;
      return 1;
    },
    flushall: async () => { store.clear(); return 'OK'; },
    keys: async (pattern) => {
      const prefix = pattern.replace('*', '');
      return [...store.keys()].filter(k => k.startsWith(prefix));
    },
  };
};

module.exports = { getRedis };
