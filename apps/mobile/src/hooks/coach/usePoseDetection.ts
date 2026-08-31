/**
 * Pose Detection Hook
 * Manages camera and pose detection lifecycle
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { Camera, CameraDevice, CameraPermissionStatus } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import type { PoseDetectionStatus } from '../../types/coach';
import {
  createPoseProcessor,
  normalizeLandmarks,
  calculateVisibility,
  LandmarkBuffer,
} from '../../lib/coach/pose-processing';
import { getExerciseEngine } from '../../lib/coach/exercise-engine';
import { getFeedbackScheduler } from '../../lib/coach/feedback-scheduler';
import type { CorrectionResult } from '@aivo/fitness-types/correction';

interface UsePoseDetectionOptions {
  exerciseCode: string;
  onPoseDetected?: (landmarks: number[][], confidence: number) => void;
  onCorrection?: (corrections: CorrectionResult[]) => void;
  onPhaseChange?: (phase: string) => void;
  onRepCounted?: (count: number) => void;
  onCalibrationUpdate?: (progress: number, message: string) => void;
  onCalibrationComplete?: () => void;
  targetFps?: number;
  minConfidence?: number;
}

interface UsePoseDetectionReturn {
  // Camera state
  hasPermission: boolean;
  permissionStatus: CameraPermissionStatus;
  requestPermission: () => Promise<boolean>;
  
  // Camera control
  isActive: boolean;
  startCamera: () => void;
  stopCamera: () => void;
  
  // Pose detection
  status: PoseDetectionStatus;
  currentConfidence: number;
  currentPhase: string;
  repCount: number;
  activeCorrections: CorrectionResult[];
  
  // Calibration
  isCalibrated: boolean;
  calibrationProgress: number;
  startCalibration: () => void;
  
  // Settings
  updateSettings: (settings: Partial<{ targetFps: number; minConfidence: number }>) => void;
}

export function usePoseDetection(
  options: UsePoseDetectionOptions
): UsePoseDetectionReturn {
  const {
    exerciseCode,
    onPoseDetected,
    onCorrection,
    onPhaseChange,
    onRepCounted,
    onCalibrationUpdate,
    onCalibrationComplete,
    targetFps = 20,
    minConfidence = 0.5,
  } = options;

  // Camera state
  const [hasPermission, setHasPermission] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<CameraPermissionStatus>('undetermined');
  const [isActive, setIsActive] = useState(false);
  
  // Pose state
  const [status, setStatus] = useState<PoseDetectionStatus>('idle');
  const [currentConfidence, setCurrentConfidence] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('ready');
  const [repCount, setRepCount] = useState(0);
  const [activeCorrections, setActiveCorrections] = useState<CorrectionResult[]>([]);
  
  // Calibration state
  const [isCalibrated, setIsCalibrated] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // Refs
  const cameraRef = useRef<Camera>(null);
  const poseProcessorRef = useRef<ReturnType<typeof createPoseProcessor> | null>(null);
  const engineRef = useRef(getExerciseEngine());
  const feedbackRef = useRef(getFeedbackScheduler());
  const frameBufferRef = useRef<number[][][]>([]);
  const lastFrameTimeRef = useRef(0);

  // Request camera permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setPermissionStatus(status);
    setHasPermission(status === 'granted');
    return status === 'granted';
  }, []);

  // Start camera
  const startCamera = useCallback(() => {
    if (!hasPermission) {
      requestPermission().then((granted) => {
        if (granted) {
          setIsActive(true);
          setStatus('initializing');
        }
      });
    } else {
      setIsActive(true);
      setStatus('initializing');
    }
  }, [hasPermission, requestPermission]);

  // Stop camera
  const stopCamera = useCallback(() => {
    setIsActive(false);
    setStatus('idle');
    setCurrentConfidence(0);
    setActiveCorrections([]);
  }, []);

  // Start calibration
  const startCalibration = useCallback(() => {
    setStatus('calibrating');
    setCalibrationProgress(0);
    engineRef.current.reset(exerciseCode);
    engineRef.current.startCalibration();
    feedbackRef.current.speakCustom('Hold the starting position...');
  }, [exerciseCode]);

  // Update settings
  const updateSettings = useCallback((settings: Partial<{ targetFps: number; minConfidence: number }>) => {
    if (settings.targetFps !== undefined || settings.minConfidence !== undefined) {
      poseProcessorRef.current = createPoseProcessor({
        targetFps: settings.targetFps ?? targetFps,
        minLandmarkVisibility: settings.minConfidence ?? minConfidence,
      });
    }
  }, [targetFps, minConfidence]);

  // Process camera frame
  const processFrame = useCallback(async () => {
    if (!cameraRef.current || !isActive) return;

    try {
      const timestamp = Date.now();
      const frameInterval = 1000 / targetFps;
      
      // Rate limiting
      if (timestamp - lastFrameTimeRef.current < frameInterval) {
        return;
      }
      lastFrameTimeRef.current = timestamp;

      // Capture frame (simulated - actual implementation would use expo-camera's onCameraReady)
      // In production, this would be called from Camera component's onFrame prop

      // For demo purposes, we'll simulate pose detection
      // Real implementation would use expo-camera's frame processor
      const landmarks = generateDemoLandmarks();
      const visibility = calculateVisibility(landmarks);
      
      // Update current confidence
      setCurrentConfidence(visibility.required);

      // Check if pose is valid
      if (visibility.required < minConfidence) {
        setStatus('pose_lost');
        return;
      }

      // Initialize pose processor if needed
      if (!poseProcessorRef.current) {
        poseProcessorRef.current = createPoseProcessor({ targetFps });
      }

      // Process landmarks
      const result = poseProcessorRef.current.process(
        landmarks,
        1280, // imageWidth
        720,  // imageHeight
        timestamp
      );

      if (!result.processed || !result.isValid) {
        return;
      }

      // Convert to engine input format
      const landmarkInput: Record<string, { index: number; x: number; y: number; z: number; visibility: number }> = {};
      for (let i = 0; i < 33; i++) {
        landmarkInput[i.toString()] = {
          index: i,
          x: result.processed[i][0],
          y: result.processed[i][1],
          z: result.processed[i][2],
          visibility: result.processed[i][3],
        };
      }

      // Process with exercise engine
      const output = engineRef.current.process(
        landmarkInput,
        visibility,
        timestamp
      );

      // Update state
      if (output.calibration) {
        setCalibrationProgress(output.calibration.progress);
        onCalibrationUpdate?.(output.calibration.progress, output.calibration.message || '');
        
        if (output.calibration.isComplete) {
          setIsCalibrated(true);
          setStatus('ready');
          onCalibrationComplete?.();
          feedbackRef.current.speakCustom('Ready! Begin when you are comfortable.');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } else {
        setStatus('detecting');
        
        // Update phase
        if (output.phase !== currentPhase) {
          setCurrentPhase(output.phase);
          onPhaseChange?.(output.phase);
        }

        // Update rep count
        if (output.repCount !== repCount) {
          setRepCount(output.repCount);
          onRepCounted?.(output.repCount);
          feedbackRef.current.announceRepCount(output.repCount);
        }

        // Update corrections
        setActiveCorrections(output.corrections);
        onCorrection?.(output.corrections);

        // Process feedback
        feedbackRef.current.processCorrections(output.corrections, output.repCount, output.phase);
      }

      // Callback with detected pose
      onPoseDetected?.(result.processed, visibility.required);

    } catch (error) {
      console.error('Pose detection error:', error);
      setStatus('error');
    }
  }, [
    isActive,
    targetFps,
    minConfidence,
    currentPhase,
    repCount,
    onPoseDetected,
    onCorrection,
    onPhaseChange,
    onRepCounted,
    onCalibrationUpdate,
    onCalibrationComplete,
  ]);

  // Initialize
  useEffect(() => {
    // Request permission on mount
    requestPermission();
    
    // Initialize pose processor
    poseProcessorRef.current = createPoseProcessor({ targetFps });
    
    // Reset engine for exercise
    engineRef.current.reset(exerciseCode);

    return () => {
      stopCamera();
      feedbackRef.current.dispose();
    };
  }, []);

  // Update engine when exercise changes
  useEffect(() => {
    engineRef.current.reset(exerciseCode);
    setRepCount(0);
    setCurrentPhase('ready');
    setActiveCorrections([]);
  }, [exerciseCode]);

  return {
    hasPermission,
    permissionStatus,
    requestPermission,
    isActive,
    startCamera,
    stopCamera,
    status,
    currentConfidence,
    currentPhase,
    repCount,
    activeCorrections,
    isCalibrated,
    calibrationProgress,
    startCalibration,
    updateSettings,
  };
}

/**
 * Generate demo landmarks for testing
 */
function generateDemoLandmarks(): number[][] {
  const landmarks: number[][] = [];
  
  // Generate 33 landmarks with realistic positions
  for (let i = 0; i < 33; i++) {
    const x = 0.3 + Math.random() * 0.4;
    const y = 0.2 + Math.random() * 0.6;
    const z = Math.random() * 0.1;
    const visibility = 0.7 + Math.random() * 0.3;
    
    landmarks[i] = [x, y, z, visibility];
  }
  
  return landmarks;
}
