/**
 * Mobile Coach Types
 * Type definitions for the mobile AI Coach feature
 */

// Re-export shared types
export type {
  PoseLandmarks,
  NormalizedPose,
  PoseProcessingConfig,
  PerformanceMode,
} from '@aivo/fitness-types/pose';

export type {
  ExerciseCode,
  ExercisePhase,
  ExerciseDefinition,
  SetStatus,
  RepSummary,
  SetSummary,
  WorkoutSummary,
  UserGoal,
} from '@aivo/fitness-types/exercise';

export type {
  CorrectionCode,
  CorrectionSeverity,
  CorrectionResult,
  FeedbackMessage,
} from '@aivo/fitness-types/correction';

export type {
  WorkoutSession,
  SessionStatus,
  RestTimer,
  SessionEvent,
} from '@aivo/fitness-types/workout-session';

export type {
  WorkoutPlan,
  WorkoutDay,
  PlanExercise,
  ProgressSummary,
  UserFitnessGoals,
  UserExercisePreferences,
} from '@aivo/fitness-types/plan';

export type {
  WASMInput,
  WASMOutput,
  EngineState,
} from '@aivo/fitness-types/wasm';

// =============================================================================
// Mobile-Specific Types
// =============================================================================

/**
 * Camera permission status
 */
export type CameraPermissionStatus = 'granted' | 'denied' | 'undetermined';

/**
 * Pose detection status
 */
export type PoseDetectionStatus =
  | 'idle'
  | 'initializing'
  | 'calibrating'
  | 'ready'
  | 'detecting'
  | 'pose_lost'
  | 'error';

/**
 * Workout flow state
 */
export type WorkoutFlowState =
  | 'selecting'
  | 'setup'
  | 'calibrating'
  | 'countdown'
  | 'active'
  | 'rest'
  | 'paused'
  | 'completed'
  | 'cancelled';

/**
 * Performance mode settings
 */
export interface PerformanceSettings {
  mode: 'high_accuracy' | 'balanced' | 'battery_saver';
  targetFps: number;
  smoothingWindowSize: number;
  minLandmarkVisibility: number;
}

/**
 * Feedback settings
 */
export interface FeedbackSettings {
  voiceEnabled: boolean;
  hapticEnabled: boolean;
  visualEnabled: boolean;
  language: 'en' | 'vi';
  cooldownMs: number;
  voiceVolume: number;
  voiceRate: number;
}

/**
 * Calibration result
 */
export interface CalibrationResult {
  success: boolean;
  progress: number;
  message: string;
  requiredJointsVisible: boolean;
  distanceOk: boolean;
  angleOk: boolean;
}

/**
 * Real-time pose result
 */
export interface RealtimePoseResult {
  landmarks: number[][]; // MediaPipe format
  confidence: number;
  timestamp: number;
}

/**
 * Workout set state
 */
export interface ActiveSetState {
  exerciseCode: string;
  setNumber: number;
  targetReps: number;
  completedReps: number;
  currentPhase: string;
  qualityScore: number;
  startTime: number;
  corrections: CorrectionResult[];
}

/**
 * App state for coach feature
 */
export interface CoachAppState {
  isInitialized: boolean;
  cameraPermission: CameraPermissionStatus;
  poseDetectionStatus: PoseDetectionStatus;
  currentSession: WorkoutSession | null;
  currentExerciseIndex: number;
  currentSetState: ActiveSetState | null;
  workoutFlowState: WorkoutFlowState;
  restTimer: RestTimer | null;
  settings: {
    performance: PerformanceSettings;
    feedback: FeedbackSettings;
  };
}

// =============================================================================
// Default Settings
// =============================================================================

export const DEFAULT_PERFORMANCE_SETTINGS: PerformanceSettings = {
  mode: 'balanced',
  targetFps: 20,
  smoothingWindowSize: 5,
  minLandmarkVisibility: 0.4,
};

export const DEFAULT_FEEDBACK_SETTINGS: FeedbackSettings = {
  voiceEnabled: true,
  hapticEnabled: true,
  visualEnabled: true,
  language: 'en',
  cooldownMs: 4000,
  voiceVolume: 1.0,
  voiceRate: 1.0,
};

export const DEFAULT_CALIBRATION_REQUIREMENTS = {
  minJointVisibility: 0.7,
  minFramesRequired: 30,
  holdDurationMs: 2000,
  acceptableAngleRange: 30, // degrees from ideal
};
