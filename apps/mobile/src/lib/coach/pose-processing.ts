/**
 * Pose Processing Utilities
 * Landmark normalization, smoothing, and filtering
 */

import type { PoseLandmarks, NormalizedPose, PoseProcessingConfig } from '@aivo/fitness-types/pose';

// MediaPipe Pose landmark indices
export const LANDMARK_INDICES = {
  NOSE: 0,
  LEFT_EYE_INNER: 1,
  LEFT_EYE: 2,
  LEFT_EYE_OUTER: 3,
  RIGHT_EYE_INNER: 4,
  RIGHT_EYE: 5,
  RIGHT_EYE_OUTER: 6,
  LEFT_EAR: 7,
  RIGHT_EAR: 8,
  MOUTH_LEFT: 9,
  MOUTH_RIGHT: 10,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_PINKY: 17,
  RIGHT_PINKY: 18,
  LEFT_INDEX: 19,
  RIGHT_INDEX: 20,
  LEFT_THUMB: 21,
  RIGHT_THUMB: 22,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

// Landmark names for key body parts
export const KEY_LANDMARKS = {
  UPPER_BODY: [11, 12, 13, 14, 15, 16], // Shoulders, elbows, wrists
  LOWER_BODY: [23, 24, 25, 26, 27, 28], // Hips, knees, ankles
  FULL_BODY: [11, 12, 23, 24, 25, 26, 27, 28], // Core joints
  UPPER_LIMBS: [11, 13, 15, 12, 14, 16], // Arms
  LOWER_LIMBS: [23, 25, 27, 24, 26, 28], // Legs
  HIPS: [23, 24],
  SHOULDERS: [11, 12],
} as const;

const DEFAULT_CONFIG: PoseProcessingConfig = {
  targetFps: 20,
  frameSkipCount: 0,
  minLandmarkVisibility: 0.4,
  minRequiredVisibility: 0.6,
  smoothingWindowSize: 5,
  smoothingWeight: 0.8,
  outlierThreshold: 0.3,
  consecutiveFramesRequired: 3,
  calibrationFramesRequired: 30,
  calibrationConfidenceThreshold: 0.7,
};

/**
 * Landmark buffer for temporal smoothing
 */
export class LandmarkBuffer {
  private buffer: number[][][] = [];
  private maxSize: number;

  constructor(windowSize: number = 5) {
    this.maxSize = windowSize;
  }

  push(landmarks: number[][]): void {
    this.buffer.push(landmarks);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }

  getSmoothed(): number[][] | null {
    if (this.buffer.length === 0) return null;

    const smoothed: number[][] = [];
    const count = this.buffer.length;

    for (let i = 0; i < 33; i++) {
      let sumX = 0, sumY = 0, sumZ = 0, sumVis = 0;

      for (const frame of this.buffer) {
        if (frame[i]) {
          sumX += frame[i][0];
          sumY += frame[i][1];
          sumZ += frame[i][2];
          sumVis += frame[i][3];
        }
      }

      smoothed[i] = [
        sumX / count,
        sumY / count,
        sumZ / count,
        sumVis / count,
      ];
    }

    return smoothed;
  }

  getLatest(): number[][] | null {
    return this.buffer.length > 0 ? this.buffer[this.buffer.length - 1] : null;
  }

  clear(): void {
    this.buffer = [];
  }

  get size(): number {
    return this.buffer.length;
  }
}

/**
 * Process raw MediaPipe landmarks into normalized format
 */
export function normalizeLandmarks(
  landmarks: number[][],
  imageWidth: number,
  imageHeight: number,
  isMirrored: boolean = true
): number[][] {
  return landmarks.map((lm, index) => {
    let x = lm[0];
    let y = lm[1];
    const z = lm[2] || 0;
    let visibility = lm[3] || 0;

    // Mirror X coordinate if using front camera (selfie mode)
    if (isMirrored) {
      x = 1 - x;
    }

    // Convert to image coordinates and back to normalized
    // This ensures consistent scale regardless of image size
    const normalizedX = x;
    const normalizedY = y;

    return [normalizedX, normalizedY, z, visibility];
  });
}

/**
 * Calculate overall pose visibility
 */
export function calculateVisibility(
  landmarks: number[][],
  requiredIndices: number[] = KEY_LANDMARKS.FULL_BODY
): { overall: number; required: number; keyJoints: number } {
  if (landmarks.length < 33) {
    return { overall: 0, required: 0, keyJoints: 0 };
  }

  // Calculate overall visibility
  let totalVis = 0;
  let requiredVis = 0;
  let keyVis = 0;

  for (let i = 0; i < 33; i++) {
    if (landmarks[i]) {
      totalVis += landmarks[i][3] || 0;
    }
  }

  const overall = totalVis / 33;

  // Calculate required joints visibility
  for (const idx of requiredIndices) {
    if (landmarks[idx]) {
      requiredVis += landmarks[idx][3] || 0;
    }
  }

  const required = requiredIndices.length > 0
    ? requiredVis / requiredIndices.length
    : 0;

  // Calculate key joints visibility (shoulders, hips, knees)
  const keyIndices = [
    LANDMARK_INDICES.LEFT_SHOULDER,
    LANDMARK_INDICES.RIGHT_SHOULDER,
    LANDMARK_INDICES.LEFT_HIP,
    LANDMARK_INDICES.RIGHT_HIP,
    LANDMARK_INDICES.LEFT_KNEE,
    LANDMARK_INDICES.RIGHT_KNEE,
  ];

  for (const idx of keyIndices) {
    if (landmarks[idx]) {
      keyVis += landmarks[idx][3] || 0;
    }
  }

  const keyJoints = keyVis / keyIndices.length;

  return { overall, required, keyJoints };
}

/**
 * Filter landmarks by visibility threshold
 */
export function filterByVisibility(
  landmarks: number[][],
  minVisibility: number = 0.4
): number[][] {
  return landmarks.map((lm) => {
    const visibility = lm[3] || 0;
    if (visibility < minVisibility) {
      return [lm[0], lm[1], lm[2], 0];
    }
    return lm;
  });
}

/**
 * Calculate body scale for normalization
 */
export function calculateBodyScale(landmarks: number[][]): number {
  if (landmarks.length < 33) return 1;

  const leftShoulder = landmarks[LANDMARK_INDICES.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];

  if (!leftShoulder || !rightShoulder) return 1;

  const shoulderWidth = Math.sqrt(
    Math.pow(rightShoulder[0] - leftShoulder[0], 2) +
    Math.pow(rightShoulder[1] - leftShoulder[1], 2)
  );

  if (shoulderWidth < 0.001) return 1;
  return 1 / shoulderWidth;
}

/**
 * Detect if pose is facing the camera (front view)
 */
export function detectCameraAngle(landmarks: number[][]): 'front' | 'side_left' | 'side_right' | 'unknown' {
  if (landmarks.length < 33) return 'unknown';

  const leftShoulder = landmarks[LANDMARK_INDICES.LEFT_SHOULDER];
  const rightShoulder = landmarks[LANDMARK_INDICES.RIGHT_SHOULDER];
  const leftHip = landmarks[LANDMARK_INDICES.LEFT_HIP];
  const rightHip = landmarks[LANDMARK_INDICES.RIGHT_HIP];

  if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) {
    return 'unknown';
  }

  // Check shoulder and hip alignment
  const shoulderDiff = Math.abs(leftShoulder[1] - rightShoulder[1]);
  const hipDiff = Math.abs(leftHip[1] - rightHip[1]);

  // If shoulders and hips are relatively level, likely front view
  if (shoulderDiff < 0.05 && hipDiff < 0.05) {
    return 'front';
  }

  // Check if left side is more visible (right side of image = side_left)
  if (leftShoulder[1] < rightShoulder[1]) {
    return 'side_right';
  }

  return 'side_left';
}

