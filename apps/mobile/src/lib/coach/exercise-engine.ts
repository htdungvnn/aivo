/**
 * Exercise Engine Wrapper
 * TypeScript implementation of the exercise engine for mobile
 */

import type {
  WASMInput,
  WASMOutput,
  EngineState,
} from '@aivo/fitness-types/wasm';
import type { ExerciseCode, ExercisePhase } from '@aivo/fitness-types/exercise';
import type { CorrectionResult, CorrectionSeverity } from '@aivo/fitness-types/correction';

// Import geometry utilities
import {
  calculateAngle3D,
  calculateJointAngles,
  smoothValue,
  LandmarkBuffer,
} from './pose-processing';

interface Point3D {
  x: number;
  y: number;
  z: number;
}

interface Landmark {
  index: number;
  x: number;
  y: number;
  z: number;
  visibility: number;
}

interface RepMetrics {
  minAngles: Record<string, number>;
  maxAngles: Record<string, number>;
  tempoSamples: number[];
  stabilityScore: number;
  rangeOfMotion: number;
}

interface EngineConfig {
  smoothingWindowSize: number;
  minConfidence: number;
  repCooldownMs: number;
  minPhaseDurationMs: number;
  calibrationFramesRequired: number;
  calibrationConfidenceThreshold: number;
}

const DEFAULT_CONFIG: EngineConfig = {
  smoothingWindowSize: 5,
  minConfidence: 0.5,
  repCooldownMs: 500,
  minPhaseDurationMs: 200,
  calibrationFramesRequired: 30,
  calibrationConfidenceThreshold: 0.7,
};

/**
 * Exercise Engine for Mobile
 * Deterministic exercise analysis without WASM dependency
 */
