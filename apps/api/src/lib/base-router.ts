import { Hono, type Context } from "hono";
import type { D1Database } from "@cloudflare/workers-types";
import type { KVNamespace } from "@cloudflare/workers-types";
import { AUTH_USER_KEY } from "../utils/context-keys";
import { buildCacheKey, CACHE_PREFIX, CACHE_TTL, createCacheHelper } from "../lib/cache-service";
import { getDrizzleInstance } from "./drizzle-cache";
import type { AuthUser } from "../middleware/auth";
import { authenticate } from "../middleware/auth";

/**
 * Cache key prefixes type
 */
export type CachePrefix = keyof typeof CACHE_PREFIX;

/**
 * Base environment with common bindings
 */
export interface BaseEnv {
  DB: D1Database;
  QUERY_CACHE?: KVNamespace;
}

/**
 * Base Router class to reduce boilerplate across all route handlers
 * Provides common functionality:
 * - Optional authentication middleware
 * - Drizzle instance caching
 * - Cache helper creation
 * - Common utility methods
 */
export class BaseRouter<Env extends BaseEnv> {
  protected router: Hono<{ Bindings: Env }>;

  constructor(options: { requireAuth?: boolean } = { requireAuth: true }) {
    this.router = new Hono<{ Bindings: Env }>();
    if (options.requireAuth) {
      this.router.use("*", authenticate);
    }
  }

  /**
   * Get cached Drizzle instance using shared global cache
   */
  public getDrizzle(db: D1Database) {
    return getDrizzleInstance(db);
  }

  /**
   * Get cache helper if cache namespace is available
   */
  public getCacheHelper(c: Context<{ Bindings: Env }>) {
    const kv = c.env.QUERY_CACHE;
    return kv ? createCacheHelper(kv as any) : null;
  }

  /**
   * Get authenticated user from context
   */
  public getAuthUser(c: Context): AuthUser {
    const user = (c as any).get(AUTH_USER_KEY);
    if (!user) {
      throw new Error("Authentication required");
    }
    return user as AuthUser;
  }

  /**
   * Build cache key with proper namespacing
   */
  public buildCacheKey(prefix: CachePrefix, ...parts: (string | number | undefined)[]): string {
    return buildCacheKey(prefix, ...parts);
  }

  /**
   * Get cache TTL for a given resource type
   */
  public getCacheTtl(resourceType: keyof typeof CACHE_TTL) {
    return CACHE_TTL[resourceType];
  }

  /**
   * Get or fetch with cache-aside pattern
   * Only caches non-null results
   */
  public async withCache<T>(
    c: Context<{ Bindings: Env }>,
    cacheKey: string,
    fetchFn: () => Promise<T | null>,
    ttl: number = CACHE_TTL.USER_PROFILE
  ): Promise<T | null> {
    const cacheHelper = this.getCacheHelper(c);

    if (cacheHelper) {
      const cached = await cacheHelper.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }
    }

    const result = await fetchFn();

    if (result !== null && cacheHelper) {
      await cacheHelper.set(cacheKey, result, ttl);
    }

    return result;
  }

  /**
   * Get or fetch with cache-aside pattern, returning hit/miss status
   * Useful for setting cache headers
   */
  public async withCacheResult<T>(
    c: Context<{ Bindings: Env }>,
    cacheKey: string,
    fetchFn: () => Promise<T | null>,
    ttl: number = CACHE_TTL.USER_PROFILE
  ): Promise<{ data: T | null; hit: boolean }> {
    const cacheHelper = this.getCacheHelper(c);

    if (cacheHelper) {
      const cached = await cacheHelper.get<T>(cacheKey);
      if (cached !== null) {
        return { data: cached, hit: true };
      }
    }

    const result = await fetchFn();

    if (result !== null && cacheHelper) {
      await cacheHelper.set(cacheKey, result, ttl);
    }

    return { data: result, hit: false };
  }

  /**
   * Invalidate cache entry
   */
  public async invalidateCache(c: Context<{ Bindings: Env }>, cacheKey: string): Promise<void> {
    const cacheHelper = this.getCacheHelper(c);
    if (cacheHelper) {
      await cacheHelper.invalidate(cacheKey);
    }
  }

  /**
   * Get the underlying Hono router instance
   */
  public getRouter(): Hono<{ Bindings: Env }> {
    return this.router;
  }
}

/**
 * Helper to create a simple router without authentication
 * Useful for public endpoints
 */
export class PublicRouter<Env extends BaseEnv> {
  protected router: Hono<{ Bindings: Env }>;

  constructor() {
    this.router = new Hono<{ Bindings: Env }>();
  }

  public getRouter(): Hono<{ Bindings: Env }> {
    return this.router;
  }
}
