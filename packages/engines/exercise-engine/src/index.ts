/**
 * Exercise Engine - TypeScript Implementation
 * Deterministic exercise analysis engine
 */

import type { Landmark } from '@aivo/fitness-types/pose';
import type {
  WASMEngineConfig,
  WASMInput,
  WASMOutput,
  EngineState,
  BenchmarkResult,
  TypeScriptEngine,
} from '@aivo/fitness-types/wasm';

// Re-export types for convenience
export type {
  WASMEngineConfig,
  WASMInput,
  WASMOutput,
  EngineState,
  BenchmarkResult,
} from '@aivo/fitness-types/wasm';

// =============================================================================
// Geometry Utilities
// =============================================================================

interface Point2D {
  x: number;
  y: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
}

/**
 * Calculate angle between three points (2D)
 */
export function calculateAngle2D(a: Point2D, b: Point2D, c: Point2D): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y };
  const v2 = { x: c.x - b.x, y: c.y - b.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Calculate angle between three points (3D)
 */
export function calculateAngle3D(a: Point3D, b: Point3D, c: Point3D): number {
  const v1 = { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  const v2 = { x: c.x - b.x, y: c.y - b.y, z: c.z - b.z };

  const dot = v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y + v2.z * v2.z);

  if (mag1 === 0 || mag2 === 0) return 0;

  const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
  return (Math.acos(cosAngle) * 180) / Math.PI;
}

/**
 * Calculate distance between two points (2D)
 */
export function distance2D(a: Point2D, b: Point2D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2);
}

/**
 * Calculate distance between two points (3D)
 */
export function distance3D(a: Point3D, b: Point3D): number {
  return Math.sqrt((b.x - a.x) ** 2 + (b.y - a.y) ** 2 + (b.z - a.z) ** 2);
}

/**
 * Smooth value using exponential moving average
 */
export function smoothValue(current: number, previous: number, alpha: number): number {
  return alpha * current + (1 - alpha) * previous;
}

// =============================================================================
// Angle Calculations
// =============================================================================

const LANDMARK_INDICES = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
} as const;

export type JointName = keyof typeof LANDMARK_INDICES;

/**
 * Calculate joint angles from landmarks
 */
