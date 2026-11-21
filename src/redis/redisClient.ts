import Redis from 'ioredis';
import { config } from '../config';

export const redis = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    lazyConnect: true,
    enableOfflineQueue: false, // Fail fast rather than hanging when Redis is offline
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
        if (times > 2) {
            return null; // Stop reconnecting after 2 attempts if Redis isn't up
        }
        return 2000;
    },
});

let warned = false;
redis.on('connect', () => {
    warned = false;
    console.log('[Redis] Connected successfully');
});

redis.on('error', (err) => {
    if (!warned) {
        console.warn(`[Redis] Redis not reachable at ${config.redis.host}:${config.redis.port} (${err.message}). In-memory fallback enabled.`);
        warned = true;
    }
});