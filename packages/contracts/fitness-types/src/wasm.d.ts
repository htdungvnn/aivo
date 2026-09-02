/**
 * AIVO Fitness Types - WASM Engine Types
 * Input/output types for the Rust/WASM exercise engine
 */
import { z } from 'zod';
/**
 * Configuration for the WASM engine
 */
export declare const wasmEngineConfigSchema: z.ZodObject<{
    exerciseDefinitions: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    smoothingWindowSize: z.ZodDefault<z.ZodNumber>;
    minConfidence: z.ZodDefault<z.ZodNumber>;
    repCooldownMs: z.ZodDefault<z.ZodNumber>;
    minPhaseDurationMs: z.ZodDefault<z.ZodNumber>;
    calibrationFramesRequired: z.ZodDefault<z.ZodNumber>;
    calibrationConfidenceThreshold: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type WASMEngineConfig = z.infer<typeof wasmEngineConfigSchema>;
/**
 * Input to the WASM exercise engine
 */
export declare const wasmInputSchema: z.ZodObject<{
    landmarks: z.ZodRecord<z.ZodString, z.ZodObject<{
        index: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
        visibility: z.ZodNumber;
    }, z.core.$strip>>;
    visibility: z.ZodObject<{
        overall: z.ZodNumber;
        required: z.ZodNumber;
    }, z.core.$strip>;
    exerciseCode: z.ZodString;
    currentPhase: z.ZodString;
    currentRepCount: z.ZodNumber;
    timestampMs: z.ZodNumber;
    elapsedMs: z.ZodNumber;
    config: z.ZodOptional<z.ZodObject<{
        exerciseDefinitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        smoothingWindowSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        minConfidence: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        repCooldownMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        minPhaseDurationMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        calibrationFramesRequired: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        calibrationConfidenceThreshold: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type WASMInput = z.infer<typeof wasmInputSchema>;
/**
 * Result from a single WASM processing call
 */
export declare const wasmOutputSchema: z.ZodObject<{
    exercise: z.ZodString;
    phase: z.ZodString;
    repCount: z.ZodNumber;
    isRepComplete: z.ZodDefault<z.ZodBoolean>;
    currentRep: z.ZodOptional<z.ZodObject<{
        rangeOfMotion: z.ZodNumber;
        tempoSeconds: z.ZodNumber;
        qualityScore: z.ZodNumber;
        durationMs: z.ZodNumber;
        corrections: z.ZodArray<z.ZodString>;
    }, z.core.$strip>>;
    corrections: z.ZodArray<z.ZodObject<{
        code: z.ZodString;
        severity: z.ZodEnum<{
            critical: "critical";
            hint: "hint";
            info: "info";
            warning: "warning";
        }>;
        confidence: z.ZodNumber;
        side: z.ZodDefault<z.ZodEnum<{
            both: "both";
            left: "left";
            none: "none";
            right: "right";
        }>>;
    }, z.core.$strip>>;
    poseConfidence: z.ZodNumber;
    calibration: z.ZodOptional<z.ZodObject<{
        isComplete: z.ZodBoolean;
        progress: z.ZodNumber;
        message: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>;
    processingTimeMs: z.ZodNumber;
}, z.core.$strip>;
export type WASMOutput = z.infer<typeof wasmOutputSchema>;
/**
 * Calculated joint angles
 */
export declare const jointAngleResultSchema: z.ZodObject<{
    joint: z.ZodString;
    angle: z.ZodNumber;
    confidence: z.ZodNumber;
    side: z.ZodDefault<z.ZodEnum<{
        center: "center";
        left: "left";
        right: "right";
    }>>;
}, z.core.$strip>;
export type JointAngleResult = z.infer<typeof jointAngleResultSchema>;
/**
 * All calculated angles for a pose
 */
export declare const poseAnglesSchema: z.ZodObject<{
    timestampMs: z.ZodNumber;
    angles: z.ZodArray<z.ZodObject<{
        joint: z.ZodString;
        angle: z.ZodNumber;
        confidence: z.ZodNumber;
        side: z.ZodDefault<z.ZodEnum<{
            center: "center";
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strip>>;
    overallConfidence: z.ZodNumber;
}, z.core.$strip>;
export type PoseAngles = z.infer<typeof poseAnglesSchema>;
/**
 * Internal state maintained by the WASM engine
 */
export declare const engineStateSchema: z.ZodObject<{
    exerciseCode: z.ZodString;
    currentPhase: z.ZodString;
    previousPhase: z.ZodOptional<z.ZodString>;
    phaseStartTime: z.ZodNumber;
    repCount: z.ZodNumber;
    repStartTime: z.ZodNumber;
    lastRepTime: z.ZodOptional<z.ZodNumber>;
    calibrationFrameCount: z.ZodNumber;
    isCalibrated: z.ZodDefault<z.ZodBoolean>;
    landmarkBuffer: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodObject<{
        index: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
        visibility: z.ZodNumber;
    }, z.core.$strip>>>>;
    angleHistory: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodNumber>>>;
    activeCorrections: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
        frameCount: z.ZodNumber;
        firstDetected: z.ZodNumber;
    }, z.core.$strip>>>;
    currentRepMetrics: z.ZodDefault<z.ZodObject<{
        minAngles: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        maxAngles: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        tempoSamples: z.ZodDefault<z.ZodArray<z.ZodNumber>>;
        stabilityScore: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type EngineState = z.infer<typeof engineStateSchema>;
/**
 * Performance benchmark results
 */
export declare const benchmarkResultSchema: z.ZodObject<{
    engine: z.ZodEnum<{
        typescript: "typescript";
        wasm: "wasm";
    }>;
    operations: z.ZodRecord<z.ZodString, z.ZodObject<{
        totalMs: z.ZodNumber;
        count: z.ZodNumber;
        averageMs: z.ZodNumber;
        minMs: z.ZodNumber;
        maxMs: z.ZodNumber;
    }, z.core.$strip>>;
    memoryUsage: z.ZodOptional<z.ZodObject<{
        heapUsed: z.ZodNumber;
        heapTotal: z.ZodNumber;
        external: z.ZodNumber;
    }, z.core.$strip>>;
    totalOperations: z.ZodNumber;
    totalTimeMs: z.ZodNumber;
    operationsPerSecond: z.ZodNumber;
    comparison: z.ZodOptional<z.ZodObject<{
        fasterBy: z.ZodNumber;
        percentageFaster: z.ZodNumber;
    }, z.core.$strip>>;
}, z.core.$strip>;
export type BenchmarkResult = z.infer<typeof benchmarkResultSchema>;
/**
 * Expected exports from the WASM module
 */
export interface WASMModule {
    init(configJson: string): boolean;
    process(inputJson: string): string;
    getState(): string;
    reset(exerciseCode: string): void;
    startCalibration(): void;
    isCalibrated(): boolean;
    benchmark(iterations: number): string;
    version(): string;
}
/**
 * TypeScript fallback implementation interface
 * Used when WASM fails to load
 */
export interface TypeScriptEngine {
    init(config: WASMEngineConfig): void;
    process(input: WASMInput): WASMOutput;
    getState(): EngineState;
    reset(exerciseCode: string): void;
    startCalibration(): void;
    isCalibrated(): boolean;
    benchmark(iterations: number): BenchmarkResult;
    version(): string;
}
export type EngineType = 'wasm' | 'typescript';
export interface EngineFactory {
    create(type: EngineType): Promise<TypeScriptEngine>;
    getAvailable(): EngineType[];
}
export declare const wasmTypes: {
    readonly wasmEngineConfigSchema: z.ZodObject<{
        exerciseDefinitions: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        smoothingWindowSize: z.ZodDefault<z.ZodNumber>;
        minConfidence: z.ZodDefault<z.ZodNumber>;
        repCooldownMs: z.ZodDefault<z.ZodNumber>;
        minPhaseDurationMs: z.ZodDefault<z.ZodNumber>;
        calibrationFramesRequired: z.ZodDefault<z.ZodNumber>;
        calibrationConfidenceThreshold: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    readonly wasmInputSchema: z.ZodObject<{
        landmarks: z.ZodRecord<z.ZodString, z.ZodObject<{
            index: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
            visibility: z.ZodNumber;
        }, z.core.$strip>>;
        visibility: z.ZodObject<{
            overall: z.ZodNumber;
            required: z.ZodNumber;
        }, z.core.$strip>;
        exerciseCode: z.ZodString;
        currentPhase: z.ZodString;
        currentRepCount: z.ZodNumber;
        timestampMs: z.ZodNumber;
        elapsedMs: z.ZodNumber;
        config: z.ZodOptional<z.ZodObject<{
            exerciseDefinitions: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
            smoothingWindowSize: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            minConfidence: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            repCooldownMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            minPhaseDurationMs: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            calibrationFramesRequired: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
            calibrationConfidenceThreshold: z.ZodOptional<z.ZodDefault<z.ZodNumber>>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    readonly wasmOutputSchema: z.ZodObject<{
        exercise: z.ZodString;
        phase: z.ZodString;
        repCount: z.ZodNumber;
        isRepComplete: z.ZodDefault<z.ZodBoolean>;
        currentRep: z.ZodOptional<z.ZodObject<{
            rangeOfMotion: z.ZodNumber;
            tempoSeconds: z.ZodNumber;
            qualityScore: z.ZodNumber;
            durationMs: z.ZodNumber;
            corrections: z.ZodArray<z.ZodString>;
        }, z.core.$strip>>;
        corrections: z.ZodArray<z.ZodObject<{
            code: z.ZodString;
            severity: z.ZodEnum<{
                critical: "critical";
                hint: "hint";
                info: "info";
                warning: "warning";
            }>;
            confidence: z.ZodNumber;
            side: z.ZodDefault<z.ZodEnum<{
                both: "both";
                left: "left";
                none: "none";
                right: "right";
            }>>;
        }, z.core.$strip>>;
        poseConfidence: z.ZodNumber;
        calibration: z.ZodOptional<z.ZodObject<{
            isComplete: z.ZodBoolean;
            progress: z.ZodNumber;
            message: z.ZodOptional<z.ZodString>;
        }, z.core.$strip>>;
        processingTimeMs: z.ZodNumber;
    }, z.core.$strip>;
    readonly jointAngleResultSchema: z.ZodObject<{
        joint: z.ZodString;
        angle: z.ZodNumber;
        confidence: z.ZodNumber;
        side: z.ZodDefault<z.ZodEnum<{
            center: "center";
            left: "left";
            right: "right";
        }>>;
    }, z.core.$strip>;
    readonly poseAnglesSchema: z.ZodObject<{
        timestampMs: z.ZodNumber;
        angles: z.ZodArray<z.ZodObject<{
            joint: z.ZodString;
            angle: z.ZodNumber;
            confidence: z.ZodNumber;
            side: z.ZodDefault<z.ZodEnum<{
                center: "center";
                left: "left";
                right: "right";
            }>>;
        }, z.core.$strip>>;
        overallConfidence: z.ZodNumber;
    }, z.core.$strip>;
    readonly engineStateSchema: z.ZodObject<{
        exerciseCode: z.ZodString;
        currentPhase: z.ZodString;
        previousPhase: z.ZodOptional<z.ZodString>;
        phaseStartTime: z.ZodNumber;
        repCount: z.ZodNumber;
        repStartTime: z.ZodNumber;
        lastRepTime: z.ZodOptional<z.ZodNumber>;
        calibrationFrameCount: z.ZodNumber;
        isCalibrated: z.ZodDefault<z.ZodBoolean>;
        landmarkBuffer: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodObject<{
            index: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
            visibility: z.ZodNumber;
        }, z.core.$strip>>>>;
        angleHistory: z.ZodDefault<z.ZodArray<z.ZodRecord<z.ZodString, z.ZodNumber>>>;
        activeCorrections: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodObject<{
            frameCount: z.ZodNumber;
            firstDetected: z.ZodNumber;
        }, z.core.$strip>>>;
        currentRepMetrics: z.ZodDefault<z.ZodObject<{
            minAngles: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
            maxAngles: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodNumber>>;
            tempoSamples: z.ZodDefault<z.ZodArray<z.ZodNumber>>;
            stabilityScore: z.ZodDefault<z.ZodNumber>;
        }, z.core.$strip>>;
    }, z.core.$strip>;
    readonly benchmarkResultSchema: z.ZodObject<{
        engine: z.ZodEnum<{
            typescript: "typescript";
            wasm: "wasm";
        }>;
        operations: z.ZodRecord<z.ZodString, z.ZodObject<{
            totalMs: z.ZodNumber;
            count: z.ZodNumber;
            averageMs: z.ZodNumber;
            minMs: z.ZodNumber;
            maxMs: z.ZodNumber;
        }, z.core.$strip>>;
        memoryUsage: z.ZodOptional<z.ZodObject<{
            heapUsed: z.ZodNumber;
            heapTotal: z.ZodNumber;
            external: z.ZodNumber;
        }, z.core.$strip>>;
        totalOperations: z.ZodNumber;
        totalTimeMs: z.ZodNumber;
        operationsPerSecond: z.ZodNumber;
        comparison: z.ZodOptional<z.ZodObject<{
            fasterBy: z.ZodNumber;
            percentageFaster: z.ZodNumber;
        }, z.core.$strip>>;
    }, z.core.$strip>;
};
export default wasmTypes;
//# sourceMappingURL=wasm.d.ts.map