export function calculateJointAngles(landmarks: Landmark[]): Record<string, number> {
  const angles: Record<string, number> = {};

  if (landmarks.length < 33) return angles;

  const getPoint = (idx: number): Point3D => ({
    x: landmarks[idx]?.x ?? 0,
    y: landmarks[idx]?.y ?? 0,
    z: landmarks[idx]?.z ?? 0,
  });

  // Knee angles
  angles.left_knee = calculateAngle3D(
    getPoint(LANDMARK_INDICES.LEFT_HIP),
    getPoint(LANDMARK_INDICES.LEFT_KNEE),
    getPoint(LANDMARK_INDICES.LEFT_ANKLE)
  );
  angles.right_knee = calculateAngle3D(
    getPoint(LANDMARK_INDICES.RIGHT_HIP),
    getPoint(LANDMARK_INDICES.RIGHT_KNEE),
    getPoint(LANDMARK_INDICES.RIGHT_ANKLE)
  );

  // Hip angles
  angles.left_hip = calculateAngle3D(
    getPoint(LANDMARK_INDICES.LEFT_KNEE),
    getPoint(LANDMARK_INDICES.LEFT_HIP),
    getPoint(LANDMARK_INDICES.LEFT_SHOULDER)
  );
  angles.right_hip = calculateAngle3D(
    getPoint(LANDMARK_INDICES.RIGHT_KNEE),
    getPoint(LANDMARK_INDICES.RIGHT_HIP),
    getPoint(LANDMARK_INDICES.RIGHT_SHOULDER)
  );

  // Elbow angles
  angles.left_elbow = calculateAngle3D(
    getPoint(LANDMARK_INDICES.LEFT_SHOULDER),
    getPoint(LANDMARK_INDICES.LEFT_ELBOW),
    getPoint(LANDMARK_INDICES.LEFT_WRIST)
  );
  angles.right_elbow = calculateAngle3D(
    getPoint(LANDMARK_INDICES.RIGHT_SHOULDER),
    getPoint(LANDMARK_INDICES.RIGHT_ELBOW),
    getPoint(LANDMARK_INDICES.RIGHT_WRIST)
  );

  // Shoulder angles
  angles.left_shoulder = calculateAngle3D(
    getPoint(LANDMARK_INDICES.LEFT_ELBOW),
    getPoint(LANDMARK_INDICES.LEFT_SHOULDER),
    getPoint(LANDMARK_INDICES.LEFT_HIP)
  );
  angles.right_shoulder = calculateAngle3D(
    getPoint(LANDMARK_INDICES.RIGHT_ELBOW),
    getPoint(LANDMARK_INDICES.RIGHT_SHOULDER),
    getPoint(LANDMARK_INDICES.RIGHT_HIP)
  );

  // Torso angle (lean from vertical)
  const midShoulder: Point3D = {
    x: (getPoint(LANDMARK_INDICES.LEFT_SHOULDER).x + getPoint(LANDMARK_INDICES.RIGHT_SHOULDER).x) / 2,
    y: (getPoint(LANDMARK_INDICES.LEFT_SHOULDER).y + getPoint(LANDMARK_INDICES.RIGHT_SHOULDER).y) / 2,
    z: (getPoint(LANDMARK_INDICES.LEFT_SHOULDER).z + getPoint(LANDMARK_INDICES.RIGHT_SHOULDER).z) / 2,
  };
  const midHip: Point3D = {
    x: (getPoint(LANDMARK_INDICES.LEFT_HIP).x + getPoint(LANDMARK_INDICES.RIGHT_HIP).x) / 2,
    y: (getPoint(LANDMARK_INDICES.LEFT_HIP).y + getPoint(LANDMARK_INDICES.RIGHT_HIP).y) / 2,
    z: (getPoint(LANDMARK_INDICES.LEFT_HIP).z + getPoint(LANDMARK_INDICES.RIGHT_HIP).z) / 2,
  };
  angles.torso_angle = calculateAngle3D(
    { x: midShoulder.x, y: midShoulder.y - 1, z: midShoulder.z },
    midShoulder,
    midHip
  );

  return angles;
}

// =============================================================================
// Exercise State Machine
// =============================================================================

export type ExercisePhase =
  | 'ready'
  | 'descending'
  | 'bottom'
  | 'ascending'
  | 'completed'
  | 'calibrating'
  | 'paused'
  | 'holding';

export type ExerciseCode = 'squat' | 'push_up' | 'lunge' | 'shoulder_press' | 'plank';

export type Severity = 'info' | 'hint' | 'warning' | 'critical';

export interface CorrectionResult {
  code: string;
  severity: Severity;
  confidence: number;
  side: 'left' | 'right' | 'both' | 'none';
}

interface RepMetrics {
  minAngles: Record<string, number>;
  maxAngles: Record<string, number>;
  tempoSamples: number[];
  stabilityScore: number;
  rangeOfMotion: number;
}

interface ActiveCorrection {
  frameCount: number;
  firstDetected: number;
  severity: string;
}

interface EngineInternalState {
  exerciseCode: ExerciseCode;
  currentPhase: ExercisePhase;
  previousPhase: ExercisePhase | null;
  repCount: number;
  repStartTime: number;
  lastRepTime: number | null;
  phaseStartTime: number;
  calibrationFrameCount: number;
  isCalibrated: boolean;
  currentRepMetrics: RepMetrics;
  activeCorrections: Map<string, ActiveCorrection>;
  visibilityHistory: number[];
}

// =============================================================================
// TypeScript Exercise Engine Implementation
// =============================================================================

