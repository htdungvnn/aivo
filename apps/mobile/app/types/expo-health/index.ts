/**
 * Type declarations for expo-health
 * Note: The actual expo-health package (v0.0.0) is essentially empty.
 * This declaration file provides types for development.
 */

declare module 'expo-health' {
  export interface HealthPermissionResult {
    granted: boolean;
    scope: string;
  }

  export interface HealthPermissionsStatus {
    permissions: HealthPermissionResult[];
  }

  export interface HealthSample {
    startDate: string;
    endDate: string;
    value: number | string;
  }

  export interface HealthConstants {
    Permissions: {
      HeartRate: string;
      Steps: string;
      ActiveEnergyBurned: string;
      SleepAnalysis: string;
      BodyMass: string;
      BodyFatPercentage: string;
      HeartRateVariability: string;
      RestingHeartRate: string;
    };
    Steps: string;
    HeartRate: string;
    ActiveEnergyBurned: string;
    SleepAnalysis: string;
    BodyMass: string;
    BodyFatPercentage: string;
    HeartRateVariability: string;
    RestingHeartRate: string;
  }

  export function isAvailableAsync(): Promise<boolean>;
  export function requestPermissionsAsync(options: {
    permissions: {
      read: string[];
    };
  }): Promise<{ granted: boolean }>;
  export function getPermissionsAsync(): Promise<HealthPermissionsStatus>;
  export function getSamplesAsync(
    type: string,
    options: {
      startDate: Date;
      endDate: Date;
      unit?: string;
    }
  ): Promise<HealthSample[]>;

  export const Constants: HealthConstants;
}
