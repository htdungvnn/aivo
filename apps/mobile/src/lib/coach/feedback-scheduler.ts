/**
 * Feedback Scheduler
 * Manages voice, haptic, and visual feedback with deduplication and prioritization
 */

import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import type { CorrectionResult, FeedbackMessage, CorrectionSeverity } from '@repo/fitness-types/correction';
import { SEVERITY_PRIORITY, DEFAULT_CORRECTION_MESSAGES } from '@repo/fitness-types/correction';

// Correction codes that need immediate attention
const SAFETY_CODES = [
  'ROUNDED_LOWER_BACK',
  'KNEE_COLLAPSE_INWARD',
  'FORWARD_LEAN_TOO_MUCH',
  'SAFETY_STOP_RECOMMENDED',
];

interface ScheduledFeedback {
  id: string;
  message: string;
  priority: number;
  types: ('voice' | 'haptic' | 'visual')[];
  safetyRelated: boolean;
  timestamp: number;
}

interface FeedbackConfig {
  voiceEnabled: boolean;
  hapticEnabled: boolean;
  visualEnabled: boolean;
  language: 'en' | 'vi';
  cooldownMs: number;
  voiceVolume: number;
  voiceRate: number;
}

const DEFAULT_CONFIG: FeedbackConfig = {
  voiceEnabled: true,
  hapticEnabled: true,
  visualEnabled: true,
  language: 'en',
  cooldownMs: 4000,
  voiceVolume: 1.0,
  voiceRate: 1.0,
};

/**
 * Feedback Scheduler
 * Handles voice, haptic, and visual feedback with deduplication and prioritization
 */
export class FeedbackScheduler {
  private config: FeedbackConfig;
  private activeCorrections: Map<string, { firstSeen: number; frameCount: number }> = new Map();
  private lastSpokenCorrections: Map<string, number> = new Map();
  private pendingFeedback: ScheduledFeedback[] = [];
  private isSpeaking: boolean = false;
  private visualCallbacks: ((corrections: CorrectionResult[]) => void)[] = [];

