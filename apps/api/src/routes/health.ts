import { Hono, type Context } from "hono";
// import { FitnessCalculator } from "@aivo/compute";  // Temporarily disabled - WASM init issues
import { createDrizzleInstance } from "@aivo/db";
import type { D1Database } from "@cloudflare/workers-types";
import type { R2Bucket } from "@cloudflare/workers-types";
import type { KVNamespace } from "@cloudflare/workers-types";

const MODULE_START_TIME = Date.now();

// Env type for health router (matches AppEnv in index.ts)
interface Env {
  AUTH_SECRET: string;
  DB: D1Database;
  R2_BUCKET: R2Bucket;
  BODY_INSIGHTS_CACHE: KVNamespace;
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
  cache: {
    connected: boolean;
    latency?: number;
  };
  storage: {
    connected: boolean;
    bucket?: string;
  };
  compute: {
    wasmLoaded: boolean;
    optimizerLoaded: boolean;
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

// Type for D1 exec result
interface D1ExecResult {
  results: Array<{ name: string }>;
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

    // 3. Check Cache (KV)
    try {
      const cacheStart = Date.now();
      await c.env.BODY_INSIGHTS_CACHE.get("health-check", "text");
      const cacheLatency = Date.now() - cacheStart;

      services.push({
        name: "cache",
        status: "healthy",
        latency: cacheLatency,
        details: { type: "Cloudflare KV" },
      });
    } catch (error) {
      services.push({
        name: "cache",
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Cache connection failed",
      });
    }

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

    // 5. Check WASM Compute (temporarily disabled)
    // try {
    //   const wasmStart = Date.now();
    //   const bmi = FitnessCalculator.calculateBMI(70, 1.75);
    //   const wasmLatency = Date.now() - wasmStart;
    //
    //   services.push({
    //     name: "wasm-compute",
    //     status: "healthy",
    //     latency: wasmLatency,
    //     details: {
    //       module: "@aivo/compute",
    //       testResult: { bmi: bmi },
    //     },
    //   });
    // } catch (error) {
    //   services.push({
    //     name: "wasm-compute",
    //     status: "unhealthy",
    //     error: error instanceof Error ? error.message : "WASM module failed",
    //   });
    // }

    // 6. Check AI Optimizer (temporarily disabled)
    // try {
    //   const { optimize_content_wasm } = await import("@aivo/optimizer");
    //   const testText = "This is a test message for optimizer validation.";
    //   const result = optimize_content_wasm(testText, "");
    //
    //   if (result && typeof result === "string") {
    //     services.push({
    //       name: "ai-optimizer",
    //       status: "healthy",
    //       details: {
    //         module: "@aivo/optimizer",
    //         features: ["token-optimization", "semantic-pruning"],
    //       },
    //     });
    //   } else {
    //     services.push({
    //       name: "ai-optimizer",
    //       status: "degraded",
    //       details: { issue: "Optimization returned unexpected result" },
    //     });
    //   }
    // } catch (error) {
    //   services.push({
    //     name: "ai-optimizer",
    //     status: "unhealthy",
    //     error: error instanceof Error ? error.message : "Optimizer initialization failed",
    //   });
    // }

    // 7. Check AI Configuration (OpenAI)
    if (c.env.OPENAI_API_KEY) {
      services.push({
        name: "ai-service",
        status: "healthy",
        details: {
          provider: "OpenAI",
          model: "gpt-4o-mini (configured)",
        },
      });
    } else {
      services.push({
        name: "ai-service",
        status: "degraded",
        details: { issue: "OpenAI API key not configured" },
      });
    }

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
      cache: ((services.find((s) => s.name === "cache")?.details || { connected: false }) as any) as CacheDetails,
      storage: ((services.find((s) => s.name === "storage")?.details || { connected: false }) as any) as StorageDetails,
      compute: {
        wasmLoaded: false, // Temporarily disabled
        optimizerLoaded: services.some((s) => s.name === "ai-optimizer" && s.status === "healthy"),
      },
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
