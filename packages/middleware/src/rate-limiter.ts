/**
 * Rate Limiting Middleware
 * 
 * Provides in-memory and KV-based rate limiting.
 * Follows Open/Closed: can extend with new stores without modifying logic.
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Maximum requests per window */
  max: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Enable distributed rate limiting (requires KV) */
  useKV?: boolean;
  /** KV namespace for distributed rate limiting */
  kv?: KVNamespace;
  /** Key prefix for KV storage */
  keyPrefix?: string;
}

/**
 * Rate limit entry in store
 */
export interface RateLimitEntry {
  /** Request count in current window */
  count: number;
  /** Window reset timestamp */
  resetAt: number;
}

/**
 * Rate limit result
 */
export interface RateLimitResult {
  /** Whether request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Window reset timestamp (Unix seconds) */
  resetAt: number;
  /** Total requests allowed */
  limit: number;
}

/**
 * Rate limit store interface (Open/Closed principle)
 */
export interface RateLimitStore {
  get(key: string): RateLimitEntry | undefined;
  set(key: string, entry: RateLimitEntry): void;
  delete(key: string): void;
  clear(): void;
  size: number;
}

// =============================================================================
// In-Memory Store
// =============================================================================

/**
 * In-memory rate limit store
 * Suitable for single-instance deployments
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private maxSize = 10000;

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    
    // Check if expired
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    // Cleanup if at capacity
    if (this.store.size >= this.maxSize) {
      this.cleanup();
    }
    this.store.set(key, entry);
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  get size(): number {
    return this.store.size;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.resetAt) {
        this.store.delete(key);
      }
    }
    
    // If still at capacity, remove oldest entries
    if (this.store.size >= this.maxSize) {
      const entries = Array.from(this.store.entries());
      entries.sort((a, b) => a[1].resetAt - b[1].resetAt);
      const toRemove = entries.slice(0, Math.floor(this.maxSize * 0.1));
      for (const [key] of toRemove) {
        this.store.delete(key);
      }
    }
  }
}

// =============================================================================
// KV Store (Cloudflare Workers)
// =============================================================================

/**
 * Cloudflare KV rate limit store
 * Suitable for distributed deployments
 */
export class KVRateLimitStore implements RateLimitStore {
  constructor(
    private kv: KVNamespace,
    private keyPrefix: string = 'ratelimit:'
  ) {}

  async get(key: string): Promise<RateLimitEntry | undefined> {
    try {
      const data = await this.kv.getWithMetadata<RateLimitEntry>(this.keyPrefix + key);
      if (!data.metadata || Date.now() > data.metadata.resetAt) {
        return undefined;
      }
      return data.metadata;
    } catch {
      return undefined;
    }
  }

  async set(key: string, entry: RateLimitEntry): Promise<void> {
    const ttl = Math.ceil((entry.resetAt - Date.now()) / 1000);
    if (ttl > 0) {
      await this.kv.put(this.keyPrefix + key, JSON.stringify({ count: entry.count }), {
        expirationTtl: ttl,
        metadata: entry,
      });
    }
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(this.keyPrefix + key);
  }

  async clear(): Promise<void> {
    const list = await this.kv.list({ prefix: this.keyPrefix });
    await Promise.all(list.keys.map((k) => this.kv.delete(k.name)));
  }

  get size(): number {
    return -1; // Unknown for KV
  }
}

// =============================================================================
// Utilities
// =============================================================================

/**
 * Get rate limit key from request
 */
export function getRateLimitKey(
  request: Request,
  options: { userId?: string; includePath?: boolean } = {}
): string {
  // Prefer user ID if authenticated
  if (options.userId) {
    return `user:${options.userId}`;
  }
  
  // Fall back to IP address
  const ip = 
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Real-IP') ||
    request.headers.get('X-Forwarded-For')?.split(',')[0] ||
    'unknown';
  
  let key = `ip:${ip}`;
  
  // Optionally include path for per-endpoint rate limiting
  if (options.includePath) {
    const path = new URL(request.url).pathname;
    key += `:${path}`;
  }
  
  return key;
}

/**
 * Check rate limit for a key
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig,
  store: RateLimitStore
): RateLimitResult {
  const now = Date.now();
  let entry = store.get(key);
  
  // Start new window if needed
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs };
  }
  
  // Check limit
  if (entry.count >= config.max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: Math.ceil(entry.resetAt / 1000),
      limit: config.max,
    };
  }
  
  // Increment counter
  entry.count++;
  store.set(key, entry);
  
  return {
    allowed: true,
    remaining: config.max - entry.count,
    resetAt: Math.ceil(entry.resetAt / 1000),
    limit: config.max,
  };
}

/**
 * Parse rate limit config from environment
 */
export function parseRateLimitConfig(env: Record<string, string | undefined>): RateLimitConfig {
  return {
    max: parseInt(env.RATE_LIMIT_MAX || '100', 10),
    windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  };
}
