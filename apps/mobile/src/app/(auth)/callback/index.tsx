/**
 * AIVO Mobile - OAuth Callback Screen
 * Handles the OAuth redirect and completes authentication
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, useSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';

import {
  Screen,
  Card,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';

type AuthState = 'loading' | 'success' | 'error' | 'verification_required';

export default function CallbackScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { login } = useAuth();

  const [state, setState] = useState<AuthState>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    try {
      // Get the callback URL
      const url = await Linking.getInitialURL();
      
      if (!url) {
        throw new Error('No callback URL received');
      }

      // Parse the URL
      const parsedUrl = new URL(url);
      const code = parsedUrl.searchParams.get('code');
      const state = parsedUrl.searchParams.get('state');
      const error = parsedUrl.searchParams.get('error');
      const errorDescription = parsedUrl.searchParams.get('error_description');

      // Check for OAuth error
      if (error) {
        throw new Error(errorDescription || error);
      }

      // Check for required parameters
      if (!code || !state) {
        throw new Error('Invalid OAuth callback');
      }

      // For now, simulate successful auth
      // In production, this would call the backend to exchange the code
      setState('success');
      
      // Navigate to home after brief delay
      setTimeout(() => {
        router.replace('/(tabs)/today');
      }, 1500);

    } catch (err) {
      console.error('OAuth callback error:', err);
      setError(err instanceof Error ? err.message : 'Authentication failed');
      setState('error');
    }
  };

  const handleRetry = () => {
    router.replace('/(auth)/login');
  };

  const getStatusContent = () => {
    switch (state) {
      case 'loading':
        return {
          icon: <ActivityIndicator size="large" color={colors.primary} />,
          title: 'Connecting...',
          subtitle: 'Please wait while we complete the sign-in.',
        };
      case 'success':
        return {
          icon: (
            <View style={[styles.successIcon, { backgroundColor: colors.success + '20' }]}>
              <Text style={styles.successIconText}>✓</Text>
            </View>
          ),
          title: 'Welcome!',
          subtitle: 'Successfully signed in. Loading your dashboard...',
        };
      case 'verification_required':
        return {
          icon: (
            <View style={[styles.infoIcon, { backgroundColor: colors.info + '20' }]}>
              <Text style={styles.infoIconText}>📧</Text>
            </View>
          ),
          title: 'Email Verification Required',
          subtitle: 'Please check your email and verify your address.',
          action: {
            title: 'Resend Email',
            onPress: () => {
              // Would call API to resend verification
            },
          },
        };
      case 'error':
        return {
          icon: (
            <View style={[styles.errorIcon, { backgroundColor: colors.danger + '20' }]}>
              <Text style={styles.errorIconText}>✕</Text>
            </View>
          ),
          title: 'Sign In Failed',
          subtitle: error || 'Something went wrong. Please try again.',
          action: {
            title: 'Try Again',
            onPress: handleRetry,
          },
        };
    }
  };

  const content = getStatusContent();

  return (
    <Screen
      edges={['top', 'bottom']}
      contentStyle={styles.container}
    >
      <View style={styles.content}>
        <Card variant="elevated" padding="2xl" style={styles.card}>
          <View style={styles.iconContainer}>
            {content.icon}
          </View>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {content.title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {content.subtitle}
          </Text>

          {content.action && state === 'error' && (
            <View style={styles.actions}>
              <View style={[styles.button, { backgroundColor: colors.primary }]}>
                <Text
                  style={[styles.buttonText, { color: colors.primaryForeground }]}
                  onPress={content.action.onPress}
                >
                  {content.action.title}
                </Text>
              </View>
            </View>
          )}
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacingNamed.lg,
  },
  card: {
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: spacingNamed.xl,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successIconText: {
    fontSize: 32,
    color: '#22C55E',
  },
  infoIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIconText: {
    fontSize: 28,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorIconText: {
    fontSize: 28,
    color: '#EF4444',
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacingNamed.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    marginTop: spacingNamed.xl,
  },
  button: {
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed['2xl'],
    borderRadius: 12,
  },
  buttonText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
  },
});

export {};
