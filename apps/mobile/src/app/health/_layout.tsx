/**
 * AIVO Mobile - Health Module Layout
 * Shared layout for health-related screens
 */

import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';

export default function HealthLayout() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="readiness"
        options={{ title: 'Readiness' }}
      />
      <Stack.Screen
        name="sleep"
        options={{ title: 'Sleep' }}
      />
      <Stack.Screen
        name="activity"
        options={{ title: 'Activity' }}
      />
      <Stack.Screen
        name="hydration"
        options={{ title: 'Hydration' }}
      />
      <Stack.Screen
        name="body-metrics"
        options={{ title: 'Body Metrics' }}
      />
      <Stack.Screen
        name="habits"
        options={{ title: 'Habits' }}
      />
    </Stack>
  );
}
