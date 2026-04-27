import * as Health from 'expo-health';
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { createApiClient, type BiometricReading } from '@aivo/api-client';
import { ApiErrorHandler, retryWithBackoff } from '@/utils/error-handler';

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

export interface SyncResult {
  success: boolean;
  syncedRecords: number;
  errors: string[];
}

class WearableService {
  private isAuthorized: boolean = false;
  private isSyncing: boolean = false;
  private lastSyncTime: number = 0;

  /**
   * Check if health data is available on this device
   */
  async isAvailable(): Promise<boolean> {
    try {
      return await Health.isAvailableAsync();
    } catch {
      return false;
    }
  }

  /**
   * Request permissions for health data types
   */
  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const result = await Health.requestPermissionsAsync({
          permissions: {
            read: [
              Health.Constants.Permissions.HeartRate,
              Health.Constants.Permissions.Steps,
              Health.Constants.Permissions.ActiveEnergyBurned,
              Health.Constants.Permissions.SleepAnalysis,
              Health.Constants.Permissions.BodyMass,
              Health.Constants.Permissions.BodyFatPercentage,
              Health.Constants.Permissions.HeartRateVariability,
            ],
          },
        });
        this.isAuthorized = result.granted;
        return result.granted;
      } else {
        // Android - Google Fit permissions
        const result = await Health.requestPermissionsAsync({
          permissions: {
            read: [
              'com.google.android.gms.permission.ACTIVITY_RECOGNITION',
            ],
          },
        });
        this.isAuthorized = result.granted;
        return result.granted;
      }
    } catch {
      Alert.alert('Permission Error', 'Failed to request health data permissions');
      return false;
    }
  }

  /**
   * Check if we have already requested permissions
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const status = await Health.getPermissionsAsync();
      const hasReadPermission = status.permissions?.some(
        (p) => p.granted && p.scope === 'read'
      );
      this.isAuthorized = !!hasReadPermission;
      return this.isAuthorized;
    } catch {
      return false;
    }
  }

  /**
   * Get steps for a date range as individual readings
   */
  async getStepReadings(startDate: Date, endDate: Date): Promise<BiometricReading[]> {
    try {
      const steps = await Health.getSamplesAsync(
        Health.Constants.Steps,
        {
          startDate,
          endDate,
          unit: 'step',
        }
      );
      return steps.map((sample) => ({
        timestamp: new Date(sample.startDate).getTime(),
        type: 'steps' as const,
        value: sample.value as number,
        unit: 'steps',
        source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get heart rate samples
   */
  async getHeartRateReadings(startDate: Date, endDate: Date): Promise<BiometricReading[]> {
    try {
      const samples = await Health.getSamplesAsync(
        Health.Constants.HeartRate,
        {
          startDate,
          endDate,
          unit: 'bpm',
        }
      );
      return samples.map((sample) => ({
        timestamp: new Date(sample.startDate).getTime(),
        type: 'heart_rate' as const,
        value: sample.value as number,
        unit: 'bpm',
        source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get resting heart rate samples
   */
  async getRestingHeartRateReadings(startDate: Date, endDate: Date): Promise<BiometricReading[]> {
    try {
      // On iOS, we can query resting HR directly
      if (Platform.OS === 'ios') {
        const samples = await Health.getSamplesAsync(
          Health.Constants.RestingHeartRate,
          {
            startDate,
            endDate,
            unit: 'bpm',
          }
        );
        return samples.map((sample) => ({
          timestamp: new Date(sample.startDate).getTime(),
          type: 'resting_hr' as const,
          value: sample.value as number,
          unit: 'bpm',
          source: 'apple_health',
        }));
      }
      // On Android, derive from heart rate samples during sleep/rest
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get active minutes from energy burned
   */
  async getActiveMinutesReadings(startDate: Date, endDate: Date): Promise<BiometricReading[]> {
    try {
      const activeEnergy = await Health.getSamplesAsync(
        Health.Constants.ActiveEnergyBurned,
        {
          startDate,
          endDate,
          unit: 'kcal',
        }
      );
      // Rough conversion: 3.5 METs * minutes = kcal, so minutes = kcal / 3.5
      return activeEnergy.map((sample) => ({
        timestamp: new Date(sample.startDate).getTime(),
        type: 'active_minutes' as const,
        value: Math.round((sample.value as number) / 3.5),
        unit: 'minutes',
        source: Platform.OS === 'ios' ? 'apple_health' : 'google_fit',
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get heart rate variability (HRV) samples
   */
  async getHrvReadings(startDate: Date, endDate: Date): Promise<BiometricReading[]> {
    try {
      if (Platform.OS === 'ios') {
        const hrvSamples = await Health.getSamplesAsync(
          Health.Constants.HeartRateVariability,
          {
            startDate,
            endDate,
          }
        );
        return hrvSamples.map((sample) => ({
          timestamp: new Date(sample.startDate).getTime(),
          type: 'hrv' as const,
          value: Math.round(sample.value as number),
          unit: 'ms',
          source: 'apple_health',
        }));
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Get sleep data for a date range
   */
  async getSleepData(startDate: Date, endDate: Date): Promise<{
    durationHours: number;
    deepSleepMinutes: number;
    remSleepMinutes: number;
    awakeMinutes: number;
    date: string;
  }[]> {
    try {
      const sleepSamples = await Health.getSamplesAsync(
        Health.Constants.SleepAnalysis,
        {
          startDate,
          endDate,
        }
      );

      // Group by date
      const sleepByDate = new Map<string, Health.HealthSample[]>();
      sleepSamples.forEach((sample) => {
        const date = new Date(sample.startDate).toISOString().split('T')[0];
        if (!sleepByDate.has(date)) {
          sleepByDate.set(date, []);
        }
        sleepByDate.get(date)!.push(sample);
      });

      const results: {
        date: string;
        durationHours: number;
        deepSleepMinutes: number;
        remSleepMinutes: number;
        awakeMinutes: number;
      }[] = [];

      sleepByDate.forEach((samples, date) => {
        let totalMinutes = 0;
        let deepSleep = 0;
        let remSleep = 0;
        let awake = 0;

        samples.forEach((sample) => {
          const start = new Date(sample.startDate).getTime();
          const end = new Date(sample.endDate).getTime();
          const duration = (end - start) / (1000 * 60);
          totalMinutes += duration;

          const value = (sample.value as string).toLowerCase();
          if (value.includes('deep')) {
            deepSleep += duration;
          } else if (value.includes('rem')) {
            remSleep += duration;
          } else if (value.includes('awake')) {
            awake += duration;
          }
        });

        results.push({
          date,
          durationHours: totalMinutes / 60,
          deepSleepMinutes: Math.round(deepSleep),
          remSleepMinutes: Math.round(remSleep),
          awakeMinutes: Math.round(awake),
        });
      });

      return results;
    } catch {
      return [];
    }
  }

  /**
   * Get body composition data
   */
  async getBodyMetrics(startDate: Date, endDate: Date): Promise<Array<{
    weight?: number;
    bodyFatPercentage?: number;
    timestamp: number;
  }>> {
    try {
      const metrics: Array<{
        weight?: number;
        bodyFatPercentage?: number;
        timestamp: number;
      }> = [];

      // Get weight
      const weightSamples = await Health.getSamplesAsync(
        Health.Constants.BodyMass,
        {
          startDate,
          endDate,
          unit: 'kg',
        }
      );
      weightSamples.forEach((sample) => {
        const timestamp = new Date(sample.startDate).getTime();
        const existing = metrics.find((m) => Math.abs(m.timestamp - timestamp) < 3600000);
        if (existing) {
          existing.weight = sample.value as number;
        } else {
          metrics.push({
            weight: sample.value as number,
            timestamp,
          });
        }
      });

      // Get body fat percentage
      const fatSamples = await Health.getSamplesAsync(
        Health.Constants.BodyFatPercentage,
        {
          startDate,
          endDate,
          unit: '%',
        }
      );
      fatSamples.forEach((sample) => {
        const timestamp = new Date(sample.startDate).getTime();
        const existing = metrics.find((m) => Math.abs(m.timestamp - timestamp) < 3600000);
        if (existing) {
          existing.bodyFatPercentage = sample.value as number;
        } else {
          metrics.push({
            bodyFatPercentage: sample.value as number,
            timestamp,
          });
        }
      });

      return metrics;
    } catch {
      return [];
    }
  }

  /**
   * Sync all available health data for the past week
   */
  async syncAllData(): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, syncedRecords: 0, errors: ['Sync already in progress'] };
    }

    this.isSyncing = true;
    const errors: string[] = [];
    let totalSynced = 0;

    try {
      const api = createApiClient({
        baseUrl: API_URL,
        tokenProvider: async () => (await SecureStore.getItemAsync('aivo_token')) || '',
      });

      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 7); // Past week

      // 1. Sync sensor readings (steps, HR, active minutes, HRV)
      const allReadings: BiometricReading[] = [];

      const steps = await this.getStepReadings(startDate, endDate);
      allReadings.push(...steps);

      const heartRates = await this.getHeartRateReadings(startDate, endDate);
      allReadings.push(...heartRates);

      const restingHr = await this.getRestingHeartRateReadings(startDate, endDate);
      allReadings.push(...restingHr);

      const activeMinutes = await this.getActiveMinutesReadings(startDate, endDate);
      allReadings.push(...activeMinutes);

      const hrv = await this.getHrvReadings(startDate, endDate);
      allReadings.push(...hrv);

      if (allReadings.length > 0) {
        try {
          // Upload in batches of 1000 to avoid payload size limits
          const batchSize = 1000;
          for (let i = 0; i < allReadings.length; i += batchSize) {
            const batch = allReadings.slice(i, i + batchSize);
            await retryWithBackoff(() => api.uploadSensorReadings(batch));
            totalSynced += batch.length;
          }
        } catch (error) {
          errors.push(ApiErrorHandler.handle(error, 'Failed to sync sensor readings'));
        }
      }

      // 2. Sync sleep data
      const sleepData = await this.getSleepData(startDate, endDate);
      for (const sleep of sleepData) {
        try {
          await retryWithBackoff(() =>
            api.uploadSleepData({
              date: sleep.date,
              durationHours: sleep.durationHours,
              deepSleepMinutes: sleep.deepSleepMinutes,
              remSleepMinutes: sleep.remSleepMinutes,
              awakeMinutes: sleep.awakeMinutes,
              source: 'device',
            })
          );
          totalSynced++;
        } catch (error) {
          errors.push(ApiErrorHandler.handle(error, `Failed to sync sleep for ${sleep.date}`));
        }
      }

      // 3. Sync body composition
      const bodyMetrics = await this.getBodyMetrics(startDate, endDate);
      for (const metric of bodyMetrics) {
        if (metric.weight || metric.bodyFatPercentage) {
          try {
            await retryWithBackoff(() =>
              api.createBodyMetric({
                weight: metric.weight,
                bodyFatPercentage: metric.bodyFatPercentage,
                timestamp: metric.timestamp,
                source: 'device',
              })
            );
            totalSynced++;
          } catch (error) {
            errors.push(ApiErrorHandler.handle(error, 'Failed to sync body metric'));
          }
        }
      }

      this.lastSyncTime = Date.now();
      return {
        success: errors.length === 0,
        syncedRecords: totalSynced,
        errors,
      };
    } catch (error) {
      errors.push(ApiErrorHandler.handle(error, 'Sync failed'));
      return { success: false, syncedRecords: totalSynced, errors };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Get last sync time
   */
  getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  /**
   * Check if currently syncing
   */
  getIsSyncing(): boolean {
    return this.isSyncing;
  }
}

export const wearableService = new WearableService();
