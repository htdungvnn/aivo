/**
 * OAuth Callback Screen
 * Handles the redirect from OAuth providers
 */

import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getAuthClient } from '@/lib/auth';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';

type CallbackStatus = 'loading' | 'success' | 'error';

export default function OAuthCallbackScreen() {
  const [status, setStatus] = useState<CallbackStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get URL parameters from the callback
        const code = params.code as string | undefined;
        const state = params.state as string | undefined;
        const errorParam = params.error as string | undefined;
        const errorDescription = params.error_description as string | undefined;

        // Check for OAuth errors
        if (errorParam) {
          throw new Error(errorDescription || errorParam);
        }

        // Validate required params
        if (!code || !state) {
          throw new Error('Missing required OAuth parameters');
        }

        // Get provider from storage
        const provider = params.provider as 'google' | 'facebook' | undefined;
        if (!provider) {
          throw new Error('Missing OAuth provider');
        }

        // Complete OAuth flow
        const authClient = getAuthClient();
        const result = await authClient.completeOAuth(provider, code, state);

        setStatus('success');

        // Redirect based on email verification
        setTimeout(() => {
          if (result.emailVerificationRequired) {
            router.replace('/auth/verification-pending');
          } else {
            router.replace('/profile');
          }
        }, 1000);
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleCallback();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="large" color="#208AEF" />
            <ThemedText style={styles.title}>Signing you in...</ThemedText>
            <ThemedText style={styles.subtitle}>
              Please wait while we complete the sign-in process.
            </ThemedText>
          </>
        )}

        {status === 'success' && (
          <>
            <View style={styles.successIcon}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
            <ThemedText style={styles.title}>Welcome!</ThemedText>
            <ThemedText style={styles.subtitle}>
              You have been signed in successfully. Redirecting...
            </ThemedText>
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.errorIcon}>
              <Text style={styles.errorX}>✕</Text>
            </View>
            <ThemedText style={styles.title}>Authentication Failed</ThemedText>
            <ThemedText style={styles.subtitle}>{error}</ThemedText>
            <Text
              style={styles.retryButton}
              onPress={() => router.replace('/auth/login')}
            >
              Back to Login
            </Text>
          </>
        )}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginTop: Spacing.four,
    marginBottom: Spacing.two,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorX: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
  },
  retryButton: {
    marginTop: Spacing.four,
    fontSize: 16,
    color: '#208AEF',
    fontWeight: '500',
  },
});
