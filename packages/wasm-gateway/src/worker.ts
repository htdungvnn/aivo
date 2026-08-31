/**
 * WASM Gateway - Cloudflare Worker Entry Point
 * 
 * Provides a Workers-compatible WASM execution environment
 * with automatic fallback to TypeScript implementation.
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { etag } from 'hono/etag';
import { secureHeaders } from 'hono/secure-headers';
import type { WASMEngineConfig, WASMInput, WASMOutput } from '@repo/fitness-types';
import { WASMGateway, isWASMSupported } from './index.js';

// =============================================================================
// Environment Types
// =============================================================================

export interface WASMGatewayEnv {
  // WASM module URL
  WASM_MODULE_URL: string;
  
  // Feature flags
  ENABLE_BENCHMARK: string;
  ENABLE_METRICS: string;
  
  // KV for module caching
  WASM_CACHE_KV?: KVNamespace;
  
  // Memory limit (pages)
  MEMORY_PAGES: string;
}

// =============================================================================
// Types
// =============================================================================

type Context = {
  Bindings: WASMGatewayEnv;
  Variables: {
    gateway: WASMGateway;
    requestId: string;
  };
};

// =============================================================================
// Gateway State
// =============================================================================

let gateway: WASMGateway | null = null;
let gatewayInitPromise: Promise<void> | null = null;

async function getGateway(env: WASMGatewayEnv): Promise<WASMGateway> {
  if (gateway) return gateway;
  
  if (!gatewayInitPromise) {
    gatewayInitPromise = initGateway(env);
  }
  
  await gatewayInitPromise;
  return gateway!;
}

async function initGateway(env: WASMGatewayEnv): Promise<void> {
  const config = {
    engineType: 'auto' as const,
    strategy: 'prefer-wasm' as const,
    wasmOptions: {
      url: env.WASM_MODULE_URL || '/wasm/exercise-engine.wasm',
      streaming: true,
    },
    benchmark: {
      autoBenchmark: env.ENABLE_BENCHMARK === 'true',
      iterations: 1000,
      threshold: 10,
    },
    cache: {
      enabled: true,
      maxInstances: 2,
      ttl: 60000,
    },
  };
  
  gateway = new WASMGateway(config);
  await gateway.init();
}

// =============================================================================
// Application
// =============================================================================

const app = new Hono<Context>();

// CORS
app.use('*', cors({
  origin: ['http://localhost:3000', 'https://aivo.app'],
  credentials: true,
}));

// Security headers
app.use('*', etag());
app.use('*', secureHeaders());

// Request ID
app.use('*', async (c, next) => {
  const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);
  await next();
});

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    wasmSupported: isWASMSupported(),
    gatewayReady: !!gateway,
    timestamp: Date.now(),
  });
});

// Get gateway status
app.get('/status', async (c) => {
  const gw = await getGateway(c.env);
  const state = gw.getState();
  const metrics = gw.getMetrics();
  
  return c.json({
    state,
    metrics,
    wasmSupported: isWASMSupported(),
  });
});

// Run benchmark
app.post('/benchmark', async (c) => {
  const gw = await getGateway(c.env);
  const result = await gw.runBenchmark();
  
  return c.json({
    success: true,
    result,
  });
});

// Process pose (main endpoint)
app.post('/process', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const body = await c.req.json<WASMInput>();
    
    // Validate input
    if (!body.landmarks || !body.exerciseCode) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: landmarks, exerciseCode',
        },
        requestId,
      }, 400);
    }
    
    const gw = await getGateway(c.env);
    const result = gw.process(body);
    
    return c.json({
      data: result.data,
      meta: {
        requestId,
        engine: result.engine,
        timing: result.timing,
        warnings: result.warnings,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Process error:`, error);
    
    return c.json({
      error: {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      requestId,
    }, 500);
  }
});

// Batch process multiple poses
app.post('/process/batch', async (c) => {
  const requestId = c.get('requestId');
  
  try {
    const body = await c.req.json<{ inputs: WASMInput[] }>();
    
    if (!body.inputs || !Array.isArray(body.inputs)) {
      return c.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing or invalid inputs array',
        },
        requestId,
      }, 400);
    }
    
    const gw = await getGateway(c.env);
    const results: WASMOutput[] = [];
    
    for (const input of body.inputs) {
      try {
        const result = gw.process(input);
        results.push(result.data);
      } catch (error) {
        console.error(`[${requestId}] Batch item error:`, error);
        results.push({
          exercise: input.exerciseCode,
          phase: 'error',
          repCount: 0,
          isRepComplete: false,
          corrections: [],
          poseConfidence: 0,
          processingTimeMs: 0,
        });
      }
    }
    
    return c.json({
      data: results,
      meta: {
        requestId,
        count: results.length,
      },
    });
  } catch (error) {
    console.error(`[${requestId}] Batch error:`, error);
    
    return c.json({
      error: {
        code: 'PROCESSING_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      requestId,
    }, 500);
  }
});

// Get metrics
app.get('/metrics', async (c) => {
  const gw = await getGateway(c.env);
  const metrics = gw.getMetrics();
  
  // Return Prometheus-style metrics
  const prometheusMetrics = `
# HELP wasm_gateway_ops_per_second Operations per second
# TYPE wasm_gateway_ops_per_second gauge
wasm_gateway_ops_per_second ${metrics.opsPerSecond}

# HELP wasm_gateway_avg_latency Average execution latency (ms)
# TYPE wasm_gateway_avg_latency gauge
wasm_gateway_avg_latency ${metrics.avgExecutionTime}

# HELP wasm_gateway_p50_latency P50 latency (ms)
# TYPE wasm_gateway_p50_latency gauge
wasm_gateway_p50_latency ${metrics.p50Latency}

# HELP wasm_gateway_p95_latency P95 latency (ms)
# TYPE wasm_gateway_p95_latency gauge
wasm_gateway_p95_latency ${metrics.p95Latency}

# HELP wasm_gateway_p99_latency P99 latency (ms)
# TYPE wasm_gateway_p99_latency gauge
wasm_gateway_p99_latency ${metrics.p99Latency}
`.trim();
  
  return c.text(prometheusMetrics, 200, {
    'Content-Type': 'text/plain; charset=utf-8',
  });
});

// Reset gateway state
app.post('/reset', async (c) => {
  const gw = await getGateway(c.env);
  gw.reset();
  
  return c.json({
    success: true,
    message: 'Gateway reset',
  });
});

// 404 handler
app.notFound((c) => {
  return c.json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${c.req.method} ${c.req.path} not found`,
    },
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('[WASM Gateway Error]', err);
  
  return c.json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An internal error occurred',
    },
  }, 500);
});

// =============================================================================
// Export Worker
// =============================================================================

export default {
  async fetch(request: Request, env: WASMGatewayEnv, ctx: ExecutionContext): Promise<Response> {
    const requestId = request.headers.get('X-Request-ID') || crypto.randomUUID();
    
    console.log(`[${requestId}] ${request.method} ${request.url}`);
    
    return app.fetch(request, env as unknown as Context, ctx);
  },
  
  async scheduled(controller: ScheduledController, env: WASMGatewayEnv, ctx: ExecutionContext): Promise<void> {
    // Periodic benchmark to select best engine
    if (env.ENABLE_BENCHMARK === 'true' && gateway) {
      console.log('Running scheduled benchmark...');
      await gateway.runBenchmark();
    }
  },
} satisfies ExportedHandler<WASMGatewayEnv>;
