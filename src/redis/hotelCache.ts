import { redis } from './redisClient';
import { DeduplicatedHotel } from '../types';

const CACHE_TTL_SECONDS = 600; // 10 minutes

// In-memory fallback for local dev when Redis daemon is not running
const memoryCache = new Map<string, DeduplicatedHotel[]>();

function getCityKey(city: string): string {
    return `hotels:city:${city.toLowerCase()}`;
}

/**
 * Saves deduplicated hotels into a Redis Sorted Set with price as the score.
 */
export async function saveHotelsToRedis(city: string, hotels: DeduplicatedHotel[]): Promise<void> {
    const key = getCityKey(city);

    // Keep memory fallback updated
    memoryCache.set(key, hotels);

    if (redis.status === 'ready') {
        try {
            const pipeline = redis.pipeline();
            pipeline.del(key);
            for (const hotel of hotels) {
                pipeline.zadd(key, hotel.price, JSON.stringify(hotel));
            }
            pipeline.expire(key, CACHE_TTL_SECONDS);
            await pipeline.exec();
        } catch (err: any) {
            console.warn('[Redis] Cache write warning:', err.message);
        }
    }
}

/**
 * Retrieves hotels filtered by price range directly INSIDE Redis using ZRANGEBYSCORE.
 */
export async function getHotelsFromRedis(
    city: string,
    minPrice?: number,
    maxPrice?: number
): Promise<DeduplicatedHotel[] | null> {
    const key = getCityKey(city);

    // When Redis is connected and ready, perform native ZRANGEBYSCORE
    if (redis.status === 'ready') {
        try {
            const exists = await redis.exists(key);
            if (exists) {
                const min = minPrice !== undefined ? minPrice : '-inf';
                const max = maxPrice !== undefined ? maxPrice : '+inf';
                const rawResults = await redis.zrangebyscore(key, min, max);
                return rawResults.map((item) => JSON.parse(item) as DeduplicatedHotel);
            }
            return null; // Cache miss in Redis
        } catch (err: any) {
            console.warn('[Redis] Cache read warning:', err.message);
        }
    }

    // In-memory fallback if Redis is not currently running
    if (memoryCache.has(key)) {
        let list = memoryCache.get(key) || [];
        if (minPrice !== undefined) list = list.filter(h => h.price >= minPrice);
        if (maxPrice !== undefined) list = list.filter(h => h.price <= maxPrice);
        return list;
    }

    return null; // Cache miss
}