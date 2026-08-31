/**
 * AIVO Mobile - Auth Stack Layout
 * Authentication routes: login, callback, verification, suspended
 */

import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function AuthLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'fade',
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: 'Sign In',
        }}
      />
      <Stack.Screen
        name="callback"
        options={{
          title: 'Connecting...',
          animation: 'fade',
        }}
      />
      <Stack.Screen
        name="verification-pending"
        options={{
          title: 'Verify Email',
          animation: 'slide_from_right',
        }}
      />
      <Stack.Screen
        name="suspended"
        options={{
          title: 'Account Suspended',
          animation: 'slide_from_right',
        }}
      />
    </Stack>
  );
}
