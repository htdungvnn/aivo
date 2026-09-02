/**
 * AIVO Mobile App - Root Layout
 * Entry point with theme provider, auth guard, and navigation setup
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthGuardProvider, useAuthGuard } from '@/contexts/AuthGuardContext';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Auth-aware layout component
function RootLayoutNav() {
  const { isReady, isAuthenticated, needsVerification, isSuspended } = useAuthGuard();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        {/* Auth Stack */}
        <Stack.Screen
          name="(auth)"
          options={{ headerShown: false }}
        />

        {/* Main App Tabs */}
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />

        {/* Health Module */}
        <Stack.Screen
          name="health"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Reports */}
        <Stack.Screen
          name="reports"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Settings */}
        <Stack.Screen
          name="settings"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Security */}
        <Stack.Screen
          name="security"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Profile */}
        <Stack.Screen
          name="profile"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Analysis */}
        <Stack.Screen
          name="analysis"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Nutrition */}
        <Stack.Screen
          name="nutrition"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Intelligence */}
        <Stack.Screen
          name="intelligence"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Meals */}
        <Stack.Screen
          name="meals"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Workouts */}
        <Stack.Screen
          name="workouts"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Coach Modal */}
        <Stack.Screen
          name="coach-modal"
          options={{
            headerShown: false,
            presentation: 'transparentModal',
            animation: 'fade',
          }}
        />

        {/* Notifications */}
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Integrations */}
        <Stack.Screen
          name="integrations"
          options={{
            headerShown: false,
            presentation: 'card',
          }}
        />

        {/* Onboarding */}
        <Stack.Screen
          name="onboarding"
          options={{
            headerShown: false,
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
    </>
  );
}

// Root layout component
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <AuthGuardProvider>
          <RootLayoutNav />
        </AuthGuardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