export class ExerciseEngineTS implements TypeScriptEngine {
  private config: WASMEngineConfig;
  private state: EngineInternalState;
  private smoothedLandmarks: Landmark[][] = [];
  private angleHistory: Record<string, number>[] = [];

  constructor(config?: Partial<WASMEngineConfig>) {
    this.config = {
      exerciseDefinitions: {},
      smoothingWindowSize: config?.smoothingWindowSize ?? 5,
      minConfidence: config?.minConfidence ?? 0.5,
      repCooldownMs: config?.repCooldownMs ?? 500,
      minPhaseDurationMs: config?.minPhaseDurationMs ?? 200,
      calibrationFramesRequired: config?.calibrationFramesRequired ?? 30,
      calibrationConfidenceThreshold: config?.calibrationConfidenceThreshold ?? 0.7,
    };

    this.state = this.createInitialState('squat');
  }

  private createInitialState(exerciseCode: ExerciseCode): EngineInternalState {
    return {
      exerciseCode,
      currentPhase: 'ready',
      previousPhase: null,
      repCount: 0,
      repStartTime: 0,
      lastRepTime: null,
      phaseStartTime: 0,
      calibrationFrameCount: 0,
      isCalibrated: false,
      currentRepMetrics: {
        minAngles: {},
        maxAngles: {},
        tempoSamples: [],
        stabilityScore: 1,
        rangeOfMotion: 0,
      },
      activeCorrections: new Map(),
      visibilityHistory: [],
    };
  }

  init(config: WASMEngineConfig): void {
    this.config = { ...this.config, ...config };
  }

  reset(exerciseCode: string): void {
    this.state = this.createInitialState(exerciseCode as ExerciseCode);
    this.smoothedLandmarks = [];
    this.angleHistory = [];
  }

  startCalibration(): void {
    this.state.calibrationFrameCount = 0;
    this.state.isCalibrated = false;
    this.state.currentPhase = 'calibrating';
  }

  isCalibrated(): boolean {
    return this.state.isCalibrated;
  }

  getState(): EngineState {
    return {
      exerciseCode: this.state.exerciseCode,
      currentPhase: this.state.currentPhase,
      previousPhase: this.state.previousPhase ?? undefined,
      repCount: this.state.repCount,
      repStartTime: this.state.repStartTime,
      lastRepTime: this.state.lastRepTime ?? undefined,
      phaseStartTime: this.state.phaseStartTime,
      calibrationFrameCount: this.state.calibrationFrameCount,
      isCalibrated: this.state.isCalibrated,
      currentRepMetrics: this.state.currentRepMetrics,
      activeCorrections: Object.fromEntries(this.state.activeCorrections),
      landmarkBuffer: this.smoothedLandmarks.map((landmarks) => {
        const record: Record<string, Landmark> = {};
        landmarks.forEach((lm, idx) => {
          record[idx.toString()] = lm;
        });
        return record;
      }),
      angleHistory: [...this.angleHistory],
    };
  }