export class MobileExerciseEngine {
  private config: EngineConfig;
  private exerciseCode: ExerciseCode = 'squat';
  private currentPhase: ExercisePhase = 'ready';
  private previousPhase: ExercisePhase | null = null;
  private repCount: number = 0;
  private repStartTime: number = 0;
  private lastRepTime: number | null = null;
  private phaseStartTime: number = 0;
  private calibrationFrameCount: number = 0;
  private isCalibrated: boolean = false;
  private currentRepMetrics: RepMetrics = {
    minAngles: {},
    maxAngles: {},
    tempoSamples: [],
    stabilityScore: 1,
    rangeOfMotion: 0,
  };
  private activeCorrections: Map<string, { frameCount: number; firstDetected: number }> = new Map();
  private visibilityHistory: number[] = [];
  private landmarkBuffer: LandmarkBuffer;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.landmarkBuffer = new LandmarkBuffer(this.config.smoothingWindowSize);
  }

  /**
   * Reset engine for a new exercise
   */
  reset(exerciseCode: string): void {
    this.exerciseCode = exerciseCode as ExerciseCode;
    this.currentPhase = 'ready';
    this.previousPhase = null;
    this.repCount = 0;
    this.repStartTime = 0;
    this.lastRepTime = null;
    this.phaseStartTime = 0;
    this.calibrationFrameCount = 0;
    this.isCalibrated = false;
    this.currentRepMetrics = {
      minAngles: {},
      maxAngles: {},
      tempoSamples: [],
      stabilityScore: 1,
      rangeOfMotion: 0,
    };
    this.activeCorrections.clear();
    this.visibilityHistory = [];
    this.landmarkBuffer.clear();
  }

  /**
   * Start calibration mode
   */
  startCalibration(): void {
    this.calibrationFrameCount = 0;
    this.isCalibrated = false;
    this.currentPhase = 'calibrating';
    this.phaseStartTime = Date.now();
  }

  /**
   * Check if calibrated
   */
  isCalibrated(): boolean {
    return this.isCalibrated;
  }

  /**
   * Process landmarks and return analysis
   */
  process(
    landmarks: Record<string, Landmark>,
    visibility: { overall: number; required: number },
    timestamp: number
  ): WASMOutput {
    const startTime = performance.now();

    // Convert landmarks to array format
    const landmarkArray: Landmark[] = [];
    for (let i = 0; i < 33; i++) {
      landmarkArray[i] = landmarks[i.toString()] || {
        index: i,
        x: 0,
        y: 0,
        z: 0,
        visibility: 0,
      };
    }

    // Add to smoothing buffer
    const landmarkData = landmarkArray.map(lm => [lm.x, lm.y, lm.z, lm.visibility]);
    this.landmarkBuffer.push(landmarkData);

    // Get smoothed landmarks
    const smoothedData = this.landmarkBuffer.getSmoothed();
    if (!smoothedData) {
      return this.createOutput('error', 0, [], startTime);
    }

    // Convert back to landmark objects
    const smoothedLandmarks: Record<string, Landmark> = {};
    for (let i = 0; i < 33; i++) {
      smoothedLandmarks[i.toString()] = {
        index: i,
        x: smoothedData[i][0],
        y: smoothedData[i][1],
        z: smoothedData[i][2],
        visibility: smoothedData[i][3],
      };
    }

    // Update visibility history
    this.visibilityHistory.push(visibility.overall);
    if (this.visibilityHistory.length > 10) {
      this.visibilityHistory.shift();
    }

    // Check calibration
    if (!this.isCalibrated) {
      return this.processCalibration(visibility, startTime);
    }

    // Calculate angles
    const angles = this.calculateAngles(smoothedLandmarks);

    // Detect phase
    const phase = this.detectPhase(angles);

    // Check for rep completion
    const { isRepComplete, newRepCount } = this.checkRepCompletion(phase, timestamp);

    if (isRepComplete) {
      this.repCount = newRepCount;
      this.lastRepTime = timestamp;
      this.repStartTime = timestamp;
      this.currentRepMetrics = {
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
    this.updateRepMetrics(angles, timestamp);

    // Build output
    const currentRep = this.repCount > 0 ? {
      rangeOfMotion: this.currentRepMetrics.rangeOfMotion,
      tempoSeconds: this.calculateTempo(),
      qualityScore: this.calculateQualityScore(corrections),
      durationMs: timestamp - this.repStartTime,
      corrections: corrections.map(c => c.code),
    } : undefined;

    return {
      exercise: this.exerciseCode,
      phase,
      repCount: this.repCount,
      isRepComplete,
      currentRep,
      corrections,
      poseConfidence: visibility.overall,
      calibration: undefined,
      processingTimeMs: Math.round(performance.now() - startTime),
    };
  }

  /**
   * Process calibration
   */
  private processCalibration(
    visibility: { overall: number; required: number },
    startTime: number
  ): WASMOutput {
    this.calibrationFrameCount++;
    
    const progress = Math.min(
      1,
      this.calibrationFrameCount / this.config.calibrationFramesRequired
    );

    if (
      this.calibrationFrameCount >= this.config.calibrationFramesRequired &&
      visibility.overall >= this.config.calibrationConfidenceThreshold
    ) {
      this.isCalibrated = true;
      this.currentPhase = 'ready';
      this.phaseStartTime = Date.now();
    }

    return {
      exercise: this.exerciseCode,
      phase: 'calibrating',
      repCount: this.repCount,
      isRepComplete: false,
      currentRep: undefined,
      corrections: [],
      poseConfidence: visibility.overall,
      calibration: {
        isComplete: this.isCalibrated,
        progress,
        message: this.isCalibrated
          ? 'Ready! Begin when you are comfortable.'
          : 'Hold the starting position...',
      },
      processingTimeMs: Math.round(performance.now() - startTime),
    };
  }

  /**
   * Calculate joint angles from landmarks
   */
  private calculateAngles(landmarks: Record<string, Landmark>): Record<string, number> {
    const angles: Record<string, number> = {};

    const getPoint = (idx: string): Point3D => {
      const lm = landmarks[idx];
      return { x: lm?.x || 0, y: lm?.y || 0, z: lm?.z || 0 };
    };

    // Knee angles
    angles.left_knee = this.angleBetweenPoints(
      getPoint('23'), getPoint('25'), getPoint('27')
    );
    angles.right_knee = this.angleBetweenPoints(
      getPoint('24'), getPoint('26'), getPoint('28')
    );

    // Hip angles
    angles.left_hip = this.angleBetweenPoints(
      getPoint('25'), getPoint('23'), getPoint('11')
    );
    angles.right_hip = this.angleBetweenPoints(
      getPoint('26'), getPoint('24'), getPoint('12')
    );

    // Elbow angles
    angles.left_elbow = this.angleBetweenPoints(
      getPoint('11'), getPoint('13'), getPoint('15')
    );
    angles.right_elbow = this.angleBetweenPoints(
      getPoint('12'), getPoint('14'), getPoint('16')
    );

    // Shoulder angles
    angles.left_shoulder = this.angleBetweenPoints(
      getPoint('13'), getPoint('11'), getPoint('23')
    );
    angles.right_shoulder = this.angleBetweenPoints(
      getPoint('14'), getPoint('12'), getPoint('24')
    );

    // Torso angle
    const midShoulder: Point3D = {
      x: (getPoint('11').x + getPoint('12').x) / 2,
      y: (getPoint('11').y + getPoint('12').y) / 2,
      z: (getPoint('11').z + getPoint('12').z) / 2,
    };
    const midHip: Point3D = {
      x: (getPoint('23').x + getPoint('24').x) / 2,
      y: (getPoint('23').y + getPoint('24').y) / 2,
      z: (getPoint('23').z + getPoint('24').z) / 2,
    };
    angles.torso_angle = this.angleBetweenPoints(
      { x: midShoulder.x, y: midShoulder.y - 1, z: midShoulder.z },
      midShoulder,
      midHip
    );

    return angles;
  }

  /**
   * Calculate angle between three points
   */
  private angleBetweenPoints(a: Point3D, b: Point3D, c: Point3D): number {
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
   * Detect current exercise phase
   */
  private detectPhase(angles: Record<string, number>): ExercisePhase {
    const kneeAngle = angles.left_knee || 170;
    const elbowAngle = angles.left_elbow || 180;

    switch (this.exerciseCode) {
      case 'squat':
      case 'lunge':
        if (kneeAngle > 150) return 'ready';
        if (kneeAngle < 100) return 'bottom';
        if (this.currentPhase === 'bottom') return 'ascending';
        return 'descending';

      case 'push_up':
      case 'shoulder_press':
        if (elbowAngle > 160) return 'ready';
        if (elbowAngle < 90) return 'bottom';
        if (this.currentPhase === 'bottom') return 'ascending';
        return 'descending';

      case 'plank':
        return 'holding';

      default:
        return 'ready';
    }
  }

  /**
   * Check for rep completion
   */
  private checkRepCompletion(
    phase: ExercisePhase,
    timestamp: number
  ): { isRepComplete: boolean; newRepCount: number } {
    const phaseDuration = timestamp - this.phaseStartTime;

    // Minimum phase duration
    if (phaseDuration < this.config.minPhaseDurationMs) {
      return { isRepComplete: false, newRepCount: this.repCount };
    }

    // Cooldown check
    if (this.lastRepTime !== null) {
      if (timestamp - this.lastRepTime < this.config.repCooldownMs) {
        return { isRepComplete: false, newRepCount: this.repCount };
      }
    }

    // Phase transition detection for rep completion
    if (this.previousPhase === 'ascending' && phase === 'ready') {
      return {
        isRepComplete: true,
        newRepCount: this.repCount + 1,
      };
    }

    // Update phase tracking
    if (this.currentPhase !== phase) {
      this.previousPhase = this.currentPhase;
      this.currentPhase = phase;
      this.phaseStartTime = timestamp;
    }

    return { isRepComplete: false, newRepCount: this.repCount };
  }

  /**
   * Evaluate form rules
   */
  private evaluateFormRules(angles: Record<string, number>): CorrectionResult[] {
    const corrections: CorrectionResult[] = [];

    // Common rules
    if (angles.torso_angle > 45) {
      if (this.shouldTriggerCorrection('FORWARD_LEAN_TOO_MUCH')) {
        corrections.push({
          code: 'FORWARD_LEAN_TOO_MUCH',
          severity: 'warning',
          confidence: 0.85,
          side: 'both',
        });
      }
    }

    // Squat depth
    if (this.exerciseCode === 'squat' && this.currentPhase === 'bottom') {
      if (angles.left_knee > 100) {
        if (this.shouldTriggerCorrection('SQUAT_NOT_DEEP_ENOUGH')) {
          corrections.push({
            code: 'SQUAT_NOT_DEEP_ENOUGH',
            severity: 'hint',
            confidence: 0.8,
            side: 'both',
          });
        }
      }
    }

    // Plank rules
    if (this.exerciseCode === 'plank') {
      // Hip sagging detection (simplified)
      if (angles.torso_angle > 160) {
        if (this.shouldTriggerCorrection('HIP_PIKING_UP')) {
          corrections.push({
            code: 'HIP_PIKING_UP',
            severity: 'warning',
            confidence: 0.75,
            side: 'both',
          });
        }
      }
    }

    return corrections;
  }

  /**
   * Check if correction should trigger
   */
  private shouldTriggerCorrection(code: string): boolean {
    const active = this.activeCorrections.get(code);
    
    if (!active) {
      this.activeCorrections.set(code, {
        frameCount: 1,
        firstDetected: Date.now(),
      });
      return false;
    }

    active.frameCount++;
    
    if (active.frameCount >= 3) {
      this.activeCorrections.delete(code);
      return true;
    }

    return false;
  }

  /**
   * Update rep metrics
   */
  private updateRepMetrics(angles: Record<string, number>, timestamp: number): void {
    const metrics = this.currentRepMetrics;

    // Update angle ranges
    for (const [joint, angle] of Object.entries(angles)) {
      if (metrics.minAngles[joint] === undefined) {
        metrics.minAngles[joint] = angle;
      }
      if (metrics.maxAngles[joint] === undefined) {
        metrics.maxAngles[joint] = angle;
      }

      metrics.minAngles[joint] = Math.min(metrics.minAngles[joint], angle);
      metrics.maxAngles[joint] = Math.max(metrics.maxAngles[joint], angle);
    }

    // Calculate range of motion
    const kneeMin = metrics.minAngles.left_knee ?? 180;
    const kneeMax = metrics.maxAngles.left_knee ?? 0;
    if (kneeMax > kneeMin + 10) {
      metrics.rangeOfMotion = Math.min(1, (kneeMax - kneeMin) / 100);
    }

    // Update tempo sample
    if (this.repStartTime > 0) {
      const tempo = (timestamp - this.repStartTime) / 1000;
      if (tempo > 0) {
        metrics.tempoSamples.push(tempo);
        if (metrics.tempoSamples.length > 10) {
          metrics.tempoSamples.shift();
        }
      }
    }
  }

  /**
   * Calculate average tempo
   */
  private calculateTempo(): number {
    const samples = this.currentRepMetrics.tempoSamples;
    if (samples.length === 0) return 0;
    return samples.reduce((a, b) => a + b, 0) / samples.length;
  }

  /**
   * Calculate quality score
   */
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

  /**
   * Create output object
   */
  private createOutput(
    phase: string,
    repCount: number,
    corrections: CorrectionResult[],
    startTime: number
  ): WASMOutput {
    return {
      exercise: this.exerciseCode,
      phase,
      repCount,
      isRepComplete: false,
      currentRep: undefined,
      corrections,
      poseConfidence: 0,
      calibration: undefined,
      processingTimeMs: Math.round(performance.now() - startTime),
    };
  }

  /**
   * Get current state
   */
  getState(): EngineState {
    return {
      exerciseCode: this.exerciseCode,
      currentPhase: this.currentPhase,
      previousPhase: this.previousPhase ?? undefined,
      repCount: this.repCount,
      repStartTime: this.repStartTime,
      lastRepTime: this.lastRepTime ?? undefined,
      phaseStartTime: this.phaseStartTime,
      calibrationFrameCount: this.calibrationFrameCount,
      isCalibrated: this.isCalibrated,
      currentRepMetrics: this.currentRepMetrics,
      activeCorrections: Object.fromEntries(this.activeCorrections),
      visibilityHistory: [...this.visibilityHistory],
    };
  }

  /**
   * Get version
   */
  version(): string {
    return '1.0.0';
  }
}

// Export singleton
let engineInstance: MobileExerciseEngine | null = null;

export function getExerciseEngine(): MobileExerciseEngine {
  if (!engineInstance) {
    engineInstance = new MobileExerciseEngine();
  }
  return engineInstance;
}
