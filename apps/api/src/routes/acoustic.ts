import type { Context } from 'hono';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';
import { __wbg_set_wasm, start, AcousticMyography } from '@aivo/compute/aivo_compute_bg.js';

// Fetch WASM from assets directory at runtime
const WASM_PATH = "/aivo_compute_bg.wasm";

// Initialize WASM module on startup
let wasmInitialized = false;
let wasmInitPromise: Promise<void> | null = null;
async function ensureWasmInitialized(): Promise<void> {
  if (!wasmInitialized) {
    if (!wasmInitPromise) {
      wasmInitPromise = (async () => {
        try {
          const response = await fetch(WASM_PATH);
          if (!response.ok) {
            throw new Error(`Failed to fetch WASM: ${response.status} ${response.statusText}`);
          }
          const wasmBytes = await response.arrayBuffer();
          // Instantiate WASM and initialize bindings
          const { instance } = await WebAssembly.instantiate(wasmBytes);
          __wbg_set_wasm(instance.exports);
          start();
          wasmInitialized = true;
        } catch (error) {
          throw error;
        }
      })();
    }
    await wasmInitPromise;
  }
}

export const AcousticRouter = () => {
  const router = new Hono();

  router.use('/*', cors({
    origin: ['http://localhost:3000', 'http://localhost:8080'],
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['POST', 'GET', 'OPTIONS'],
    exposeHeaders: ['X-RateLimit-Remaining'],
  }));

  const ProcessChunkSchema = z.object({
    pcmData: z.array(z.number()).min(1).max(10000),
    timestamp: z.number().optional(),
    sessionId: z.string().optional(),
  });

  const CalibrateSchema = z.object({
    pcmData: z.array(z.number()).min(4000).max(20000),
  });

  const SessionStartSchema = z.object({
    userId: z.string(),
    exerciseName: z.string(),
    muscleGroup: z.enum(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'quadriceps', 'hamstrings', 'glutes', 'calves', 'forearms', 'neck']),
    workoutId: z.string().optional(),
    baselineId: z.string().optional(),
  });

  function generateId(): string {
    return crypto.randomUUID();
  }

  function now(): number {
    return Math.floor(Date.now() / 1000);
  }

  function invokeWasmString(functionName: 'processAudioChunk' | 'calibrateBaseline' | 'calculateFatigueScore' | 'getRecommendedConfig', args: [Int16Array, bigint?] | [string, string?] | [Int16Array?] | []): string {
    switch (functionName) {
      case 'processAudioChunk':
        return AcousticMyography.processAudioChunk(args[0] as Int16Array, (args[1] ?? BigInt(0)) as bigint);
      case 'calibrateBaseline':
        return AcousticMyography.calibrateBaseline(args[0] as Int16Array);
      case 'calculateFatigueScore':
        return AcousticMyography.calculateFatigueScore(args[0] as string, (args[1] ?? '') as string);
      case 'getRecommendedConfig':
        return AcousticMyography.getRecommendedConfig();
      default:
        throw new Error(`Unknown WASM function: ${functionName}`);
    }
  }

  function invokeWasmPrimitive(functionName: 'isExerciseSignal' | 'recommendedSampleRate' | 'recommendedChunkDurationMs', args: [Int16Array?] | []): boolean | number {
    switch (functionName) {
      case 'isExerciseSignal':
        return AcousticMyography.isExerciseSignal(args[0] as Int16Array);
      case 'recommendedSampleRate':
        return AcousticMyography.recommendedSampleRate();
      case 'recommendedChunkDurationMs':
        return AcousticMyography.recommendedChunkDurationMs();
      default:
        throw new Error(`Unknown WASM function: ${functionName}`);
    }
  }

  router.post('/process-chunk', async (ctx: Context) => {
    try {
      await ensureWasmInitialized();
      const body = await ctx.req.json();
      const validated = ProcessChunkSchema.parse(body);

      for (const sample of validated.pcmData) {
        if (sample < -32768 || sample > 32767) {
          return ctx.json({ success: false, error: 'PCM samples must be 16-bit signed integers' }, 400);
        }
      }

      const pcmData = new Int16Array(validated.pcmData);
      const timestamp = validated.timestamp !== undefined ? BigInt(validated.timestamp) : BigInt(0);
      const resultJson = invokeWasmString('processAudioChunk', [pcmData, timestamp]);
      const features = JSON.parse(resultJson);

      return ctx.json({ success: true, data: features });
    } catch (error) {
      return ctx.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  router.post('/calibrate', async (ctx: Context) => {
    try {
      await ensureWasmInitialized();
      const body = await ctx.req.json();
      const validated = CalibrateSchema.parse(body);
      const pcmData = new Int16Array(validated.pcmData);
      const baselineJson = invokeWasmString('calibrateBaseline', [pcmData]);
      const baseline = JSON.parse(baselineJson);
      return ctx.json({ success: true, data: baseline });
    } catch (error) {
      return ctx.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  router.post('/calculate-fatigue', async (ctx: Context) => {
    try {
      await ensureWasmInitialized();
      const body = await ctx.req.json();
      const featuresJson = z.string().parse(body.features);
      const baselineJson = z.string().optional().parse(body.baseline);
      const resultJson = invokeWasmString('calculateFatigueScore', [featuresJson, baselineJson || '']);
      const result = JSON.parse(resultJson);
      return ctx.json({ success: true, data: result });
    } catch (error) {
      return ctx.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  router.post('/sessions/start', async (ctx: Context) => {
    try {
      const body = await ctx.req.json();
      SessionStartSchema.parse(body);
      const sessionId = generateId();
      const timestamp = now();
      return ctx.json({ success: true, data: { sessionId, startTime: timestamp, message: 'Acoustic session started' } });
    } catch (error) {
      return ctx.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  router.post('/sessions/:id/end', async (ctx: Context) => {
    try {
      const sessionId = ctx.req.param('id');
      const endTime = now();
      return ctx.json({ success: true, data: { sessionId, endTime, message: 'Session ended' } });
    } catch (error) {
      return ctx.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  router.get('/sessions/:id/trend', async (ctx: Context) => {
    try {
      const sessionId = ctx.req.param('id');
      return ctx.json({ success: true, data: { sessionId, trend: [], message: 'Trend data would be calculated from chunk features' } });
    } catch (error) {
      return ctx.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  router.post('/analyze-exercise', async (ctx: Context) => {
    try {
      await ensureWasmInitialized();
      const body = await ctx.req.json();
      const pcmData = new Int16Array(body.pcmData || []);
      const isExercise = invokeWasmPrimitive('isExerciseSignal', [pcmData]);
      return ctx.json({ success: true, data: { isExercise: Boolean(isExercise) } });
    } catch (error) {
      return ctx.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  router.get('/config', async (ctx: Context) => {
    try {
      await ensureWasmInitialized();
      const configJson = invokeWasmString('getRecommendedConfig', []);
      const config = JSON.parse(configJson);
      return ctx.json({ success: true, data: config });
    } catch (error) {
      return ctx.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  router.get('/insights/:exerciseName', async (ctx: Context) => {
    try {
      const exerciseName = ctx.req.param('exerciseName');
      return ctx.json({
        success: true,
        data: {
          exercise: exerciseName,
          avgFatigue: null,
          peakFatigue: null,
          recommendations: [
            'Calibrate baseline before first use',
            'Monitor fatigue trends over time',
            'Rest when fatigue exceeds 70',
          ],
          warning: 'Historical data not yet implemented',
        },
      });
    } catch (error) {
      return ctx.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, 500);
    }
  });

  return router;
};
