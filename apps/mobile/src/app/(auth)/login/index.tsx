/**
 * AIVO Mobile - Login Screen
 * OAuth authentication with Google and Facebook
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  Screen,
  Button,
  Card,
  Disclaimer,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { login, error, clearError, isLoading } = useAuth();

  const [loggingIn, setLoggingIn] = useState<'google' | 'facebook' | null>(null);

  const handleGoogleLogin = async () => {
    setLoggingIn('google');
    try {
      await login('google');
    } catch (err) {
      Alert.alert('Login Failed', 'Unable to sign in with Google. Please try again.');
    } finally {
      setLoggingIn(null);
    }
  };

  const handleFacebookLogin = async () => {
    setLoggingIn('facebook');
    try {
      await login('facebook');
    } catch (err) {
      Alert.alert('Login Failed', 'Unable to sign in with Facebook. Please try again.');
    } finally {
      setLoggingIn(null);
    }
  };

  return (
    <Screen
      edges={['top', 'bottom']}
      contentStyle={styles.container}
    >
      {/* Logo and branding */}
      <View style={styles.header}>
        <View style={[styles.logoContainer, { backgroundColor: colors.primary + '20' }]}>
          <Ionicons name="fitness" size={48} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Welcome to AIVO
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Your AI-powered health and fitness companion
        </Text>
      </View>

      {/* Features */}
      <Card variant="glass" padding="lg" style={styles.featuresCard}>
        <View style={styles.featuresList}>
          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.readiness + '20' }]}>
              <Ionicons name="pulse" size={20} color={colors.readiness} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                Daily Readiness
              </Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                Know your body's readiness level
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.nutrition + '20' }]}>
              <Ionicons name="restaurant" size={20} color={colors.nutrition} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                AI Meal Analysis
              </Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                Track nutrition with camera scanning
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.workout + '20' }]}>
              <Ionicons name="fitness" size={20} color={colors.workout} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                Camera Coach
              </Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                Real-time workout form feedback
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={[styles.featureIcon, { backgroundColor: colors.ai + '20' }]}>
              <Ionicons name="sparkles" size={20} color={colors.ai} />
            </View>
            <View style={styles.featureText}>
              <Text style={[styles.featureTitle, { color: colors.textPrimary }]}>
                Personal AI Coach
              </Text>
              <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
                Get guidance tailored to you
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Sign in options */}
      <View style={styles.signInContainer}>
        <Text style={[styles.signInTitle, { color: colors.textSecondary }]}>
          Sign in to continue
        </Text>

        <Button
          title="Continue with Google"
          onPress={handleGoogleLogin}
          variant="secondary"
          size="lg"
          fullWidth
          loading={loggingIn === 'google'}
          disabled={loggingIn !== null}
          leftIcon={
            <View style={styles.socialIcon}>
              <Text style={styles.socialIconText}>G</Text>
            </View>
          }
          style={styles.socialButton}
        />

        <Button
          title="Continue with Facebook"
          onPress={handleFacebookLogin}
          variant="secondary"
          size="lg"
          fullWidth
          loading={loggingIn === 'facebook'}
          disabled={loggingIn !== null}
          leftIcon={
            <View style={[styles.socialIcon, { backgroundColor: '#1877F2' }]}>
              <Text style={[styles.socialIconText, { color: '#FFFFFF' }]}>f</Text>
            </View>
          }
          style={styles.socialButton}
        />
      </View>

      {/* Terms */}
      <Disclaimer type="privacy" />

      <Text style={[styles.termsText, { color: colors.textMuted }]}>
        By continuing, you agree to our{' '}
        <Text style={{ color: colors.primary }}>Terms of Service</Text> and{' '}
        <Text style={{ color: colors.primary }}>Privacy Policy</Text>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacingNamed['2xl'],
  },
  header: {
    alignItems: 'center',
    marginTop: spacingNamed['3xl'],
  },
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacingNamed.lg,
  },
  title: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.bold,
    marginBottom: spacingNamed.sm,
  },
  subtitle: {
    fontSize: fontSize.base,
    textAlign: 'center',
  },
  featuresCard: {
    marginTop: spacingNamed['3xl'],
  },
  featuresList: {
    gap: spacingNamed.lg,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: fontSize.sm,
  },
  signInContainer: {
    marginTop: spacingNamed['3xl'],
  },
  signInTitle: {
    fontSize: fontSize.sm,
    textAlign: 'center',
    marginBottom: spacingNamed.lg,
  },
  socialButton: {
    marginBottom: spacingNamed.md,
  },
  socialIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialIconText: {
    fontSize: 14,
    fontWeight: fontWeight.bold,
    color: '#4285F4',
  },
  termsText: {
    fontSize: fontSize.xs,
    textAlign: 'center',
    marginTop: spacingNamed.lg,
    paddingHorizontal: spacingNamed.lg,
  },
});

export {};