  process(input: WASMInput): WASMOutput {
    const startTime = performance.now();

    // Update state
    this.state.exerciseCode = input.exerciseCode as ExerciseCode;
    this.state.currentPhase = input.currentPhase as ExercisePhase;
    this.state.repCount = input.currentRepCount;

    // Convert landmarks array to proper format
    const landmarks: Landmark[] = [];
    for (let i = 0; i < 33; i++) {
      const lm = input.landmarks[i.toString()];
      if (lm) {
        landmarks[i] = lm;
      } else {
        landmarks[i] = { index: i, x: 0, y: 0, z: 0, visibility: 0 };
      }
    }

    // Add to smoothing buffer
    this.smoothedLandmarks.push(landmarks);
    if (this.smoothedLandmarks.length > this.config.smoothingWindowSize) {
      this.smoothedLandmarks.shift();
    }

    // Smooth landmarks
    const smoothed = this.smoothLandmarks();

    // Calculate angles
    const angles = calculateJointAngles(smoothed);
    this.angleHistory.push(angles);
    if (this.angleHistory.length > 10) {
      this.angleHistory.shift();
    }

    // Update visibility history
    this.state.visibilityHistory.push(input.visibility.overall);
    if (this.state.visibilityHistory.length > 10) {
      this.state.visibilityHistory.shift();
    }

    // Check calibration
    if (!this.state.isCalibrated) {
      return this.processCalibration(input, startTime);
    }

    // Detect phase
    const phase = this.detectPhase(angles);

    // Check for rep completion
    const { isRepComplete, newRepCount } = this.checkRepCompletion(
      phase,
      input.timestampMs
    );

    if (isRepComplete) {
      this.state.repCount = newRepCount;
      this.state.lastRepTime = input.timestampMs;
      this.state.repStartTime = input.timestampMs;
      this.state.currentRepMetrics = {
        minAngles: {},
        maxAngles: {},
        tempoSamples: [],
        stabilityScore: 1,
        rangeOfMotion: 0,
      };
    }

    // Evaluate form rules
    const corrections = this.evaluateFormRules(angles);

    // Update rep metrics
    this.updateRepMetrics(angles);

    // Build output
    const currentRep =
      this.state.repCount > 0
        ? {
            rangeOfMotion: this.state.currentRepMetrics.rangeOfMotion,
            tempoSeconds:
              this.state.currentRepMetrics.tempoSamples.length > 0
                ? this.state.currentRepMetrics.tempoSamples.reduce((a, b) => a + b, 0) /
                  this.state.currentRepMetrics.tempoSamples.length
                : 0,
            qualityScore: this.calculateQualityScore(corrections),
            durationMs: input.timestampMs - this.state.repStartTime,
            corrections: corrections.map((c) => c.code),
          }
        : undefined;

    return {
      exercise: input.exerciseCode,
      phase,
      repCount: this.state.repCount,
      isRepComplete,
      currentRep,
      corrections,
      poseConfidence: input.visibility.overall,
      calibration: undefined,
      processingTimeMs: Math.round(performance.now() - startTime),
    };
  }

  private smoothLandmarks(): Landmark[] {
    if (this.smoothedLandmarks.length === 0) return [];
    const firstFrame = this.smoothedLandmarks[0];
    if (this.smoothedLandmarks.length === 1 || !firstFrame) return [...firstFrame ?? []];

    const windowSize = this.smoothedLandmarks.length;
    const smoothed: Landmark[] = [];

    for (let i = 0; i < 33; i++) {
      let sumX = 0,
        sumY = 0,
        sumZ = 0,
        sumVis = 0;

      for (const frame of this.smoothedLandmarks) {
        if (frame[i]) {
          sumX += frame[i]!.x;
          sumY += frame[i]!.y;
          sumZ += frame[i]!.z;
          sumVis += frame[i]!.visibility;
        }
      }

      smoothed[i] = {
        index: i,
        x: sumX / windowSize,
        y: sumY / windowSize,
        z: sumZ / windowSize,
        visibility: sumVis / windowSize,
      };
    }

    return smoothed;
  }

  private processCalibration(
    input: WASMInput,
    startTime: number
  ): WASMOutput {
    this.state.calibrationFrameCount++;
    const progress = Math.min(
      1,
      this.state.calibrationFrameCount / this.config.calibrationFramesRequired
    );

    if (
      this.state.calibrationFrameCount >= this.config.calibrationFramesRequired &&
      input.visibility.overall >= this.config.calibrationConfidenceThreshold
    ) {
      this.state.isCalibrated = true;
      this.state.currentPhase = 'ready';
      this.state.phaseStartTime = input.timestampMs;
    }

    return {
      exercise: input.exerciseCode,
      phase: 'calibrating',
      repCount: this.state.repCount,
      isRepComplete: false,
      currentRep: undefined,
      corrections: [],
      poseConfidence: input.visibility.overall,
      calibration: {
        isComplete: this.state.isCalibrated,
        progress,
        message: this.state.isCalibrated
          ? 'Ready! Begin when you are comfortable.'
          : 'Hold the starting position...',
      },
      processingTimeMs: Math.round(performance.now() - startTime),
    };
  }

