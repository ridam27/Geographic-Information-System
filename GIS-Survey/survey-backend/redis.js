// redis.js
// Centralized Redis client module.
// Exports: redisClient (for get/set/publish), redisSubClient (if you want to subscribe),
// and connectRedis() to establish connections at app startup.

const { createClient } = require('redis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Primary client used for GET / SET / PUBLISH etc.
const redisClient = createClient({ url: REDIS_URL });

// Optional sub client — used if you need to subscribe or for adapter duplication.
const redisSubClient = createClient({ url: REDIS_URL });

async function connectRedis() {
  try {
    // connect primary client
    await redisClient.connect();
    // connect sub client (not strictly necessary unless you subscribe locally)
    await redisSubClient.connect();
    console.log('✅ Redis clients connected');
  } catch (err) {
    console.warn('⚠️ Redis connect error:', err?.message || err);
    // Do not throw — we prefer app to continue running even if Redis is temporarily down.
  }
}

module.exports = {
  redisClient,
  redisSubClient,
  connectRedis
};
