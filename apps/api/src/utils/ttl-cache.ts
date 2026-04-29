/**
 * In-memory TTL cache for frequently accessed data
 * Uses a Map with timestamp-based expiration
 *
 * Note: This cache is per Worker instance (not global across instances)
 * but still provides significant reduction in database load for hot data.
 */

export class TTLCache<K, V> {
  private cache: Map<K, { value: V; expiresAt: number }> = new Map();

  constructor(private defaultTtlMs: number = 60000) {}

  /**
   * Get value from cache if not expired
   */
  get(key: K): V | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.value;
  }

  /**
   * Set value in cache with optional TTL override
   */
  set(key: K, value: V, ttlMs?: number): void {
    const expiresAt = Date.now() + (ttlMs ?? this.defaultTtlMs);
    this.cache.set(key, { value, expiresAt });
  }

  /**
   * Delete specific key from cache
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * Remove expired entries (call periodically or manually)
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
      }
    }
  }
}

/**
 * Factory to create a cache with a specific TTL
 */
export function createCache<K, V>(ttlMs: number = 60000): TTLCache<K, V> {
  return new TTLCache<K, V>(ttlMs);
}
