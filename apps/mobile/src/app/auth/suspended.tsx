/**
 * Suspended Account Screen
 * Shown when user account is suspended
 */

import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/themed-button';
import { getAuthClient } from '@/lib/auth';
import { Spacing } from '@/constants/theme';

export default function SuspendedScreen() {
  const authClient = getAuthClient();

  const handleLogout = async () => {
    await authClient.clearTokens();
    // Force navigation to login
    window.location.href = '/auth/login';
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>⚠️</Text>
          </View>

          <ThemedText style={styles.title}>Account Suspended</ThemedText>
          <ThemedText style={styles.subtitle}>
            Your account has been suspended. This may be due to a violation of our terms of service or suspicious activity.
          </ThemedText>
          <ThemedText style={styles.subtitle}>
            If you believe this is a mistake, please contact our support team for assistance.
          </ThemedText>

          <View style={styles.actions}>
            <ThemedButton
              title="Sign Out"
              onPress={handleLogout}
              variant="outline"
              style={styles.button}
            />
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.four,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.two,
    color: '#ef4444',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.two,
  },
  actions: {
    marginTop: Spacing.four,
    gap: Spacing.three,
  },
  button: {
    width: '100%',
  },
});
