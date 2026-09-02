/**
 * AIVO Fitness Types - Pose and Landmark Types
 * Shared contracts for pose detection and exercise coaching
 */
import { z } from 'zod';
export declare const LANDMARK_INDICES: {
    readonly NOSE: 0;
    readonly LEFT_EYE_INNER: 1;
    readonly LEFT_EYE: 2;
    readonly LEFT_EYE_OUTER: 3;
    readonly RIGHT_EYE_INNER: 4;
    readonly RIGHT_EYE: 5;
    readonly RIGHT_EYE_OUTER: 6;
    readonly LEFT_EAR: 7;
    readonly RIGHT_EAR: 8;
    readonly MOUTH_LEFT: 9;
    readonly MOUTH_RIGHT: 10;
    readonly LEFT_SHOULDER: 11;
    readonly RIGHT_SHOULDER: 12;
    readonly LEFT_ELBOW: 13;
    readonly RIGHT_ELBOW: 14;
    readonly LEFT_WRIST: 15;
    readonly RIGHT_WRIST: 16;
    readonly LEFT_PINKY: 17;
    readonly RIGHT_PINKY: 18;
    readonly LEFT_INDEX: 19;
    readonly RIGHT_INDEX: 20;
    readonly LEFT_THUMB: 21;
    readonly RIGHT_THUMB: 22;
    readonly LEFT_HIP: 23;
    readonly RIGHT_HIP: 24;
    readonly LEFT_HEEL: 29;
    readonly RIGHT_HEEL: 30;
    readonly LEFT_FOOT_INDEX: 31;
    readonly RIGHT_FOOT_INDEX: 32;
};
export type LandmarkIndex = (typeof LANDMARK_INDICES)[keyof typeof LANDMARK_INDICES];
export declare const LANDMARK_PAIRS: {
    readonly left: readonly [11, 13, 15, 17, 19, 21, 23, 29, 31];
    readonly right: readonly [12, 14, 16, 18, 20, 22, 24, 30, 32];
};
/**
 * Single landmark point with position and visibility
 */
export declare const landmarkSchema: z.ZodObject<{
    index: z.ZodNumber;
    x: z.ZodNumber;
    y: z.ZodNumber;
    z: z.ZodNumber;
    visibility: z.ZodNumber;
}, z.core.$strip>;
export type Landmark = z.infer<typeof landmarkSchema>;
/**
 * Full pose detection result
 */
export declare const poseLandmarksSchema: z.ZodObject<{
    timestampMs: z.ZodNumber;
    landmarks: z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
        visibility: z.ZodNumber;
    }, z.core.$strip>>;
    worldLandmarks: z.ZodOptional<z.ZodArray<z.ZodObject<{
        index: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
        visibility: z.ZodNumber;
    }, z.core.$strip>>>;
}, z.core.$strip>;
export type PoseLandmarks = z.infer<typeof poseLandmarksSchema>;
/**
 * Normalized pose with confidence filtering applied
 */
export declare const normalizedPoseSchema: z.ZodObject<{
    timestampMs: z.ZodNumber;
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
        keyJoints: z.ZodNumber;
    }, z.core.$strip>;
    bodyScale: z.ZodOptional<z.ZodNumber>;
    orientation: z.ZodDefault<z.ZodEnum<{
        front: "front";
        side_left: "side_left";
        side_right: "side_right";
        unknown: "unknown";
    }>>;
    isMirrored: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strip>;
export type NormalizedPose = z.infer<typeof normalizedPoseSchema>;
export declare const CAMERA_ORIENTATION: {
    readonly FRONT: 'front';
    readonly SIDE_LEFT: 'side_left';
    readonly SIDE_RIGHT: 'side_right';
};
export type CameraOrientation = (typeof CAMERA_ORIENTATION)[keyof typeof CAMERA_ORIENTATION];
/**
 * Camera setup requirements for exercises
 */
