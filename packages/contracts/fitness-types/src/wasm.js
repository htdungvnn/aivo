/**
 * AIVO Fitness Types - WASM Engine Types
 * Input/output types for the Rust/WASM exercise engine
 */
import { z } from 'zod';
import { landmarkSchema } from './pose.js';
// =============================================================================
// WASM Module Configuration
// =============================================================================
/**
 * Configuration for the WASM engine
 */
export const wasmEngineConfigSchema = z.object({
    // Exercise definitions (JSON encoded)
    exerciseDefinitions: z.record(z.string(), z.unknown()),
    // Processing settings
    smoothingWindowSize: z.number().int().min(1).max(10).default(5),
    minConfidence: z.number().min(0).max(1).default(0.5),
    // Rep counting settings
    repCooldownMs: z.number().int().positive().default(500),
    minPhaseDurationMs: z.number().int().positive().default(200),
    // Calibration settings
    calibrationFramesRequired: z.number().int().min(10).max(100).default(30),
    calibrationConfidenceThreshold: z.number().min(0).max(1).default(0.7),
});
// =============================================================================
// WASM Input Types
// =============================================================================
/**
 * Input to the WASM exercise engine
 */
export const wasmInputSchema = z.object({
    // Pose landmarks (normalized, smoothed)
    landmarks: z.record(z.string(), landmarkSchema),
    // Visibility metrics
    visibility: z.object({
        overall: z.number().min(0).max(1),
        required: z.number().min(0).max(1),
    }),
    // Current state
    exerciseCode: z.string(),
    currentPhase: z.string(),
    currentRepCount: z.number().int().nonnegative(),
    // Timing
    timestampMs: z.number().int().positive(),
    elapsedMs: z.number().int().nonnegative(),
    // Configuration
    config: wasmEngineConfigSchema.partial().optional(),
});
// =============================================================================
// WASM Output Types
// =============================================================================
/**
 * Result from a single WASM processing call
 */
export const wasmOutputSchema = z.object({
    // Exercise state
    exercise: z.string(),
    phase: z.string(),
    repCount: z.number().int().nonnegative(),
    isRepComplete: z.boolean().default(false),
    // Current rep metrics
    currentRep: z.object({
        rangeOfMotion: z.number().min(0).max(1),
        tempoSeconds: z.number().nonnegative(),
        qualityScore: z.number().min(0).max(100),
        durationMs: z.number().int().nonnegative(),
        corrections: z.array(z.string()),
    }).optional(),
    // Active corrections
    corrections: z.array(z.object({
        code: z.string(),
        severity: z.enum(['info', 'hint', 'warning', 'critical']),
        confidence: z.number().min(0).max(1),
        side: z.enum(['left', 'right', 'both', 'none']).default('none'),
    })),
    // Pose metrics
    poseConfidence: z.number().min(0).max(1),
    // Calibration status
    calibration: z.object({
        isComplete: z.boolean(),
        progress: z.number().min(0).max(1),
        message: z.string().optional(),
    }).optional(),
    // Timing info
    processingTimeMs: z.number().int().nonnegative(),
});
// =============================================================================
// Joint Angle Results
// =============================================================================
/**
 * Calculated joint angles
 */
export const jointAngleResultSchema = z.object({
    joint: z.string(),
    angle: z.number().min(0).max(180),
    confidence: z.number().min(0).max(1),
    side: z.enum(['left', 'right', 'center']).default('center'),
});
/**
 * All calculated angles for a pose
 */
export const poseAnglesSchema = z.object({
    timestampMs: z.number().int().positive(),
    angles: z.array(jointAngleResultSchema),
    overallConfidence: z.number().min(0).max(1),
});
// =============================================================================
// Engine State
// =============================================================================
/**
 * Internal state maintained by the WASM engine
 */
export const engineStateSchema = z.object({
    exerciseCode: z.string(),
    // Phase tracking
    currentPhase: z.string(),
    previousPhase: z.string().optional(),
    phaseStartTime: z.number().int().positive(),
    // Rep tracking
    repCount: z.number().int().nonnegative(),
    repStartTime: z.number().int().positive(),
    lastRepTime: z.number().int().positive().optional(),
    // Calibration
    calibrationFrameCount: z.number().int().nonnegative(),
    isCalibrated: z.boolean().default(false),
    // Smoothing buffers
    landmarkBuffer: z.array(z.record(z.string(), landmarkSchema)).default([]),
    // Angle history
    angleHistory: z.array(z.record(z.string(), z.number())).default([]),
    // Active corrections with frame counts
    activeCorrections: z.record(z.string(), z.object({
        frameCount: z.number().int().positive(),
        firstDetected: z.number().int().positive(),
    })).default({}),
    // Metrics for current rep
    currentRepMetrics: z.object({
        minAngles: z.record(z.string(), z.number()).default({}),
        maxAngles: z.record(z.string(), z.number()).default({}),
        tempoSamples: z.array(z.number()).default([]),
        stabilityScore: z.number().min(0).max(1).default(1),
    }).default({
        minAngles: {},
        maxAngles: {},
        tempoSamples: [],
        stabilityScore: 1,
    }),
});
// =============================================================================
// Benchmark Results
// =============================================================================
/**
 * Performance benchmark results
 */
export const benchmarkResultSchema = z.object({
    engine: z.enum(['wasm', 'typescript']),
    // Operation timings
    operations: z.record(z.string(), z.object({
        totalMs: z.number(),
        count: z.number().int().positive(),
        averageMs: z.number(),
        minMs: z.number(),
        maxMs: z.number(),
    })),
    // Memory usage
    memoryUsage: z.object({
        heapUsed: z.number(),
        heapTotal: z.number(),
        external: z.number(),
    }).optional(),
    // Summary
    totalOperations: z.number().int().positive(),
    totalTimeMs: z.number(),
    operationsPerSecond: z.number(),
    // Comparison (if comparing)
    comparison: z.object({
        fasterBy: z.number(),
        percentageFaster: z.number(),
    }).optional(),
});
// =============================================================================
// Export all schemas and types
// =============================================================================
export const wasmTypes = {
    // Schemas
    wasmEngineConfigSchema,
    wasmInputSchema,
    wasmOutputSchema,
    jointAngleResultSchema,
    poseAnglesSchema,
    engineStateSchema,
    benchmarkResultSchema,
};
export default wasmTypes;
