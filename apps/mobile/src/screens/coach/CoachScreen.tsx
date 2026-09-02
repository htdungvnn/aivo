/**
 * Coach Screen
 * Main workout coaching interface
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { Camera, useCameraDevices } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { ThemedView } from '../../components/ThemedView';
import { ThemedText } from '../../components/ThemedText';
import { ThemedButton } from '../../components/ThemedButton';
import { usePoseDetection } from '../../hooks/coach/usePoseDetection';
import { PoseOverlay } from '../../components/coach/PoseOverlay';
import { RepCounter } from '../../components/coach/RepCounter';
import { CorrectionBanner } from '../../components/coach/CorrectionBanner';
import { RestTimer } from '../../components/coach/RestTimer';
import { CountdownOverlay } from '../../components/coach/CountdownOverlay';
import { PRIVACY_NOTICE, EXERCISE_NAMES } from '@aivo/fitness-types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface CoachScreenProps {
  exerciseCode: string;
  targetSets?: number;
  targetReps?: number;
}

export function CoachScreen({
  exerciseCode,
  targetSets = 3,
  targetReps = 10,
}: CoachScreenProps) {
  const router = useRouter();
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restTimeRemaining, setRestTimeRemaining] = useState(60);
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownValue, setCountdownValue] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<number | null>(null);
  const [language, setLanguage] = useState<'en' | 'vi'>('en');

  // Camera device
  const devices = useCameraDevices();
  const device = devices.front;

  // Pose detection
  const {
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
  } = usePoseDetection({
    exerciseCode,
    onRepCounted: (count) => {
      if (count > 0 && count % targetReps === 0) {
        handleSetComplete();
      }
    },
    onPhaseChange: (phase) => {
      console.log('Phase changed:', phase);
    },
    onCalibrationComplete: () => {
      setShowCountdown(true);
      startCountdown();
    },
  });

  // Request permission on mount
  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, []);

  // Start camera when calibrated
  useEffect(() => {
    if (hasPermission && !isActive) {
      startCamera();
    }
  }, [hasPermission]);

  // Countdown logic
  const startCountdown = useCallback(() => {
    let count = 3;
    setCountdownValue(count);
    
    const interval = setInterval(() => {
      count--;
      setCountdownValue(count);
      
      if (count === 0) {
        clearInterval(interval);
        setShowCountdown(false);
        if (!workoutStartTime) {
          setWorkoutStartTime(Date.now());
        }
      }
    }, 1000);
  }, [workoutStartTime]);

  // Handle set completion
  const handleSetComplete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (currentSet >= targetSets) {
      // Workout complete
      handleWorkoutComplete();
    } else {
      // Start rest
      setIsResting(true);
      setRestTimeRemaining(60);
      
      const interval = setInterval(() => {
        setRestTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsResting(false);
            setCurrentSet((s) => s + 1);
            startCountdown();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [currentSet, targetSets, startCountdown]);

  // Handle workout completion
  const handleWorkoutComplete = useCallback(() => {
    stopCamera();
    
    const duration = workoutStartTime 
      ? Math.round((Date.now() - workoutStartTime) / 1000 / 60) 
      : 0;
    
    Alert.alert(
      language === 'vi' ? 'Hoàn thành!' : 'Workout Complete!',
      language === 'vi'
        ? `Bạn đã hoàn thành ${targetSets} hiệp với ${repCount} lần tập.`
        : `You completed ${targetSets} sets with ${repCount} total reps.`,
      [
        {
          text: language === 'vi' ? 'Xem kết quả' : 'View Results',
          onPress: () => router.push('/coach/results'),
        },
        {
          text: language === 'vi' ? 'Đóng' : 'Close',
          onPress: () => router.back(),
        },
      ]
    );
  }, [workoutStartTime, repCount, targetSets, language, router, stopCamera]);

  // Handle pause
  const handlePause = useCallback(() => {
    setIsPaused(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  // Handle resume
  const handleResume = useCallback(() => {
    setIsPaused(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Handle cancel
  const handleCancel = useCallback(() => {
    Alert.alert(
      language === 'vi' ? 'Hủy bài tập?' : 'Cancel Workout?',
      language === 'vi'
        ? 'Bạn có chắc muốn hủy bài tập này không?'
        : 'Are you sure you want to cancel this workout?',
      [
        { text: language === 'vi' ? 'Không' : 'No', style: 'cancel' },
        {
          text: language === 'vi' ? 'Có' : 'Yes',
          style: 'destructive',
          onPress: () => {
            stopCamera();
            router.back();
          },
        },
      ]
    );
  }, [language, router, stopCamera]);

  // Render permission request
  if (!hasPermission) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.permissionContainer}>
          <ThemedText variant="title" style={styles.title}>
            {language === 'vi' ? 'Yêu cầu quyền camera' : 'Camera Permission Required'}
          </ThemedText>
          <ThemedText style={styles.description}>
            {language === 'vi'
              ? 'AIVO cần quyền truy cập camera để phát hiện tư thế và theo dõi bài tập của bạn.'
              : 'AIVO needs camera access to detect your pose and track your exercises.'}
          </ThemedText>
          <ThemedButton
            title={language === 'vi' ? 'Cho phép truy cập' : 'Allow Camera Access'}
            onPress={requestPermission}
          />
        </View>
      </ThemedView>
    );
  }

  // Render calibration
  if (!isCalibrated) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.cameraContainer}>
          {device && (
            <Camera
              style={styles.camera}
              device={device}
              isActive={isActive}
              ref={(ref) => {}}
            />
          )}
          
          <View style={styles.calibrationOverlay}>
            <ThemedText variant="title" style={styles.calibrationTitle}>
              {language === 'vi' ? 'Căn chỉnh' : 'Calibration'}
            </ThemedText>
            
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${calibrationProgress * 100}%` },
                  ]}
                />
              </View>
              <ThemedText style={styles.progressText}>
                {Math.round(calibrationProgress * 100)}%
              </ThemedText>
            </View>
            
            <ThemedText style={styles.calibrationHint}>
              {language === 'vi'
                ? 'Giữ nguyên vị trí bắt đầu...'
                : 'Hold the starting position...'}
            </ThemedText>
            
            <ThemedButton
              title={language === 'vi' ? 'Bắt đầu căn chỉnh' : 'Start Calibration'}
              onPress={startCalibration}
            />
          </View>
        </View>
      </ThemedView>
    );
  }

  // Render countdown
  if (showCountdown) {
    return <CountdownOverlay value={countdownValue} />;
  }

  // Render rest timer
  if (isResting) {
    return (
      <RestTimer
        duration={restTimeRemaining}
        onComplete={() => {
          setIsResting(false);
          startCountdown();
        }}
      />
    );
  }

  // Main workout view
  return (
    <ThemedView style={styles.container}>
      {/* Camera view */}
      <View style={styles.cameraContainer}>
        {device && (
          <Camera
            style={styles.camera}
            device={device}
            isActive={isActive && !isPaused}
            ref={(ref) => {}}
          />
        )}
        
        {/* Pose overlay */}
        <PoseOverlay
          landmarks={[]}
          corrections={activeCorrections}
          visible={status === 'detecting'}
        />
        
        {/* Confidence indicator */}
        <View style={styles.confidenceIndicator}>
          <ThemedText style={styles.confidenceText}>
            {language === 'vi' ? 'Độ chính xác: ' : 'Confidence: '}
            {Math.round(currentConfidence * 100)}%
          </ThemedText>
        </View>
        
        {/* Privacy notice */}
        <View style={styles.privacyNotice}>
          <ThemedText style={styles.privacyText}>
            {PRIVACY_NOTICE[language]}
          </ThemedText>
        </View>
      </View>

      {/* Workout info */}
      <View style={styles.workoutInfo}>
        <View style={styles.exerciseInfo}>
          <ThemedText variant="title" style={styles.exerciseName}>
            {EXERCISE_NAMES[exerciseCode as keyof typeof EXERCISE_NAMES]?.[language] || exerciseCode}
          </ThemedText>
          <ThemedText style={styles.setInfo}>
            {language === 'vi' 
              ? `Hiệp ${currentSet} / ${targetSets}`
              : `Set ${currentSet} / ${targetSets}`}
          </ThemedText>
        </View>
        
        {/* Rep counter */}
        <RepCounter
          currentReps={repCount % targetReps || (repCount > 0 ? targetReps : 0)}
          targetReps={targetReps}
          phase={currentPhase}
        />
        
        {/* Correction banner */}
        {activeCorrections.length > 0 && (
          <CorrectionBanner
            corrections={activeCorrections}
            language={language}
          />
        )}
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handlePause}
        >
          <Text style={styles.controlIcon}>⏸</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.controlButton, styles.mainButton]}
          onPress={() => {}}
        >
          <Text style={styles.mainIcon}>✓</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleCancel}
        >
          <Text style={styles.controlIcon}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Pause overlay */}
      {isPaused && (
        <View style={styles.pauseOverlay}>
          <ThemedText variant="title" style={styles.pauseTitle}>
            {language === 'vi' ? 'Tạm dừng' : 'Paused'}
          </ThemedText>
          <View style={styles.pauseButtons}>
            <ThemedButton
              title={language === 'vi' ? 'Tiếp tục' : 'Resume'}
              onPress={handleResume}
            />
            <ThemedButton
              title={language === 'vi' ? 'Hủy' : 'Cancel'}
              variant="secondary"
              onPress={handleCancel}
            />
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    marginBottom: 16,
    textAlign: 'center',
  },
  description: {
    textAlign: 'center',
    marginBottom: 24,
    opacity: 0.8,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  calibrationOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calibrationTitle: {
    marginBottom: 24,
    color: '#fff',
  },
  progressContainer: {
    width: '80%',
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#22C55E',
  },
  progressText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 8,
  },
  calibrationHint: {
    color: '#fff',
    marginBottom: 24,
    opacity: 0.8,
  },
  workoutInfo: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    padding: 20,
  },
  exerciseInfo: {
    marginBottom: 16,
  },
  exerciseName: {
    color: '#fff',
  },
  setInfo: {
    color: '#fff',
    opacity: 0.8,
  },
  confidenceIndicator: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 8,
  },
  confidenceText: {
    color: '#fff',
    fontSize: 12,
  },
  privacyNotice: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    padding: 8,
    borderRadius: 4,
  },
  privacyText: {
    color: '#fff',
    fontSize: 10,
    opacity: 0.6,
    textAlign: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
  },
  controlButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#22C55E',
  },
  controlIcon: {
    fontSize: 20,
    color: '#fff',
  },
  mainIcon: {
    fontSize: 30,
    color: '#fff',
  },
  pauseOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseTitle: {
    color: '#fff',
    marginBottom: 24,
  },
  pauseButtons: {
    gap: 12,
  },
});