  private detectPhase(angles: Record<string, number>): ExercisePhase {
    const kneeAngle = angles.left_knee ?? 170;
    const elbowAngle = angles.left_elbow ?? 180;

    switch (this.state.exerciseCode) {
      case 'squat':
      case 'lunge':
        if (kneeAngle > 150) return 'ready';
        if (kneeAngle < 100) return 'bottom';
        if (this.state.currentPhase === 'bottom') return 'ascending';
        return 'descending';

      case 'push_up':
      case 'shoulder_press':
        if (elbowAngle > 160) return 'ready';
        if (elbowAngle < 90) return 'bottom';
        if (this.state.currentPhase === 'bottom') return 'ascending';
        return 'descending';

      case 'plank':
        return 'holding';

      default:
        return 'ready';
    }
  }

  private checkRepCompletion(
    phase: ExercisePhase,
    timestamp: number
  ): { isRepComplete: boolean; newRepCount: number } {
    const phaseDuration = timestamp - this.state.phaseStartTime;

    // Minimum phase duration
    if (phaseDuration < this.config.minPhaseDurationMs) {
      return { isRepComplete: false, newRepCount: this.state.repCount };
    }

    // Cooldown check
    if (this.state.lastRepTime !== null) {
      if (timestamp - this.state.lastRepTime < this.config.repCooldownMs) {
        return { isRepComplete: false, newRepCount: this.state.repCount };
      }
    }

    // Phase transition detection for rep completion
    if (
      this.state.previousPhase === 'ascending' &&
      phase === 'ready'
    ) {
      return {
        isRepComplete: true,
        newRepCount: this.state.repCount + 1,
      };
    }

    // Update phase tracking
    if (this.state.currentPhase !== phase) {
      this.state.previousPhase = this.state.currentPhase;
      this.state.currentPhase = phase;
      this.state.phaseStartTime = timestamp;
    }

    return { isRepComplete: false, newRepCount: this.state.repCount };
  }

  private evaluateFormRules(angles: Record<string, number>): CorrectionResult[] {
    const corrections: CorrectionResult[] = [];

    // Common rules
    const torsoAngle = angles.torso_angle ?? 0;
    if (torsoAngle > 45 && torsoAngle < 180) {
      if (this.shouldTriggerCorrection('FORWARD_LEAN_TOO_MUCH')) {
        corrections.push({
          code: 'FORWARD_LEAN_TOO_MUCH',
          severity: 'warning',
          confidence: 0.85,
          side: 'both',
        });
      }
    }

    // Exercise-specific rules
    switch (this.state.exerciseCode) {
      case 'squat': {
        const leftKnee = angles.left_knee ?? 180;
        if (leftKnee > 100 && leftKnee < 100.1) {
          if (this.shouldTriggerCorrection('SQUAT_NOT_DEEP_ENOUGH')) {
            corrections.push({
              code: 'SQUAT_NOT_DEEP_ENOUGH',
              severity: 'hint',
              confidence: 0.8,
              side: 'both',
            });
          }
        }
        break;
      }
      case 'push_up': {
        const leftElbow = angles.left_elbow ?? 180;
        if (leftElbow > 45 && leftElbow < 180) {
          if (this.shouldTriggerCorrection('ELBOWS_FLARE_OUT')) {
            corrections.push({
              code: 'ELBOWS_FLARE_OUT',
              severity: 'hint',
              confidence: 0.75,
              side: 'left',
            });
          }
        }
        break;
      }
    }

    return corrections;
  }

  private shouldTriggerCorrection(code: string): boolean {
    const active = this.state.activeCorrections.get(code);
    if (!active) {
      this.state.activeCorrections.set(code, {
        frameCount: 1,
        firstDetected: Date.now(),
        severity: 'warning',
      });
      return false;
    }

    active.frameCount++;
    if (active.frameCount >= 3) {
      this.state.activeCorrections.delete(code);
      return true;
    }

    return false;
  }

