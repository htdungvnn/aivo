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

  // Events
  onFatigueUpdate?: (fatigue: FatigueResult) => void;
  onChunkProcessed?: (features: AcousticFeatures) => void;
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
const CHUNK_SIZE = Math.floor(DEFAULT_SAMPLE_RATE * CHUNK_DURATION_MS / 1000);

export function useAcousticRecording(): UseAcousticRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentFatigue, setCurrentFatigue] = useState<FatigueResult | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [onFatigueUpdate, setOnFatigueUpdate] = useState<(f: FatigueResult) => void>(() => {});
  const [onChunkProcessed, setOnChunkProcessed] = useState<(f: AcousticFeatures) => void>(() => {});

  // Refs for audio recording
  const recordingRef = useRef<Audio.Recording | null>(null);
  const sessionStartTimeRef = useRef<number>(0);
  const sessionOptionsRef = useRef<StartSessionOptions | null>(null);
  const chunkCounterRef = useRef<number>(0);
  const validChunksRef = useRef<number>(0);
  const fatigueSamplesRef = useRef<number[]>([]);
  const baselineRef = useRef<BaselineData | null>(null);

  // Store callbacks from options
  const onFatigueRef = useRef<((f: FatigueResult) => void) | null>(null);
  const onChunkRef = useRef<((f: AcousticFeatures) => void) | null>(null);

  // Initialize WASM module
  useEffect(() => {
    AcousticMyography.init()
      .then(() => console.log('AcousticMyography initialized'))
      .catch((err) => console.error('Failed to initialize AcousticMyography:', err));
  }, []);

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      console.error('Microphone permission error:', err);
      return false;
    }
  }, []);

  /**
   * Configure audio session for recording
   */
  const configureAudio = useCallback(async (): Promise<void> => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      interruptionModeIOS: 1, // DoNotMix
      interruptionModeAndroid: 1, // DoNotMix
      staysActiveInBackground: false,
      // IMPORTANT: Use 8kHz sample rate for muscle sound analysis
      // iOS supports: 8000, 16000, 22050, 44100
      // We use 8000 because muscle sounds are 20-200Hz and Nyquist is sufficient
      // Note: sampleRate in AudioMode may not be supported, it's set in RecordingOptions
    });
  }, []);

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
        // baselineRef.current = await getBaselineFromStorage(options.baselineId);
      }

      const recordingOptions = Audio.RecordingOptionsPresets.HIGH_QUALITY;
      // For production, you would customize these for 8kHz mono PCM:
      // recordingOptions.android.sampleRate = DEFAULT_SAMPLE_RATE;
      // recordingOptions.ios.sampleRate = DEFAULT_SAMPLE_RATE;
      // recordingOptions.android.numberOfChannels = 1;
      // recordingOptions.ios.numberOfChannels = 1;

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
      onFatigueRef.current = options.onFatigue || onFatigueUpdate;
      onChunkRef.current = options.onChunk || onChunkProcessed;

      // Start processing loop
      startProcessingLoop();
    } catch (err) {
      console.error('Failed to start recording:', err);
      setError(`Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [requestPermission, configureAudio, onFatigueUpdate, onChunkProcessed]);

  /**
   * Processing loop - called periodically to process audio chunks
   */
  const startProcessingLoop = useCallback(() => {
    const processInterval = setInterval(async () => {
      if (!recordingRef.current || !isRecording) {
        clearInterval(processInterval);
        return;
      }

      try {
        // Get audio status to check if recording is still active
        const status = await recordingRef.current.getStatusAsync();
        if (status.isRecording !== true) {
          clearInterval(processInterval);
          return;
        }

        // Note: Expo AV doesn't provide direct PCM access in real-time
        // For production, we would need to:
        // 1. Use a custom audio module with native code to access raw PCM
        // 2. Or periodically save to file and read chunks
        // 3. Or use expo-audio with Audio.Recording and read from URI

        // This is a simplified implementation that shows the processing flow
        // In production, you'd implement a native module or use a different approach

        // For now, we'll simulate chunk processing since Expo AV doesn't expose PCM directly
        // The actual implementation would require custom native code or a different library

      } catch (err) {
        console.error('Processing loop error:', err);
      }
    }, CHUNK_DURATION_MS);
  }, [isRecording]);

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

    // Use new FileSystem API with Paths.document
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
      const duration = endTime - sessionStartTimeRef.current;

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
        userId: '', // Would be populated from auth context
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
          deviceType: 'iphone', // Would detect platform
          sampleRate: DEFAULT_SAMPLE_RATE,
        },
        createdAt: Date.now(),
      };

      // Reset state
      setSessionId(null);
      setSessionStats(null);
      fatigueSamplesRef.current = [];

      return session;
    } catch (err) {
      console.error('Failed to stop session:', err);
      setError(`Failed to stop session: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
    onFatigueUpdate,
    onChunkProcessed,
  };
}

/**
 * Determine fatigue trend from samples
 */
function determineFatigueTrend(samples: number[]): 'improving' | 'stable' | 'declining' {
  if (samples.length < 3) return 'stable';

  // Simple linear regression on last 10 samples or all if less
  const recent = samples.slice(-10);
  const n = recent.length;
  const sumX = recent.reduce((sum, _, i) => sum + i, 0);
  const sumY = recent.reduce((sum, val) => sum + val, 0);
  const sumXY = recent.reduce((sum, val, i) => sum + i * val, 0);
  const sumX2 = recent.reduce((sum, _, i) => sum + i * i, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

  if (slope > 5) return 'declining'; // Fatigue increasing
  if (slope < -5) return 'improving'; // Fatigue decreasing
  return 'stable';
}