  constructor(config: Partial<FeedbackConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<FeedbackConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Register callback for visual feedback updates
   */
  onVisualFeedback(callback: (corrections: CorrectionResult[]) => void): () => void {
    this.visualCallbacks.push(callback);
    return () => {
      this.visualCallbacks = this.visualCallbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Process corrections and schedule appropriate feedback
   */
  processCorrections(
    corrections: CorrectionResult[],
    repCount: number,
    phase: string
  ): void {
    const now = Date.now();
    const activeCorrections: CorrectionResult[] = [];

    for (const correction of corrections) {
      // Track correction state
      const state = this.activeCorrections.get(correction.code);
      
      if (state) {
        state.frameCount++;
        state.firstSeen = now;
      } else {
        this.activeCorrections.set(correction.code, {
          firstSeen: now,
          frameCount: 1,
        });
      }

      // Only include corrections that have been active for enough frames
      const correctionState = this.activeCorrections.get(correction.code);
      if (correctionState && correctionState.frameCount >= 3) {
        activeCorrections.push(correction);
      }
    }

    // Clear old corrections
    for (const [code, state] of this.activeCorrections.entries()) {
      if (now - state.firstSeen > 3000) {
        this.activeCorrections.delete(code);
      }
    }

    // Update visual feedback
    if (this.config.visualEnabled) {
      this.updateVisualFeedback(activeCorrections);
    }

    // Schedule voice and haptic feedback
    this.scheduleFeedback(activeCorrections, repCount, now);
  }

  /**
   * Schedule voice and haptic feedback
   */
  private scheduleFeedback(
    corrections: CorrectionResult[],
    repCount: number,
    timestamp: number
  ): void {
    const now = Date.now();

    // Sort by priority
    const sorted = [...corrections].sort((a, b) => {
      const priorityA = SEVERITY_PRIORITY[a.severity as CorrectionSeverity] || 0;
      const priorityB = SEVERITY_PRIORITY[b.severity as CorrectionSeverity] || 0;
      return priorityB - priorityA;
    });

    // Check cooldown and schedule
    for (const correction of sorted) {
      const lastSpoken = this.lastSpokenCorrections.get(correction.code) || 0;
      const cooldownRemaining = now - lastSpoken < this.config.cooldownMs;

      if (cooldownRemaining) continue;

      // Get message
      const message = this.getCorrectionMessage(correction.code);
      const isSafety = SAFETY_CODES.includes(correction.code);
      const priority = SEVERITY_PRIORITY[correction.severity as CorrectionSeverity] || 0;

      // Determine feedback types
      const types: ('voice' | 'haptic' | 'visual')[] = [];
      
      if (this.config.voiceEnabled) {
        types.push('voice');
      }
      if (this.config.hapticEnabled) {
        types.push('haptic');
      }

      // Safety corrections interrupt current speech
      if (isSafety && this.isSpeaking) {
        this.stopSpeaking();
      }

      // Schedule feedback
      this.pendingFeedback.push({
        id: `${correction.code}-${timestamp}`,
        message,
        priority,
        types,
        safetyRelated: isSafety,
        timestamp,
      });

      // Mark as spoken
      this.lastSpokenCorrections.set(correction.code, now);
    }

    // Process pending feedback
    this.processPendingFeedback();
  }

  /**
   * Process pending feedback queue
   */
  private processPendingFeedback(): void {
    // Sort by priority
    this.pendingFeedback.sort((a, b) => b.priority - a.priority);

    while (this.pendingFeedback.length > 0) {
      const feedback = this.pendingFeedback.shift()!;

      // Skip if voice is busy (unless safety)
      if (this.isSpeaking && !feedback.safetyRelated) {
        continue;
      }

      // Execute feedback
      for (const type of feedback.types) {
        if (type === 'voice') {
          this.speak(feedback.message);
        } else if (type === 'haptic') {
          this.vibrate(feedback.safetyRelated ? 'heavy' : 'medium');
        }
      }

      // Only process one voice message at a time
      if (feedback.types.includes('voice')) {
        break;
      }
    }
  }

  /**
   * Get localized correction message
   */
  private getCorrectionMessage(code: string): string {
    const messages = DEFAULT_CORRECTION_MESSAGES as Record<string, { en: string; vi: string }>;
    const msg = messages[code];
    
    if (msg) {
      return msg[this.config.language] || msg.en;
    }
    
    return code;
  }

  /**
   * Speak text using TTS
   */
  private speak(text: string): void {
    if (!this.config.voiceEnabled) return;

    this.isSpeaking = true;

    Speech.speak(text, {
      language: this.config.language === 'vi' ? 'vi-VN' : 'en-US',
      volume: this.config.voiceVolume,
      rate: this.config.voiceRate,
      onDone: () => {
        this.isSpeaking = false;
        // Process remaining feedback
        setTimeout(() => this.processPendingFeedback(), 100);
      },
      onError: () => {
        this.isSpeaking = false;
      },
    });
  }

  /**
   * Stop current speech
   */
  private stopSpeaking(): void {
    Speech.stop();
    this.isSpeaking = false;
  }

  /**
   * Trigger haptic feedback
   */
  private vibrate(intensity: 'light' | 'medium' | 'heavy'): void {
    if (!this.config.hapticEnabled) return;

    switch (intensity) {
      case 'light':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        break;
      case 'medium':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'heavy':
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        break;
    }
  }

  /**
   * Update visual feedback
   */
  private updateVisualFeedback(corrections: CorrectionResult[]): void {
    for (const callback of this.visualCallbacks) {
      callback(corrections);
    }
  }

  /**
   * Speak a custom message
   */
  speakCustom(message: string): void {
    if (this.config.voiceEnabled) {
      this.speak(message);
    }
    if (this.config.hapticEnabled) {
      this.vibrate('medium');
    }
  }

  /**
   * Announce rep count
   */
  announceRepCount(count: number): void {
    if (this.config.voiceEnabled && count > 0) {
      this.speak(count.toString());
    }
    if (this.config.hapticEnabled) {
      this.vibrate('light');
    }
  }

  /**
   * Announce countdown
   */
  announceCountdown(seconds: number): void {
    if (this.config.voiceEnabled) {
      this.speak(seconds.toString());
    }
  }

  /**
   * Announce set completion
   */
  announceSetComplete(repCount: number, quality: number): void {
    let message: string;
    
    if (quality >= 90) {
      message = this.config.language === 'vi' ? 'Xuất sắc!' : 'Excellent!';
    } else if (quality >= 75) {
      message = this.config.language === 'vi' ? 'Tập tốt!' : 'Great job!';
    } else {
      message = this.config.language === 'vi' ? 'Hoàn thành!' : 'Good!';
    }

    this.speakCustom(message);
    
    if (this.config.hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  /**
   * Announce rest timer
   */
  announceRestStart(durationSeconds: number): void {
    const message = this.config.language === 'vi' 
      ? `Nghỉ ${durationSeconds} giây`
      : `Rest ${durationSeconds} seconds`;
    
    this.speakCustom(message);
  }

  /**
   * Announce workout complete
   */
  announceWorkoutComplete(totalReps: number, durationMinutes: number): void {
    const message = this.config.language === 'vi'
      ? `Hoàn thành! Bạn đã tập ${totalReps} lần trong ${durationMinutes} phút.`
      : `Workout complete! You completed ${totalReps} reps in ${durationMinutes} minutes.`;
    
    this.speakCustom(message);
    
    if (this.config.hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  /**
   * Announce safety warning
   */
  announceSafetyWarning(): void {
    const message = this.config.language === 'vi'
      ? 'Cảnh báo. Vui lòng dừng lại và nghỉ.'
      : 'Warning. Please stop and rest.';
    
    this.speakCustom(message);
    
    if (this.config.hapticEnabled) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }

  /**
   * Clear all pending feedback
   */
  clear(): void {
    this.pendingFeedback = [];
    this.activeCorrections.clear();
    this.stopSpeaking();
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.clear();
    this.visualCallbacks = [];
  }
}

// Singleton instance
let feedbackSchedulerInstance: FeedbackScheduler | null = null;

export function getFeedbackScheduler(config?: Partial<FeedbackConfig>): FeedbackScheduler {
  if (!feedbackSchedulerInstance) {
    feedbackSchedulerInstance = new FeedbackScheduler(config);
  } else if (config) {
    feedbackSchedulerInstance.updateConfig(config);
  }
  return feedbackSchedulerInstance;
}
