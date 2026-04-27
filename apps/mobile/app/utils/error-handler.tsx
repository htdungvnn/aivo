import { useEffect, useState } from "react";
import type { NetInfoState } from "@react-native-community/netinfo";
import NetInfo from "@react-native-community/netinfo";
import { Alert, View, Text, StyleSheet } from "react-native";
import { WifiOff } from "lucide-react-native";
import colors from "@/theme/colors";

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
}

/**
 * Hook to monitor network connectivity
 */
export function useNetworkStatus() {
  const [networkState, setNetworkState] = useState<NetworkState>({
    isConnected: true,
    isInternetReachable: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setNetworkState({
        isConnected: state.isConnected ?? false,
        isInternetReachable: state.isInternetReachable,
      });
    });

    return () => unsubscribe();
  }, []);

  return networkState;
}

/**
 * Component to display offline/online status banner
 */
export function NetworkStatusBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const isOffline = !isConnected || isInternetReachable === false;

  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <WifiOff size={16} color="#fff" />
      <Text style={styles.bannerText}>You're offline. Some features may be limited.</Text>
    </View>
  );
}

/**
 * Global error handler for API errors with user-friendly messages
 */
export class ApiErrorHandler {
  static handle(error: unknown, context?: string): string {
    if (error instanceof Error) {
      const message = error.message;

      // Network errors
      if (message.includes("Network") || message.includes("fetch")) {
        return "Network error. Please check your internet connection.";
      }

      // Authentication errors
      if (message.includes("401") || message.includes("Unauthorized")) {
        return "Session expired. Please log in again.";
      }

      // Server errors
      if (message.includes("500") || message.includes("Server error")) {
        return "Server error. Please try again later.";
      }

      // Validation errors
      if (message.includes("422") || message.includes("Validation")) {
        return "Invalid data. Please check your input.";
      }

      // Resource not found
      if (message.includes("404") || message.includes("Not Found")) {
        return "Requested resource not found.";
      }

      // Default error message
      return context ? `${context}: ${message}` : message;
    }

    return "An unexpected error occurred. Please try again.";
  }

  static async showAlert(error: unknown, title: string = "Error", context?: string) {
    const message = this.handle(error, context);
    Alert.alert(title, message);
  }
}

/**
 * Retry logic for failed requests with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry on auth errors or client errors (4xx except 429)
      if (error instanceof Error) {
        const message = error.message;
        if (message.includes("401") || message.includes("403") || (message.includes("4") && !message.includes("429"))) {
          throw error;
        }
      }

      if (attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.error,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    gap: 8,
  },
  bannerText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: "500",
  },
});
