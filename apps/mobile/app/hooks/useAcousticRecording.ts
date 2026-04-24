import { useState, useCallback, useRef, useEffect } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import type { AcousticFeatures, BaselineData, FatigueResult, AcousticSession, MuscleGroup } from '@aivo/shared-types';

// WASM module will be available at runtime
declare const AcousticMyography: {
  init(): Promise<string>;
  processAudioChunk(pcmData: Int16Array, timestampMs: number): string;
  calculateFatigueScore(featuresJson: string, baselineJson: string): string;
  calibrateBaseline(pcmData: Int16Array): string;
  isExerciseSignal(pcmData: Int16Array): boolean;
  getRecommendedConfig(): string;
  recommendedSampleRate(): number;
  recommendedChunkDurationMs(): number;
};

export interface UseAcousticRecordingReturn {
  // State
  isRecording: boolean;
  isProcessing: boolean;
  sessionId: string | null;
  currentFatigue: FatigueResult | null;
  sessionStats: SessionStats | null;
  error: string | null;

  // Actions
  startSession: (options: StartSessionOptions) => Promise<void>;
  stopSession: () => Promise<AcousticSession | null>;
  processChunk: (audioData: Int16Array) => Promise<AcousticFeatures>;
  calculateFatigue: (features: AcousticFeatures, baseline?: BaselineData) => FatigueResult;
  calibrateBaseline: (audioData: Int16Array) => Promise<BaselineData>;
  saveBaseline: (muscleGroup: MuscleGroup, baseline: BaselineData) => Promise<void>;
  getBaseline: (muscleGroup: MuscleGroup) => Promise<BaselineData | null>;
}

export interface StartSessionOptions {
  muscleGroup: MuscleGroup;
  exerciseName?: string;
  workoutId?: string;
  baselineId?: string;
  onChunk?: (features: AcousticFeatures) => void;
  onFatigue?: (fatigue: FatigueResult) => void;
}

export interface SessionStats {
  startTime: number;
  chunkCount: number;
  validChunkCount: number;
  peakFatigue: number;
  avgFatigue: number;
}

const DEFAULT_SAMPLE_RATE = 8000;
const CHUNK_DURATION_MS = 500;