/**
 * Interpolate missing landmarks
 */
export function interpolateMissingLandmarks(
  current: number[][],
  previous: number[][] | null
): number[][] {
  if (!previous || previous.length < 33) return current;

  return current.map((lm, index) => {
    const visibility = lm[3] || 0;
    if (visibility < 0.3 && previous[index]) {
      // Interpolate position, keep current visibility
      const alpha = 0.5;
      return [
        lm[0] * (1 - alpha) + previous[index][0] * alpha,
        lm[1] * (1 - alpha) + previous[index][1] * alpha,
        lm[2] * (1 - alpha) + previous[index][2] * alpha,
        lm[3], // Keep current visibility
      ];
    }
    return lm;
  });
}

/**
 * Detect outliers using velocity
 */
export function detectOutliers(
  current: number[][],
  previous: number[][] | null,
  maxVelocity: number = 0.3
): boolean[] {
  const outliers: boolean[] = [];

  if (!previous || previous.length < 33) {
    return new Array(33).fill(false);
  }

  for (let i = 0; i < 33; i++) {
    if (!current[i] || !previous[i]) {
      outliers.push(false);
      continue;
    }

    const dx = Math.abs(current[i][0] - previous[i][0]);
    const dy = Math.abs(current[i][1] - previous[i][1]);
    const velocity = Math.sqrt(dx * dx + dy * dy);

    outliers.push(velocity > maxVelocity);
  }

  return outliers;
}

/**
 * Create a pose processing pipeline
 */
export function createPoseProcessor(config: Partial<PoseProcessingConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const buffer = new LandmarkBuffer(cfg.smoothingWindowSize);
  let lastProcessedTime = 0;
  let lastLandmarks: number[][] | null = null;

  return {
    process(
      landmarks: number[][],
      imageWidth: number,
      imageHeight: number,
      timestamp: number
    ): {
      processed: number[][] | null;
      visibility: { overall: number; required: number; keyJoints: number };
      isValid: boolean;
    } {
      // Frame rate limiting
      const frameInterval = 1000 / cfg.targetFps;
      if (timestamp - lastProcessedTime < frameInterval) {
        return {
          processed: null,
          visibility: { overall: 0, required: 0, keyJoints: 0 },
          isValid: false,
        };
      }

      // Normalize landmarks
      const normalized = normalizeLandmarks(landmarks, imageWidth, imageHeight);

      // Filter by visibility
      const filtered = filterByVisibility(normalized, cfg.minLandmarkVisibility);

      // Interpolate missing
      const interpolated = interpolateMissingLandmarks(filtered, lastLandmarks);

      // Detect outliers
      const outliers = detectOutliers(interpolated, lastLandmarks);
      const hasOutliers = outliers.some(o => o);

      // Add to smoothing buffer
      buffer.push(interpolated);

      // Get smoothed result
      const processed = buffer.getSmoothed();

      if (!processed) {
        return {
          processed: null,
          visibility: { overall: 0, required: 0, keyJoints: 0 },
          isValid: false,
        };
      }

      // Calculate visibility
      const visibility = calculateVisibility(processed);

      // Update state
      lastProcessedTime = timestamp;
      lastLandmarks = processed;

      // Check if pose is valid
      const isValid = visibility.required >= cfg.minRequiredVisibility && !hasOutliers;

      return { processed, visibility, isValid };
    },

    reset(): void {
      buffer.clear();
      lastProcessedTime = 0;
      lastLandmarks = null;
    },

    getBufferSize(): number {
      return buffer.size;
    },
  };
}
