import { Hono, type Context } from "hono";
// import { FitnessCalculator } from "@aivo/compute";  // Temporarily disabled - WASM init issues
import { createDrizzleInstance } from "@aivo/db";
import type { D1Database } from "@cloudflare/workers-types";
import type { R2Bucket } from "@cloudflare/workers-types";
import type { KVNamespace } from "@cloudflare/workers-types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const MODULE_START_TIME = Date.now();

// Env type for health router (matches AppEnv in index.ts)
interface Env {
  AUTH_SECRET: string;
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  BODY_INSIGHTS_CACHE: KVNamespace;
  BIOMETRIC_CACHE: KVNamespace;
  LEADERBOARD_CACHE: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  OPENAI_API_KEY?: string;
}

export interface ServiceStatus {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency?: number;
  error?: string;
  details?: Record<string, unknown>;
}

export interface HealthResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  services: ServiceStatus[];
  database: {
    connected: boolean;
    latency?: number;
    tables?: string[];
  };
  caches: {
    bodyInsights: CacheDetails;
    biometric: CacheDetails;
    leaderboard: CacheDetails;
    rateLimit: CacheDetails;
  };
  storage: {
    connected: boolean;
    bucket?: string;
    objectCount?: number;
  };
  compute: {
    wasmLoaded: boolean;
    optimizerLoaded: boolean;
  };
  ai: {
    openaiConfigured: boolean;
    geminiConfigured: boolean;
  };
}

interface DatabaseDetails {
  connected: boolean;
  latency?: number;
  tables?: string[];
}

interface CacheDetails {
  connected: boolean;
  latency?: number;
}

interface StorageDetails {
  connected: boolean;
  bucket?: string;
}

const createHealthCheck = () => {
  return async (c: Context<{ Bindings: Env }>) => {
    const requestTime = Date.now();
    const services: ServiceStatus[] = [];

    // 1. Check API itself
    services.push({
      name: "api",
      status: "healthy",
      latency: Date.now() - requestTime,
    });

    // 2. Check Database
    try {
      const dbStart = Date.now();
      const drizzle = createDrizzleInstance(c.env.DB);
      await drizzle.query.users.findMany();
      const dbLatency = Date.now() - dbStart;

      // Get table list
      const tableRows = await c.env.DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any;
      const tableList = (Array.isArray(tableRows) ? tableRows : [])
        .map((row: any) => row.name)
        .filter((name: string) => !name.startsWith("sqlite_"));

      services.push({
        name: "database",
        status: "healthy",
        latency: dbLatency,
        details: { tables: tableList },
      });
    } catch (error) {
      services.push({
        name: "database",
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Database connection failed",
      });
    }

    // 3. Check Cache (KV) - all namespaces
    const caches: Record<string, CacheDetails> = {
      bodyInsights: { connected: false },
      biometric: { connected: false },
      leaderboard: { connected: false },
      rateLimit: { connected: false },
    };

    const checkCache = async (name: string, cache: KVNamespace): Promise<void> => {
      try {
        const start = Date.now();
        await cache.get("health-check", "text");
        const latency = Date.now() - start;
        caches[name] = { connected: true, latency };
      } catch (error) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _error = error;
        caches[name] = { connected: false };
      }
    };

    await checkCache("bodyInsights", c.env.BODY_INSIGHTS_CACHE);
    await checkCache("biometric", c.env.BIOMETRIC_CACHE);
    await checkCache("leaderboard", c.env.LEADERBOARD_CACHE);
    await checkCache("rateLimit", c.env.RATE_LIMIT_KV);

    services.push({
      name: "caches",
      status: Object.values(caches).every(c => c.connected) ? "healthy" : "degraded",
      details: caches,
    });

    // 4. Check Storage (R2)
    try {
      const storageStart = Date.now();
      const objects = await c.env.R2_BUCKET.list();
      const storageLatency = Date.now() - storageStart;

      services.push({
        name: "storage",
        status: "healthy",
        latency: storageLatency,
        details: {
          bucket: "aivo-images",
          objectCount: objects.objects.length,
        },
      });
    } catch (error) {
      services.push({
        name: "storage",
        status: "degraded",
        error: error instanceof Error ? error.message : "Storage check failed",
      });
    }

    // 5. Check AI Configuration
    const aiStatus = {
      openaiConfigured: !!c.env.OPENAI_API_KEY,
      geminiConfigured: !!process.env.GEMINI_API_KEY,
    };
    services.push({
      name: "ai-services",
      status: aiStatus.openaiConfigured ? "healthy" : "degraded",
      details: aiStatus,
    });

    // Calculate overall status
    const unhealthy = services.filter((s) => s.status === "unhealthy");
    const degraded = services.filter((s) => s.status === "degraded");
    const overallStatus: "healthy" | "degraded" | "unhealthy" =
      unhealthy.length > 0 ? "unhealthy" : degraded.length > 0 ? "degraded" : "healthy";

    const response: HealthResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      uptime: (Date.now() - MODULE_START_TIME) / 1000,
      services,
      database: ((services.find((s) => s.name === "database")?.details || { connected: false }) as any) as DatabaseDetails,
      caches: caches as any,
      storage: ((services.find((s) => s.name === "storage")?.details || { connected: false }) as any) as StorageDetails,
      compute: {
        wasmLoaded: false,
        optimizerLoaded: services.some((s) => s.name === "ai-optimizer" && s.status === "healthy"),
      },
      ai: aiStatus,
    };

    return c.json(response, overallStatus === "unhealthy" ? 503 : 200);
  };
};

export const HealthRouter = () => {
  const router = new Hono<{ Bindings: Env }>();

  router.get("/", async (c) => {
    const healthCheck = createHealthCheck();
    return healthCheck(c);
  });

  return router;
};
