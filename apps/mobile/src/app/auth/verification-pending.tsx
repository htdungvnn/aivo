/**
 * Verification Pending Screen
 * Shown when email verification is required after OAuth
 */

import { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getAuthClient } from '@/lib/auth';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedButton } from '@/components/themed-button';
import { Spacing } from '@/constants/theme';

export default function VerificationPendingScreen() {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const authClient = getAuthClient();

  const handleResendEmail = async () => {
    setIsResending(true);
    setMessage(null);

    try {
      await authClient.sendVerificationEmail();
      setMessage('Verification email sent! Please check your inbox.');
    } catch (error) {
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to send verification email'
      );
    } finally {
      setIsResending(false);
    }
  };

  const handleContinue = () => {
    // For now, just go to profile - the user can verify later
    router.replace('/profile');
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📧</Text>
          </View>

          <ThemedText style={styles.title}>Verify Your Email</ThemedText>
          <ThemedText style={styles.subtitle}>
            We've sent a verification link to your email address. Please click the link to verify your account.
          </ThemedText>

          {message && (
            <View style={styles.messageContainer}>
              <Text style={styles.messageText}>{message}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <ThemedButton
              title={isResending ? 'Sending...' : 'Resend Email'}
              onPress={handleResendEmail}
              disabled={isResending}
              variant="outline"
              style={styles.button}
            />
            <ThemedButton
              title="Continue to App"
              onPress={handleContinue}
              style={styles.button}
            />
          </View>

          <ThemedText style={styles.note}>
            Note: Some features may be limited until your email is verified.
          </ThemedText>
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
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.four,
  },
  messageContainer: {
    backgroundColor: '#dcfce7',
    padding: Spacing.three,
    borderRadius: Spacing.two,
    marginBottom: Spacing.four,
  },
  messageText: {
    color: '#166534',
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    gap: Spacing.three,
    marginBottom: Spacing.four,
  },
  button: {
    width: '100%',
  },
  note: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    marginTop: Spacing.two,
  },
});
