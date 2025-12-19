const Redis = require('ioredis');

// Default to localhost:6379 or use ENV
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
    // Retry strategy: keep trying to reconnect
    retryStrategy: function (times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    },
    // Don't crash if connection fails initially (optional, but good for stability if Redis is down)
    lazyConnect: true
});

redis.on('connect', () => {
    console.log('✅ Connected to Redis');
});

redis.on('error', (err) => {
    // Suppress heavy logs if just offline
    if (err.code === 'ECONNREFUSED') {
        console.warn('⚠️ Redis Connection Failed (Caching disabled)');
    } else {
        console.error('❌ Redis Error:', err.message);
    }
});

module.exports = redis;
