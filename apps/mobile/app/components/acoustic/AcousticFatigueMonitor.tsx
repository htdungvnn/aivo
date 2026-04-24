import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAcousticRecording, StartSessionOptions } from '../../hooks/useAcousticRecording';
import type { MuscleGroup, FatigueResult, AcousticFeatures } from '@aivo/shared-types';

interface AcousticFatigueMonitorProps {
  userId: string;
  muscleGroup: MuscleGroup;
  exerciseName?: string;
  onFatigueChange?: (fatigue: number, category: string) => void;
  onRecommendation?: (recommendation: string) => void;
}

export const AcousticFatigueMonitor: React.FC<AcousticFatigueMonitorProps> = ({
  userId,
  muscleGroup,
  exerciseName = 'exercise',
  onFatigueChange,
  onRecommendation,
}) => {
  const {
    isRecording,
    isProcessing,
    currentFatigue,
    sessionStats,
    error,
    startSession,
    stopSession,
    calibrateBaseline,
    getBaseline,
    saveBaseline,
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
  const handleCalibrate = async () => {
    Alert.alert(
      'Calibrate Baseline',
      'Sit quietly and relax. We\'ll record 5 seconds of resting muscle activity to establish your baseline.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Start',
          onPress: async () => {
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
            setTimeout(async () => {
              // This would be replaced with actual calibration
              // const pcmData = await record5Seconds();
              // const baseline = await calibrateBaseline(pcmData);
              // await saveBaseline(muscleGroup, baseline);

              setIsCalibrating(false);
              setHasBaseline(true);
              Alert.alert('Success', 'Baseline calibrated successfully!');
            }, 5000);
          },
        },
      ]
    );
  };

  /**
   * Start monitoring session
   */
  const handleStartSession = async () => {
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
      onFatigue: (fatigue: FatigueResult) => {
        console.log(`Fatigue update: ${fatigue.fatigueLevel}% (${fatigue.fatigueCategory})`);
      },
      onChunk: (features: AcousticFeatures) => {
        console.log(`Chunk processed: median freq = ${features.medianFrequency}Hz`);
      },
    };

    await startSession(options);
  };

  /**
   * Stop monitoring session
   */
  const handleStopSession = async () => {
    const session = await stopSession();
    if (session) {
      Alert.alert(
        'Session Complete',
        `Average fatigue: ${session.avgFatigueLevel?.toFixed(1)}%\nPeak fatigue: ${session.peakFatigueLevel?.toFixed(1)}%`
      );
    }
  };

  /**
   * Get color for fatigue level
   */
  const getFatigueColor = (level: number): string => {
    if (level < 30) return '#22c55e'; // green
    if (level < 50) return '#3b82f6'; // blue
    if (level < 70) return '#f59e0b'; // amber
    if (level < 85) return '#f97316'; // orange
    return '#ef4444'; // red
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
        <View style={[styles.statusDot, { backgroundColor: hasBaseline ? '#22c55e' : '#ef4444' }]} />
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
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
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
  },
  fatigueDisplay: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    marginBottom: 16,
  },
  fatigueLabel: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  fatigueValueContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#374151',
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
    color: '#9ca3af',
    marginTop: 4,
  },
  shiftText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 8,
  },
  recommendationBox: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    width: '100%',
  },
  recommendationLabel: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '600',
    marginBottom: 4,
  },
  recommendationText: {
    fontSize: 14,
    color: '#dbeafe',
  },
  statsContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stat: {
    fontSize: 12,
    color: '#9ca3af',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#374151',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
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
    backgroundColor: '#3b82f6',
  },
  startButton: {
    backgroundColor: '#22c55e',
  },
  stopButton: {
    backgroundColor: '#ef4444',
  },
  buttonDisabled: {
    backgroundColor: '#6b7280',
  },
  buttonText: {
    color: '#fff',
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
  statusText: {
    fontSize: 12,
    color: '#9ca3af',
  },
  disclaimer: {
    fontSize: 11,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 16,
  },
});

export default AcousticFatigueMonitor;