export declare const cameraSetupSchema: z.ZodObject<{
    requiredOrientation: z.ZodEnum<{
        any: "any";
        front: "front";
        side_left: "side_left";
        side_right: "side_right";
    }>;
    minDistance: z.ZodDefault<z.ZodEnum<{
        close: "close";
        far: "far";
        medium: "medium";
    }>>;
    requiredJoints: z.ZodArray<z.ZodString>;
    excludedAngles: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
    minJointVisibility: z.ZodDefault<z.ZodNumber>;
    calibrationDurationMs: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type CameraSetup = z.infer<typeof cameraSetupSchema>;
/**
 * Pose processing configuration
 */
export declare const poseProcessingConfigSchema: z.ZodObject<{
    targetFps: z.ZodDefault<z.ZodNumber>;
    frameSkipCount: z.ZodDefault<z.ZodNumber>;
    minLandmarkVisibility: z.ZodDefault<z.ZodNumber>;
    minRequiredVisibility: z.ZodDefault<z.ZodNumber>;
    smoothingWindowSize: z.ZodDefault<z.ZodNumber>;
    smoothingWeight: z.ZodDefault<z.ZodNumber>;
    outlierThreshold: z.ZodDefault<z.ZodNumber>;
    consecutiveFramesRequired: z.ZodDefault<z.ZodNumber>;
    calibrationFramesRequired: z.ZodDefault<z.ZodNumber>;
    calibrationConfidenceThreshold: z.ZodDefault<z.ZodNumber>;
}, z.core.$strip>;
export type PoseProcessingConfig = z.infer<typeof poseProcessingConfigSchema>;
export declare const PERFORMANCE_MODE: {
    readonly HIGH_ACCURACY: 'high_accuracy';
    readonly BALANCED: 'balanced';
    readonly BATTERY_SAVER: 'battery_saver';
};
export type PerformanceMode = (typeof PERFORMANCE_MODE)[keyof typeof PERFORMANCE_MODE];
/**
 * Performance mode configurations
 */
export declare const PERFORMANCE_CONFIGS: Record<PerformanceMode, {
    targetFps: number;
    smoothingWindowSize: number;
    minLandmarkVisibility: number;
}>;
export declare const poseTypes: {
    readonly LANDMARK_INDICES: {
        readonly NOSE: 0;
        readonly LEFT_EYE_INNER: 1;
        readonly LEFT_EYE: 2;
        readonly LEFT_EYE_OUTER: 3;
        readonly RIGHT_EYE_INNER: 4;
        readonly RIGHT_EYE: 5;
        readonly RIGHT_EYE_OUTER: 6;
        readonly LEFT_EAR: 7;
        readonly RIGHT_EAR: 8;
        readonly MOUTH_LEFT: 9;
        readonly MOUTH_RIGHT: 10;
        readonly LEFT_SHOULDER: 11;
        readonly RIGHT_SHOULDER: 12;
        readonly LEFT_ELBOW: 13;
        readonly RIGHT_ELBOW: 14;
        readonly LEFT_WRIST: 15;
        readonly RIGHT_WRIST: 16;
        readonly LEFT_PINKY: 17;
        readonly RIGHT_PINKY: 18;
        readonly LEFT_INDEX: 19;
        readonly RIGHT_INDEX: 20;
        readonly LEFT_THUMB: 21;
        readonly RIGHT_THUMB: 22;
        readonly LEFT_HIP: 23;
        readonly RIGHT_HIP: 24;
        readonly LEFT_HEEL: 29;
        readonly RIGHT_HEEL: 30;
        readonly LEFT_FOOT_INDEX: 31;
        readonly RIGHT_FOOT_INDEX: 32;
    };
    readonly LANDMARK_PAIRS: {
        readonly left: readonly [11, 13, 15, 17, 19, 21, 23, 29, 31];
        readonly right: readonly [12, 14, 16, 18, 20, 22, 24, 30, 32];
    };
    readonly CAMERA_ORIENTATION: {
        readonly FRONT: 'front';
        readonly SIDE_LEFT: 'side_left';
        readonly SIDE_RIGHT: 'side_right';
    };
    readonly PERFORMANCE_MODE: {
        readonly HIGH_ACCURACY: 'high_accuracy';
        readonly BALANCED: 'balanced';
        readonly BATTERY_SAVER: 'battery_saver';
    };
    readonly PERFORMANCE_CONFIGS: Record<PerformanceMode, {
        targetFps: number;
        smoothingWindowSize: number;
        minLandmarkVisibility: number;
    }>;
    readonly landmarkSchema: z.ZodObject<{
        index: z.ZodNumber;
        x: z.ZodNumber;
        y: z.ZodNumber;
        z: z.ZodNumber;
        visibility: z.ZodNumber;
    }, z.core.$strip>;
    readonly poseLandmarksSchema: z.ZodObject<{
        timestampMs: z.ZodNumber;
        landmarks: z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
            visibility: z.ZodNumber;
        }, z.core.$strip>>;
        worldLandmarks: z.ZodOptional<z.ZodArray<z.ZodObject<{
            index: z.ZodNumber;
            x: z.ZodNumber;
            y: z.ZodNumber;
            z: z.ZodNumber;
            visibility: z.ZodNumber;
        }, z.core.$strip>>>;
    }, z.core.$strip>;
    readonly normalizedPoseSchema: z.ZodObject<{
        timestampMs: z.ZodNumber;
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
            keyJoints: z.ZodNumber;
        }, z.core.$strip>;
        bodyScale: z.ZodOptional<z.ZodNumber>;
        orientation: z.ZodDefault<z.ZodEnum<{
            front: "front";
            side_left: "side_left";
            side_right: "side_right";
            unknown: "unknown";
        }>>;
        isMirrored: z.ZodDefault<z.ZodBoolean>;
    }, z.core.$strip>;
    readonly cameraSetupSchema: z.ZodObject<{
        requiredOrientation: z.ZodEnum<{
            any: "any";
            front: "front";
            side_left: "side_left";
            side_right: "side_right";
        }>;
        minDistance: z.ZodDefault<z.ZodEnum<{
            close: "close";
            far: "far";
            medium: "medium";
        }>>;
        requiredJoints: z.ZodArray<z.ZodString>;
        excludedAngles: z.ZodOptional<z.ZodArray<z.ZodNumber>>;
        minJointVisibility: z.ZodDefault<z.ZodNumber>;
        calibrationDurationMs: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
    readonly poseProcessingConfigSchema: z.ZodObject<{
        targetFps: z.ZodDefault<z.ZodNumber>;
        frameSkipCount: z.ZodDefault<z.ZodNumber>;
        minLandmarkVisibility: z.ZodDefault<z.ZodNumber>;
        minRequiredVisibility: z.ZodDefault<z.ZodNumber>;
        smoothingWindowSize: z.ZodDefault<z.ZodNumber>;
        smoothingWeight: z.ZodDefault<z.ZodNumber>;
        outlierThreshold: z.ZodDefault<z.ZodNumber>;
        consecutiveFramesRequired: z.ZodDefault<z.ZodNumber>;
        calibrationFramesRequired: z.ZodDefault<z.ZodNumber>;
        calibrationConfidenceThreshold: z.ZodDefault<z.ZodNumber>;
    }, z.core.$strip>;
};
export default poseTypes;
//# sourceMappingURL=pose.d.ts.map