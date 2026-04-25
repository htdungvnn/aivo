import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import type { StartSessionOptions } from '../../hooks/useAcousticRecording';
import { useAcousticRecording } from '../../hooks/useAcousticRecording';
import type { MuscleGroup, FatigueResult, AcousticFeatures } from '@aivo/shared-types';

interface AcousticFatigueMonitorProps {
  userId: string;
  muscleGroup: MuscleGroup;
  exerciseName?: string;
  onFatigueChange?: (fatigue: number, category: string) => void;
  onRecommendation?: (recommendation: string) => void;
}

export const AcousticFatigueMonitor: React.FC<AcousticFatigueMonitorProps> = ({
  muscleGroup,
  exerciseName = 'exercise',
  onFatigueChange,
  onRecommendation,
}) => {
  const {
    isRecording,
    currentFatigue,
    sessionStats,
    error,
    startSession,
    stopSession,
    getBaseline,
  } = useAcousticRecording();

  const [hasBaseline, setHasBaseline] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [calibrationProgress, setCalibrationProgress] = useState(0);

  // Check for existing baseline on mount
  useEffect(() => {
    const checkBaseline = async () => {
      const baseline = await getBaseline(muscleGroup);
      setHasBaseline(!!baseline);
    };
    checkBaseline();
  }, [muscleGroup, getBaseline]);

  // Notify parent of fatigue changes
  useEffect(() => {
    if (currentFatigue && onFatigueChange) {
      onFatigueChange(currentFatigue.fatigueLevel, currentFatigue.fatigueCategory);
    }
    if (currentFatigue?.recommendations?.[0] && onRecommendation) {
      onRecommendation(currentFatigue.recommendations[0]);
    }
  }, [currentFatigue, onFatigueChange, onRecommendation]);

  /**
   * Start calibration (baseline measurement)
   */
  const handleCalibrate = () => {
    Alert.alert(
      'Calibrate Baseline',
      'Sit quietly and relax. We\'ll record 5 seconds of resting muscle activity to establish your baseline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: () => {
            setIsCalibrating(true);
            setCalibrationProgress(0);

            // In production, this would record 5 seconds of audio
            // and process it through the WASM module
            // For now, show progress simulation
            const interval = setInterval(() => {
              setCalibrationProgress((prev) => {
                if (prev >= 100) {
                  clearInterval(interval);
                  return 100;
                }
                return prev + 10;
              });
            }, 500);

            // Simulate calibration completion
            setTimeout(() => {
              setIsCalibrating(false);
              setHasBaseline(true);
              Alert.alert('Success', 'Baseline calibrated successfully!');
            }, 5000);
          },
        },
      ]
    );
  };

  const handleStartSession = () => {
    if (!hasBaseline) {
      Alert.alert(
        'Baseline Required',
        'Please calibrate your baseline before starting a session.',
        [{ text: 'OK' }]
      );
      return;
    }

    const options: StartSessionOptions = {
      muscleGroup,
      exerciseName,
      onFatigue: (_fatigue: FatigueResult) => {
        // Handle fatigue updates silently
      },
      onChunk: (_features: AcousticFeatures) => {
        // Handle chunk processing silently
      },
    };

    startSession(options);
  };

  /**
   * Stop monitoring session
   */
  const handleStopSession = () => {
    stopSession().then((session) => {
      if (session) {
        Alert.alert(
          'Session Complete',
          `Average fatigue: ${session.avgFatigueLevel?.toFixed(1)}%\nPeak fatigue: ${session.peakFatigueLevel?.toFixed(1)}%`
        );
      }
    });
  };

  /**
   * Get color for fatigue level
   */
  const getFatigueColor = (level: number): string => {
    if (level < 30) {
      return COLORS.green;
    }
    if (level < 50) {
      return COLORS.blue;
    }
    if (level < 70) {
      return COLORS.amber;
    }
    if (level < 85) {
      return COLORS.orange;
    }
    return COLORS.red;
  };

  /**
   * Get category description
   */
  const getCategoryDescription = (category: string): string => {
    switch (category) {
      case 'fresh':
        return 'Ready for high intensity';
      case 'moderate':
        return 'Good, monitor your form';
      case 'fatigued':
        return 'Consider reducing intensity';
      case 'exhausted':
        return 'Stop and rest immediately';
      default:
        return '';
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Muscle Fatigue Monitor</Text>
        <Text style={styles.subtitle}>{muscleGroup.replace('_', ' ')}</Text>
      </View>

      {/* Error display */}
      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Fatigue display */}
      {currentFatigue && (
        <View style={styles.fatigueDisplay}>
          <Text style={styles.fatigueLabel}>Current Fatigue</Text>
          <View style={styles.fatigueValueContainer}>
            <Text
              style={[
                styles.fatigueValue,
                { color: getFatigueColor(currentFatigue.fatigueLevel) },
              ]}
            >
              {Math.round(currentFatigue.fatigueLevel)}%
            </Text>
          </View>
          <Text
            style={[
              styles.category,
              { color: getFatigueColor(currentFatigue.fatigueLevel) },
            ]}
          >
            {currentFatigue.fatigueCategory.toUpperCase()}
          </Text>
          <Text style={styles.categoryDescription}>
            {getCategoryDescription(currentFatigue.fatigueCategory)}
          </Text>

          {/* Fatigue shift indicator */}
          {Math.abs(currentFatigue.medianFreqShift) > 0 && (
            <Text style={styles.shiftText}>
              Median freq shift: {currentFatigue.medianFreqShift.toFixed(1)}Hz
            </Text>
          )}

          {/* Recommendations */}
          {currentFatigue.recommendations?.[0] && (
            <View style={styles.recommendationBox}>
              <Text style={styles.recommendationLabel}>Recommendation:</Text>
              <Text style={styles.recommendationText}>
                {currentFatigue.recommendations[0]}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Session stats */}
      {sessionStats && (
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Session Stats</Text>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>Chunks: {sessionStats.chunkCount}</Text>
            <Text style={styles.stat}>Valid: {sessionStats.validChunkCount}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.stat}>Peak: {sessionStats.peakFatigue.toFixed(1)}%</Text>
            <Text style={styles.stat}>Avg: {sessionStats.avgFatigue.toFixed(1)}%</Text>
          </View>
        </View>
      )}

      {/* Calibration progress */}
      {isCalibrating && (
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Calibrating... {calibrationProgress}%
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${calibrationProgress}%` }]} />
          </View>
        </View>
      )}

      {/* Control buttons */}
      <View style={styles.buttonContainer}>
        {!hasBaseline ? (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton, isCalibrating && styles.buttonDisabled]}
            onPress={handleCalibrate}
            disabled={isCalibrating}
          >
            <Text style={styles.buttonText}>
              {isCalibrating ? 'Calibrating...' : 'Calibrate Baseline'}
            </Text>
          </TouchableOpacity>
        ) : isRecording ? (
          <TouchableOpacity
            style={[styles.button, styles.stopButton]}
            onPress={handleStopSession}
          >
            <Text style={styles.buttonText}>Stop Monitoring</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.startButton]}
            onPress={handleStartSession}
          >
            <Text style={styles.buttonText}>Start Monitoring</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Baseline status */}
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, hasBaseline ? styles.statusDotGreen : styles.statusDotRed]} />
        <Text style={styles.statusText}>
          {hasBaseline ? 'Baseline calibrated' : 'Baseline required'}
        </Text>
      </View>

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        This feature uses acoustic analysis to estimate muscle fatigue.
        Results are for informational purposes only.
      </Text>
    </View>
  );
};

// Color constants
const COLORS = {
  green: '#22c55e',
  blue: '#3b82f6',
  amber: '#f59e0b',
  orange: '#f97316',
  red: '#ef4444',
  gray: '#9ca3af',
  darkGray: '#6b7280',
  black: '#000000',
  bgDark: '#1a1a1a',
  bgCard: '#1f2937',
  border: '#374151',
  white: '#fff',
  blueLight: '#dbeafe',
  blueAccent: '#3b82f6',
  redTransparent: 'rgba(239, 68, 68, 0.2)',
  blueTransparent: 'rgba(59, 130, 246, 0.2)',
} as const;

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  errorBox: {
    backgroundColor: COLORS.redTransparent,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: COLORS.red,
    fontSize: 14,
  },
  fatigueDisplay: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 16,
  },
  fatigueLabel: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
  },
  fatigueValueContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.bgCard,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.border,
  },
  fatigueValue: {
    fontSize: 36,
    fontWeight: 'bold',
  },
  category: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 12,
    textTransform: 'uppercase',
  },
  categoryDescription: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: 4,
  },
  shiftText: {
    fontSize: 12,
    color: COLORS.darkGray,
    marginTop: 8,
  },
  recommendationBox: {
    backgroundColor: COLORS.blueTransparent,
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: '100%',
  },
  recommendationLabel: {
    fontSize: 12,
    color: COLORS.blueAccent,
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: COLORS.blueLight,
  },
  statsContainer: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    fontSize: 12,
    color: COLORS.gray,
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: COLORS.gray,
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: COLORS.blueAccent,
    borderRadius: 4,
  },
  buttonContainer: {
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: COLORS.blueAccent,
  },
  startButton: {
    backgroundColor: COLORS.green,
  },
  stopButton: {
    backgroundColor: COLORS.red,
  },
  buttonDisabled: {
    backgroundColor: COLORS.darkGray,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusDotGreen: {
    backgroundColor: COLORS.green,
  },
  statusDotRed: {
    backgroundColor: COLORS.red,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.gray,
  },
  disclaimer: {
    fontSize: 11,
    color: COLORS.darkGray,
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AcousticFatigueMonitor;
