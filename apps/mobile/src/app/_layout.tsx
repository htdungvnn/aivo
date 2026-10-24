import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { AuthProvider, useAuthContext } from '@/lib/auth-context';

SplashScreen.preventAutoHideAsync();

/**
 * The root layout.
 *
 * The session is restored before any route renders, and the route guards
 * redirect based on the restored session — so the sign-in form never flashes
 * for a signed-in user.
 */
export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AnimatedSplashOverlay />
        <RootStack />
      </AuthProvider>
    </ThemeProvider>
  );
}

/**
 * The route tree with the authentication guards applied.
 */
function RootStack() {
  const { isLoading, isAuthenticated } = useAuthContext();

  // While the session is being restored the tree is empty, so no protected
  // or guest-only screen can render before the session is known.
  if (isLoading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated} redirectTo="/auth/sign-in">
        <Stack.Screen name="(app)" />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated} redirectTo="/(app)">
        <Stack.Screen name="auth/sign-in" />
        <Stack.Screen name="auth/sign-up" />
      </Stack.Protected>

      <Stack.Screen name="auth/forgot-password" />
      <Stack.Screen name="auth/reset-password" />
      <Stack.Screen name="auth/verify-email" />
      <Stack.Screen name="auth/callback" />
    </Stack>
  );
}
