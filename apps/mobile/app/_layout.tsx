import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthProvider } from "@/contexts/AuthContext";
import { MetricsProvider } from "@/contexts/MetricsContext";
import colors from "@/theme/colors";

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.background.primary,
  },
});

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem("aivo_token");
      setIsAuthenticated(!!token);
    } catch {
      // Silently handle auth check errors
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
          ) : (
            <MetricsProvider>
              <>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="workout/[id]" options={{ headerShown: true, title: "Workout" }} />
                <Stack.Screen name="ai-chat" options={{ headerShown: true, title: "AI Coach" }} />
              </>
            </MetricsProvider>
          )}
        </Stack>
      </AuthProvider>
    </>
  );
}