export function useAcousticRecording(): UseAcousticRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentFatigue, setCurrentFatigue] = useState<FatigueResult | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Refs for audio recording
  const recordingRef = useRef<Audio.Recording | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const sessionOptionsRef = useRef<StartSessionOptions | null>(null);
  const chunkCounterRef = useRef<number>(0);
  const validChunksRef = useRef<number>(0);
  const fatigueSamplesRef = useRef<number[]>([]);

  // Store callbacks from options
  const onFatigueRef = useRef<((f: FatigueResult) => void) | null>(null);
  const onChunkRef = useRef<((f: AcousticFeatures) => void) | null>(null);

  // Initialize WASM module
  useEffect(() => {
    AcousticMyography.init().catch(() => {
      // Silent fail - WASM init errors handled at usage time
    });
  }, []);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
  }, []);

  /**
   * Configure audio session for recording
   */
  const configureAudio = useCallback(async (): Promise<void> => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: 1,
      interruptionModeAndroid: 1,
      staysActiveInBackground: false,
    });
  }, []);

  /**
   * Processing loop - called periodically to process audio chunks
   */
  const startProcessingLoop = useCallback(() => {
    const processInterval = setInterval(() => {
      if (!recordingRef.current || !isRecording) {
        clearInterval(processInterval);
        return;
      }

      recordingRef.current.getStatusAsync().then((status) => {
        if (status.isRecording !== true) {
          clearInterval(processInterval);
          return;
        }

        // Production implementation would process audio chunks here
      }).catch(() => {
        // Silently ignore processing errors
      });
    }, CHUNK_DURATION_MS);
  }, [isRecording]);

  /**
   * Start a new acoustic monitoring session
   */
  const startSession = useCallback(async (options: StartSessionOptions): Promise<void> => {
    setError(null);

    if (!(await requestPermission())) {
      setError('Microphone permission denied');
      return;
    }

    try {
      await configureAudio();

      // Load baseline if provided
      if (options.baselineId) {
        // TODO: Load baseline from storage
      }

      const recordingOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY;

      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();

      recordingRef.current = recording;
      sessionOptionsRef.current = options;
      sessionStartTimeRef.current = Date.now();
      chunkCounterRef.current = 0;
      validChunksRef.current = 0;
      fatigueSamplesRef.current = [];
      setSessionId(crypto.randomUUID());
      setIsRecording(true);
      setSessionStats({
        startTime: sessionStartTimeRef.current,
        chunkCount: 0,
        validChunkCount: 0,
        peakFatigue: 0,
        avgFatigue: 0,
      });

      // Store callbacks
      onFatigueRef.current = options.onFatigue || null;
      onChunkRef.current = options.onChunk || null;

      // Start processing loop
      startProcessingLoop();
    } catch {
      setError('Failed to start recording');
    }
  }, [requestPermission, configureAudio, startProcessingLoop]);

  /**
   * Process an audio chunk (call this with PCM data from native module)
   */
  const processChunk = useCallback(async (pcmData: Int16Array): Promise<AcousticFeatures> => {
    setIsProcessing(true);
    chunkCounterRef.current++;

    try {
      const resultJson = AcousticMyography.processAudioChunk(pcmData, Date.now() - sessionStartTimeRef.current);
      const features: AcousticFeatures = JSON.parse(resultJson);

      if (features.isValid) {
        validChunksRef.current++;
      }

      // Update session stats
      if (sessionStats) {
        setSessionStats({
          ...sessionStats,
          chunkCount: chunkCounterRef.current,
          validChunkCount: validChunksRef.current,
        });
      }

      // Emit chunk processed event
      if (onChunkRef.current) {
        onChunkRef.current(features);
      }

      return features;
    } finally {
      setIsProcessing(false);
    }
  }, [sessionStats]);

  /**
   * Calculate fatigue from features and baseline
   */
  const calculateFatigue = useCallback((features: AcousticFeatures, baseline?: BaselineData): FatigueResult => {
    const baselineJson = baseline ? JSON.stringify(baseline) : '';
    const featuresJson = JSON.stringify(features);

    const resultJson = AcousticMyography.calculateFatigueScore(featuresJson, baselineJson);
    const result: FatigueResult = JSON.parse(resultJson);

    setCurrentFatigue(result);

    // Track fatigue samples for trend
    fatigueSamplesRef.current.push(result.fatigueLevel);

    // Emit fatigue update
    if (onFatigueRef.current) {
      onFatigueRef.current(result);
    }

    return result;
  }, []);

  /**
   * Calibrate baseline from resting muscle recording
   */
  const calibrateBaseline = useCallback(async (pcmData: Int16Array): Promise<BaselineData> => {
    setIsProcessing(true);
    try {
      const baselineJson = AcousticMyography.calibrateBaseline(pcmData);
      const baseline: BaselineData = JSON.parse(baselineJson);
      return baseline;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * Save baseline to storage
   */
  const saveBaseline = useCallback(async (muscleGroup: MuscleGroup, baseline: BaselineData): Promise<void> => {
    const storageKey = `baseline_${muscleGroup}`;
    const data = JSON.stringify(baseline);

    const filePath = `${FileSystem.Paths.document.uri}${storageKey}.json`;
    await FileSystem.writeAsStringAsync(filePath, data);
  }, []);

  /**
   * Get baseline from storage
   */
  const getBaseline = useCallback(async (muscleGroup: MuscleGroup): Promise<BaselineData | null> => {
    try {
      const storageKey = `baseline_${muscleGroup}`;
      const filePath = `${FileSystem.Paths.document.uri}${storageKey}.json`;
      const data = await FileSystem.readAsStringAsync(filePath);
      return JSON.parse(data) as BaselineData;
    } catch {
      return null;
    }
  }, []);

  /**
   * Stop the current session
   */
  const stopSession = useCallback(async (): Promise<AcousticSession | null> => {
    if (!sessionId || !isRecording) {
      return null;
    }

    try {
      await recordingRef.current?.stopAndUnloadAsync();
      recordingRef.current = null;
      setIsRecording(false);

      const endTime = Date.now();

      // Calculate session aggregates
      const avgFatigue = fatigueSamplesRef.current.length > 0
        ? fatigueSamplesRef.current.reduce((a, b) => a + b, 0) / fatigueSamplesRef.current.length
        : 0;

      const peakFatigue = fatigueSamplesRef.current.length > 0
        ? Math.max(...fatigueSamplesRef.current)
        : 0;

      // Determine fatigue trend
      const trend = determineFatigueTrend(fatigueSamplesRef.current);

      const session: AcousticSession = {
        id: sessionId,
        userId: '',
        exerciseName: sessionOptionsRef.current?.exerciseName || '',
        muscleGroup: sessionOptionsRef.current?.muscleGroup || 'core',
        startTime: sessionStartTimeRef.current,
        endTime,
        totalChunks: chunkCounterRef.current,
        validChunks: validChunksRef.current,
        avgFatigueLevel: avgFatigue,
        peakFatigueLevel: peakFatigue,
        fatigueTrend: trend,
        metadata: {
          deviceType: 'iphone',
          sampleRate: DEFAULT_SAMPLE_RATE,
        },
        createdAt: Date.now(),
      };

      // Reset state
      setSessionId(null);
      setSessionStats(null);
      fatigueSamplesRef.current = [];

      return session;
    } catch {
      setError('Failed to stop session');
      return null;
    }
  }, [sessionId, isRecording]);

  return {
    isRecording,
    isProcessing,
    sessionId,
    currentFatigue,
    sessionStats,
    error,
    startSession,
    stopSession,
    processChunk,
    calculateFatigue,
    calibrateBaseline,
    saveBaseline,
    getBaseline,
  };
}

/**
 * Determine fatigue trend from samples
 */
function determineFatigueTrend(samples: number[]): 'improving' | 'stable' | 'declining' {
  if (samples.length < 3) {
    return 'stable';
  }

  const recent = samples.slice(-10);
  const n = recent.length;
  const sumX = recent.reduce((sum, _, i) => sum + i, 0);
  const sumY = recent.reduce((sum, val) => sum + val, 0);
  const sumXY = recent.reduce((sum, val, i) => sum + i * val, 0);
  const sumX2 = recent.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  if (slope > 5) {
    return 'declining';
  }
  if (slope < -5) {
    return 'improving';
  }
  return 'stable';
}
