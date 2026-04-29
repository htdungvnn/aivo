/**
 * Cache service for KV-based caching with cache-aside pattern.
 * Handles caching of database query results with automatic TTL expiration.
 */

// TTL configurations (in seconds)
export const CACHE_TTL = {
  // User profile data - updates infrequently
  USER_PROFILE: 300, // 5 minutes

  // Workout data - changes with each new workout
  WORKOUTS: 120, // 2 minutes

  // Conversation history - time-sensitive
  CONVERSATION_HISTORY: 60, // 1 minute

  // AI models - static configuration
  AI_MODELS: 3600, // 1 hour

  // Body insights and biometrics
  BODY_INSIGHTS: 300, // 5 minutes

  // Export data (various freshness requirements)
  EXPORT_SUMMARY: 300, // 5 minutes
  EXPORT_DETAILED: 600, // 10 minutes

  // Leaderboards - updated periodically
  LEADERBOARD: 300, // 5 minutes
} as const;

// Cache key prefixes to avoid collisions
export const CACHE_PREFIX = {
  USER_PROFILE: "user:profile:",
  WORKOUTS: "user:workouts:",
  CONVERSATION_HISTORY: "user:history:",
  AI_MODELS: "ai:models",
  BODY_INSIGHTS: "user:insights:",
  EXPORT: "export:",
  LEADERBOARD: "leaderboard:",
} as const;

/**
 * Generate a cache key with proper namespacing
 */
export function buildCacheKey(prefix: keyof typeof CACHE_PREFIX, ...parts: (string | number | undefined)[]): string {
  const filtered = parts.filter(p => p !== undefined).join(":");
  return `${CACHE_PREFIX[prefix]}${filtered}`;
}

/**
 * Get cached value from KV
 */
export async function getCached<T>(
  kv: KVNamespace,
  key: string
): Promise<T | null> {
  try {
    const cached = await kv.get<T>(key, { type: "json" });
    return cached ?? null;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Cache get error:", error);
    return null;
  }
}

/**
 * Set value in cache with TTL
 */
export async function setCached(
  kv: KVNamespace,
  key: string,
  value: unknown,
  ttl: number
): Promise<void> {
  try {
    const expiration = Math.floor(Date.now() / 1000) + ttl;
    await kv.put(key, JSON.stringify(value), { expiration });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Cache set error:", error);
  }
}

/**
 * Invalidate a single cache entry
 */
export async function invalidateCache(
  kv: KVNamespace,
  key: string
): Promise<void> {
  try {
    await kv.delete(key);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Cache invalidation error:", error);
  }
}

/**
 * Invalidate all cache entries matching a pattern (prefix)
 * Note: KV doesn't support pattern deletion natively, so we need to list keys.
 * For efficiency, keep track of keys in a separate index if needed.
 */
export async function invalidatePattern(
  kv: KVNamespace,
  prefix: string
): Promise<void> {
  try {
    // For now, we'll just note that pattern invalidation requires maintaining a key index.
    // In practice, we'll use specific key invalidation based on user IDs and resource types.
    // eslint-disable-next-line no-console
    console.warn(`Pattern invalidation for prefix "${prefix}" not implemented - use specific keys`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Cache pattern invalidation error:", error);
  }
}

/**
 * Cache-aside pattern helper: Get from cache or fetch and cache
 */
export async function cachedFetch<T>(
  kv: KVNamespace,
  key: string,
  fetchFn: () => Promise<T>,
  ttl: number
): Promise<T> {
  // Try cache first
  const cached = await getCached<T>(kv, key);
  if (cached !== null) {
    return cached;
  }

  // Cache miss - fetch from source
  const data = await fetchFn();

  // Cache the result (even if null/empty to avoid thundering herd)
  await setCached(kv, key, data, ttl);

  return data;
}

/**
 * Create a cache-bound function for a specific user/resource
 * Returns an object with get, set, invalidate methods bound to a cache namespace
 */
export function createCacheHelper(kv: KVNamespace) {
  return {
    get: <T = unknown>(key: string) => getCached<T>(kv, key),
    set: <T = unknown>(key: string, value: T, ttl: number) => setCached(kv, key, value, ttl),
    invalidate: (key: string) => invalidateCache(kv, key),
    invalidatePattern: (prefix: string) => invalidatePattern(kv, prefix),
  };
}
