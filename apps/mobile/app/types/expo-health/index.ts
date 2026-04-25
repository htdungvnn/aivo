/**
 * Type declarations for expo-health
 * Note: The actual expo-health package (v0.0.0) is essentially empty.
 * This declaration file provides types for development.
 */

declare module 'expo-health' {
  export interface HealthClient {
    authorize(permissions: string[]): Promise<Record<string, string>>;
    getAuthStatusForPermissions(permissions: string[]): Promise<Record<string, string>>;
    getSamples(
      type: string,
      options: { startDate: Date; endDate: Date }
    ): Array<{ value: number }>;
  }

  export interface ClientOptions {
    clientOptions: {
      bundleIdentifier?: string;
      packageName?: string;
    };
  }

  export function createClient(options: ClientOptions): HealthClient;

  export const isAvailableAsync: () => Promise<boolean>;
}
