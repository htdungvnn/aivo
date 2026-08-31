/**
 * AIVO Fitness Types - Pose and Landmark Types
 * Shared contracts for pose detection and exercise coaching
 */

import { z } from 'zod';

// =============================================================================
// Landmark Index Definitions (MediaPipe Pose 33 landmarks)
// =============================================================================

export const LANDMARK_INDICES = {
  // Face
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
  
  // Upper Body
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
  
  // Torso
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

export type LandmarkIndex = (typeof LANDMARK_INDICES)[keyof typeof LANDMARK_INDICES];

// Body side mapping for symmetric joints
export const LANDMARK_PAIRS = {
  left: [11, 13, 15, 17, 19, 21, 23, 29, 31] as const,
  right: [12, 14, 16, 18, 20, 22, 24, 30, 32] as const,
} as const;

// =============================================================================
// Pose Landmark Schema
// =============================================================================

/**
 * Single landmark point with position and visibility
 */
export const landmarkSchema = z.object({
  index: z.number().int().min(0).max(32),
  x: z.number().min(-1).max(2), // Normalized coordinates
  y: z.number().min(-1).max(2),
  z: z.number(), // Depth (relative to hip center)
  visibility: z.number().min(0).max(1), // Confidence score
});

export type Landmark = z.infer<typeof landmarkSchema>;

/**
 * Full pose detection result
 */
export const poseLandmarksSchema = z.object({
  timestampMs: z.number().int().positive(),
  landmarks: z.array(landmarkSchema).length(33), // MediaPipe Pose has 33 landmarks
  worldLandmarks: z.array(landmarkSchema).length(33).optional(), // World coordinates
});

export type PoseLandmarks = z.infer<typeof poseLandmarksSchema>;

/**
 * Normalized pose with confidence filtering applied
 */
export const normalizedPoseSchema = z.object({
  timestampMs: z.number().int().positive(),
  landmarks: z.record(z.string(), landmarkSchema), // Keyed by landmark name
  visibility: z.object({
    overall: z.number().min(0).max(1),
    required: z.number().min(0).max(1),
    keyJoints: z.number().min(0).max(1),
  }),
  bodyScale: z.number().positive().optional(), // Normalized body size
  orientation: z.enum(['front', 'side_left', 'side_right', 'unknown']).default('unknown'),
  isMirrored: z.boolean().default(false),
});

export type NormalizedPose = z.infer<typeof normalizedPoseSchema>;

// =============================================================================
// Camera Configuration
// =============================================================================

export const CAMERA_ORIENTATION = {
  FRONT: 'front',
  SIDE_LEFT: 'side_left',
  SIDE_RIGHT: 'side_right',
} as const;

export type CameraOrientation = (typeof CAMERA_ORIENTATION)[keyof typeof CAMERA_ORIENTATION];

/**
 * Camera setup requirements for exercises
 */
export const cameraSetupSchema = z.object({
  requiredOrientation: z.enum(['front', 'side_left', 'side_right', 'any']),
  minDistance: z.enum(['close', 'medium', 'far']).default('medium'),
  requiredJoints: z.array(z.string()),
  excludedAngles: z.array(z.number()).optional(),
  minJointVisibility: z.number().min(0).max(1).default(0.5),
  calibrationDurationMs: z.number().int().positive().default(2000),
});

export type CameraSetup = z.infer<typeof cameraSetupSchema>;

// =============================================================================
// Processing Configuration
// =============================================================================

/**
 * Pose processing configuration
 */
export const poseProcessingConfigSchema = z.object({
  // Frame sampling
  targetFps: z.number().int().positive().default(30),
  frameSkipCount: z.number().int().min(0).default(0),
  
  // Visibility filtering
  minLandmarkVisibility: z.number().min(0).max(1).default(0.4),
  minRequiredVisibility: z.number().min(0).max(1).default(0.6),
  
  // Temporal smoothing
  smoothingWindowSize: z.number().int().min(1).max(10).default(5),
  smoothingWeight: z.number().min(0).max(1).default(0.8),
  
  // Outlier rejection
  outlierThreshold: z.number().min(0).max(1).default(0.3),
  consecutiveFramesRequired: z.number().int().min(1).max(10).default(3),
  
  // Calibration
  calibrationFramesRequired: z.number().int().min(10).max(100).default(30),
  calibrationConfidenceThreshold: z.number().min(0).max(1).default(0.7),
});

export type PoseProcessingConfig = z.infer<typeof poseProcessingConfigSchema>;

// =============================================================================
// Performance Modes
// =============================================================================

export const PERFORMANCE_MODE = {
  HIGH_ACCURACY: 'high_accuracy',
  BALANCED: 'balanced',
  BATTERY_SAVER: 'battery_saver',
} as const;

export type PerformanceMode = (typeof PERFORMANCE_MODE)[keyof typeof PERFORMANCE_MODE];

/**
 * Performance mode configurations
 */
export const PERFORMANCE_CONFIGS: Record<PerformanceMode, {
  targetFps: number;
  smoothingWindowSize: number;
  minLandmarkVisibility: number;
}> = {
  [PERFORMANCE_MODE.HIGH_ACCURACY]: {
    targetFps: 30,
    smoothingWindowSize: 7,
    minLandmarkVisibility: 0.3,
  },
  [PERFORMANCE_MODE.BALANCED]: {
    targetFps: 20,
    smoothingWindowSize: 5,
    minLandmarkVisibility: 0.4,
  },
  [PERFORMANCE_MODE.BATTERY_SAVER]: {
    targetFps: 15,
    smoothingWindowSize: 3,
    minLandmarkVisibility: 0.5,
  },
};

// =============================================================================
// Export all schemas and types
// =============================================================================

export const poseTypes = {
  LANDMARK_INDICES,
  LANDMARK_PAIRS,
  CAMERA_ORIENTATION,
  PERFORMANCE_MODE,
  PERFORMANCE_CONFIGS,
  
  // Schemas
  landmarkSchema,
  poseLandmarksSchema,
  normalizedPoseSchema,
  cameraSetupSchema,
  poseProcessingConfigSchema,
} as const;

export default poseTypes;
