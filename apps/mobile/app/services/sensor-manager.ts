/**
 * Sensor Manager Service
 * Handles continuous background biometric data collection from device sensors
 * Supports HealthKit (iOS) and Google Fit (Android)
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Dynamically import expo-health only on native platforms
let healthClient: { createClient: (options: { clientOptions: { bundleIdentifier?: string; packageName?: string } }) => { authorize: (permissions: string[]) => Promise<Record<string, string>>; getAuthStatusForPermissions: (permissions: string[]) => Promise<Record<string, string>>; getSamples: (type: string, options: { startDate: Date; endDate: Date }) => Array<{ value: number }> } } | null = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    const expoHealth = await import('expo-health');
    healthClient = expoHealth.createClient({
      clientOptions: Platform.OS === 'ios' ? {
        bundleIdentifier: 'com.aivo.app',
      } : {
        packageName: 'com.aivo.app',
      },
    });
  } catch {
    // expo-health not available on this platform
  }
}

const API_BASE_URL = __DEV__ ? "http://localhost:8787" : "https://api.aivo.app";
const TOKEN_KEY = "aivo.auth.token";

export interface BiometricReading {
  timestamp: number;
  type: 'hrv' | 'heart_rate' | 'resting_hr' | 'steps' | 'active_minutes' | 'sleep';
  value: number;
  unit: string;
  confidence?: number;
  source: 'apple_health' | 'google_fit' | 'manual';
}

export interface SensorStatus {
  available: boolean;
  permissionsGranted: boolean;
  lastReading?: BiometricReading;
  error?: string;
}

class SensorManager {
  private isCollecting = false;
  private collectionInterval: ReturnType<typeof setInterval> | null = null;
  private uploadInterval: ReturnType<typeof setInterval> | null = null;
  private readingsQueue: BiometricReading[] = [];
  private statusListeners: Array<(status: SensorStatus) => void> = [];

  constructor() {
    // Health client is initialized dynamically at the top of the file
  }

  /**
   * Get current sensor status
   */
  async getStatus(): Promise<SensorStatus> {
    try {
      const permissionsGranted = await this.checkPermissions();
      const available = healthClient !== null;

      return {
        available,
        permissionsGranted,
      };
    } catch (error) {
      return {
        available: false,
        permissionsGranted: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Request health data permissions from user
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (!healthClient) {
        return false;
      }

      const permissions = [
        'HeartRate',
        'HeartRateVariabilitySDNN',
        'SleepAnalysis',
        'StepCount',
        'ActiveEnergyBurned',
        'BasalEnergyBurned',
      ];

      const result = await healthClient.authorize(permissions);

      const granted = permissions.every(p => result[p as keyof typeof result] === 'authorized');

      this.notifyStatusListeners({ ...(await this.getStatus()) });

      return granted;
    } catch {
      return false;
    }
  }

  /**
   * Check if permissions are granted
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (!healthClient) {
        return false;
      }

      const status = await healthClient.getAuthStatusForPermissions([
        'HeartRate',
        'HeartRateVariabilitySDNN',
        'SleepAnalysis',
        'StepCount',
      ]);

      return Object.values(status).every(s => s === 'authorized');
    } catch {
      return false;
    }
  }

  /**
   * Start continuous background data collection
   * Collects sensor readings every 15 minutes
   */
  startBackgroundCollection(): void {
    if (this.isCollecting) {
      return;
    }

    this.isCollecting = true;

    // Collect immediately on start
    void this.collectSnapshot();

    // Then collect every 15 minutes (900000 ms)
    this.collectionInterval = setInterval(() => {
      void this.collectSnapshot();
    }, 15 * 60 * 1000);

    // Upload queued readings every 5 minutes
    this.uploadInterval = setInterval(() => {
      void this.uploadQueuedReadings();
    }, 5 * 60 * 1000);
  }

  /**
   * Stop background collection
   */
  stopCollection(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
    if (this.uploadInterval) {
      clearInterval(this.uploadInterval);
      this.uploadInterval = null;
    }
    this.isCollecting = false;
  }

  /**
   * Collect a single snapshot of biometric data
   */
  private async collectSnapshot(): Promise<void> {
    if (!healthClient) {
      return;
    }

    const now = Date.now();
    const fifteenMinAgo = now - 15 * 60 * 1000;

    try {
      const hrvData = await healthClient.getSamples('HeartRateVariabilitySDNN', {
        startDate: new Date(fifteenMinAgo),
        endDate: new Date(now),
      });

      if (hrvData && hrvData.length > 0) {
        const avgHRV = hrvData.reduce((sum, s) => sum + s.value, 0) / hrvData.length;
        this.addReading({
          timestamp: now,
          type: 'hrv',
          value: avgHRV,
          unit: 'ms',
          source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
        });
      }

      const hrData = await healthClient.getSamples('HeartRate', {
        startDate: new Date(now - 60 * 60 * 1000),
        endDate: new Date(now),
      });

      if (hrData && hrData.length > 0) {
        const avgHR = hrData.reduce((sum, s) => sum + s.value, 0) / hrData.length;
        this.addReading({
          timestamp: now,
          type: 'heart_rate',
          value: avgHR,
          unit: 'bpm',
          source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
        });

        const sorted = [...hrData].sort((a, b) => a.value - b.value);
        const restingHR = sorted[Math.floor(sorted.length * 0.1)]?.value || avgHR;
        this.addReading({
          timestamp: now,
          type: 'resting_hr',
          value: restingHR,
          unit: 'bpm',
          source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
        });
      }

      const stepsData = await healthClient.getSamples('StepCount', {
        startDate: new Date(fifteenMinAgo),
        endDate: new Date(now),
      });

      if (stepsData && stepsData.length > 0) {
        const steps = stepsData.reduce((sum, s) => sum + Math.round(s.value), 0);
        this.addReading({
          timestamp: now,
          type: 'steps',
          value: steps,
          unit: 'steps',
          source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
        });
      }

      const energyData = await healthClient.getSamples('ActiveEnergyBurned', {
        startDate: new Date(fifteenMinAgo),
        endDate: new Date(now),
      });

      if (energyData && energyData.length > 0) {
        const totalEnergy = energyData.reduce((sum, s) => sum + s.value, 0);
        const activeMinutes = Math.round(totalEnergy / 5);
        this.addReading({
          timestamp: now,
          type: 'active_minutes',
          value: activeMinutes,
          unit: 'min',
          source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
        });
      }
    } catch {
      // Silently ignore collection errors
    }
  }

  private addReading(reading: BiometricReading): void {
    this.readingsQueue.push(reading);
  }

  /**
   * Upload queued readings to server
   */
  private async uploadQueuedReadings(): Promise<void> {
    if (this.readingsQueue.length === 0) {
      return;
    }

    const readings = [...this.readingsQueue];
    this.readingsQueue = [];

    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (!token) {
        this.readingsQueue.unshift(...readings); // Put back in queue
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/biometric/readings/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ readings }),
      });

      if (!response.ok) {
        await response.json().catch(() => ({ error: 'Upload failed' }));
        this.readingsQueue.unshift(...readings);
      } else {
        // Successfully uploaded
      }
    } catch {
      this.readingsQueue.unshift(...readings);
    }
  }

  /**
   * Get latest reading of a specific type
   */
  getLatestReading(type: BiometricReading['type']): BiometricReading | undefined {
    return this.readingsQueue
      .filter(r => r.type === type)
      .sort((a, b) => b.timestamp - a.timestamp)[0];
  }

  /**
   * Add status change listener
   */
  addStatusListener(listener: (status: SensorStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      this.statusListeners = this.statusListeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify listeners of status changes
   */
  private notifyStatusListeners(status: SensorStatus): void {
    this.statusListeners.forEach(listener => listener(status));
  }

  /**
   * Force immediate collection and upload
   * Useful for on-demand sync
   */
  async forceSync(): Promise<void> {
    await this.collectSnapshot();
    await this.uploadQueuedReadings();
  }

  /**
   * Get today's aggregated sensor data for macro adjustment
   */
  async getTodaysAggregates(): Promise<{
    steps: number;
    activeMinutes: number;
    avgHeartRate: number;
    restingHeartRate: number;
    hrvRmssd?: number;
    stressScore: number;
  }> {
    // This would typically aggregate from stored readings or query Health directly
    // For now, return latest values from queue
    const stepsReading = this.getLatestReading('steps');
    const activeReading = this.getLatestReading('active_minutes');
    const hrReading = this.getLatestReading('heart_rate');
    const restingReading = this.getLatestReading('resting_hr');
    const hrvReading = this.getLatestReading('hrv');

    // Calculate stress score from HRV (inverse relationship)
    let stressScore = 50; // default
    if (hrvReading) {
      // HRV ms to stress: higher HRV = lower stress
      // Normal range: 20-100ms
      stressScore = Math.max(0, Math.min(100, 100 - ((hrvReading.value - 20) / 80) * 100));
    }

    return {
      steps: stepsReading?.value || 0,
      activeMinutes: activeReading?.value || 0,
      avgHeartRate: hrReading?.value || 70,
      restingHeartRate: restingReading?.value || 60,
      hrvRmssd: hrvReading?.value,
      stressScore,
    };
  }
}

export const sensorManager = new SensorManager();