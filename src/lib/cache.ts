import { Redis } from "@upstash/redis";

// Abstracted cache with in-memory fallback so the app works locally without Redis.
// Upstash Redis REST is used in production (works on serverless edges like Railway).

type CacheLike = {
  get<T = unknown>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
};

function createInMemoryCache(): CacheLike {
  const store = new Map<string, { value: unknown; expiresAt: number | null }>();
  return {
    async get<T = unknown>(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        store.delete(key);
        return null;
      }
      return entry.value as T;
    },
    async set(key, value, ttlSeconds) {
      const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
      store.set(key, { value, expiresAt });
    },
  };
}

function createUpstashCache(url: string, token: string): CacheLike {
  const redis = new Redis({ url, token });
  return {
    async get<T = unknown>(key: string) {
      try {
        const raw = await redis.get<T>(key);
        return raw ?? null;
      } catch (err) {
        console.warn("[cache] upstash get failed", err);
        return null;
      }
    },
    async set(key, value, ttlSeconds) {
      try {
        if (ttlSeconds) await redis.set(key, value, { ex: ttlSeconds });
        else await redis.set(key, value);
      } catch (err) {
        console.warn("[cache] upstash set failed", err);
      }
    },
  };
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const cache: CacheLike =
  url && token ? createUpstashCache(url, token) : createInMemoryCache();

export const CACHE_TTL_24H = 86400;