  private updateRepMetrics(angles: Record<string, number>): void {
    const metrics = this.state.currentRepMetrics;

    for (const [joint, angle] of Object.entries(angles)) {
      if (metrics.minAngles[joint] === undefined) {
        metrics.minAngles[joint] = angle;
      }
      if (metrics.maxAngles[joint] === undefined) {
        metrics.maxAngles[joint] = angle;
      }

      metrics.minAngles[joint] = Math.min(metrics.minAngles[joint]!, angle);
      metrics.maxAngles[joint] = Math.max(metrics.maxAngles[joint]!, angle);
    }

    // Calculate range of motion
    const kneeMin = metrics.minAngles.left_knee ?? 180;
    const kneeMax = metrics.maxAngles.left_knee ?? 0;
    if (kneeMax > kneeMin + 10) {
      metrics.rangeOfMotion = Math.min(1, (kneeMax - kneeMin) / 100);
    }

    // Stability (simplified)
    metrics.stabilityScore = 0.9;
  }

  private calculateQualityScore(corrections: CorrectionResult[]): number {
    let score = 100;

    for (const correction of corrections) {
      switch (correction.severity) {
        case 'info':
          score -= 2;
          break;
        case 'hint':
          score -= 5;
          break;
        case 'warning':
          score -= 15;
          break;
        case 'critical':
          score -= 30;
          break;
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  benchmark(iterations: number): BenchmarkResult {
    const startTime = performance.now();
    const angleTimes: number[] = [];
    const phaseTimes: number[] = [];

    const landmarks: Landmark[] = [];
    for (let i = 0; i < 33; i++) {
      landmarks.push({
        index: i,
        x: 0.5 + Math.random() * 0.1,
        y: 0.5 + Math.random() * 0.1,
        z: Math.random() * 0.1,
        visibility: 0.9,
      });
    }

    for (let i = 0; i < iterations; i++) {
      // Benchmark angle calculation
      const t1 = performance.now();
      calculateJointAngles(landmarks);
      angleTimes.push(performance.now() - t1);

      // Benchmark phase detection
      const t2 = performance.now();
      this.detectPhase({ left_knee: 120, right_knee: 118 });
      phaseTimes.push(performance.now() - t2);
    }

    const totalTime = performance.now() - startTime;

    return {
      engine: 'typescript',
      operations: {
        angle_calculation: {
          totalMs: angleTimes.reduce((a, b) => a + b, 0),
          count: iterations,
          averageMs: angleTimes.reduce((a, b) => a + b, 0) / iterations,
          minMs: Math.min(...angleTimes),
          maxMs: Math.max(...angleTimes),
        },
        phase_detection: {
          totalMs: phaseTimes.reduce((a, b) => a + b, 0),
          count: iterations,
          averageMs: phaseTimes.reduce((a, b) => a + b, 0) / iterations,
          minMs: Math.min(...phaseTimes),
          maxMs: Math.max(...phaseTimes),
        },
      },
      totalOperations: iterations * 2,
      totalTimeMs: Math.round(totalTime),
      operationsPerSecond: Math.round((iterations * 2 * 1000) / totalTime),
    };
  }

  version(): string {
    return '1.0.0';
  }
}

// =============================================================================
// Export Factory
// =============================================================================

export function createEngine(type: 'wasm' | 'typescript'): TypeScriptEngine {
  return new ExerciseEngineTS();
}

export function getAvailableEngines(): ('wasm' | 'typescript')[] {
  // Check if WASM is available
  const wasmAvailable =
    typeof WebAssembly !== 'undefined' &&
    typeof WebAssembly.instantiate === 'function';

  return wasmAvailable ? ['wasm', 'typescript'] : ['typescript'];
}

// Export engine class
export { ExerciseEngineTS as ExerciseEngine };
