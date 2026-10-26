import {
  OTP_RESEND_COOLDOWN_SECONDS,
  emailSchema,
  otpSchema,
  type AuthProvider,
} from '@repo/auth';
import { Link, router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

import { AuthButton, AuthDivider, AuthSocialButtons } from '@/components/auth/auth-controls';
import { AuthOtpField, AuthTextField } from '@/components/auth/auth-fields';
import { AuthColors, AuthError, AuthHeader, AuthLogo } from '@/components/auth/auth-primitives';
import { requestOtpCode, signInWithProvider, verifyOtpCode } from '@/lib/auth-actions';
import { useAuthContext } from '@/lib/auth-context';
import { useAuthPolicy } from '@/lib/auth-policy';

/**
 * The sign-in screen.
 *
 * AIVO has no passwords: the user enters their email address, receives a
 * one-time password, and exchanges it for a session. The same flow creates
 * the account when the address is new, so sign-up and sign-in share one
 * screen.
 *
 * Only one primary action per state: the submit button, with the social
 * buttons above it.
 */
export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { refresh } = useAuthContext();
  const { policy } = useAuthPolicy();

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; otp?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'facebook' | null>(null);
  const [cooldown, setCooldown] = useState(0);

  /**
   * The resend cooldown keeps the UI in step with the server-side rate
   * limit, so the user is never left hitting an error.
   */
  useEffect(() => {
    if (cooldown <= 0) {
      return;
    }

    const timeout = setTimeout(() => setCooldown((current) => current - 1), 1000);

    return () => clearTimeout(timeout);
  }, [cooldown]);

  async function handleEmailSubmit() {
    if (isSubmitting) {
      return;
    }

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldErrors({ email: parsed.error.issues[0]?.message });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await requestOtpCode(parsed.data);

    setIsSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setEmail(parsed.data);
    setStep('code');
    setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    setNotice(`We sent a ${policy.otpLength}-digit code to ${parsed.data}.`);
  }

  async function handleCodeSubmit() {
    if (isSubmitting) {
      return;
    }

    const parsed = otpSchema.safeParse(otp);
    if (!parsed.success) {
      setFieldErrors({ otp: parsed.error.issues[0]?.message });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await verifyOtpCode(email, parsed.data);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    await refresh();
    router.replace('/(app)');
  }

  async function handleResend() {
    if (cooldown > 0 || isSubmitting) {
      return;
    }

    setFormError(null);
    setNotice(null);
    setIsSubmitting(true);

    const error = await requestOtpCode(email);

    setIsSubmitting(false);

    if (error) {
      setFormError(error.message);
      return;
    }

    setCooldown(OTP_RESEND_COOLDOWN_SECONDS);
    setNotice(`We sent a new code to ${email}.`);
  }

  async function handleSocial(provider: Exclude<AuthProvider, 'email'>) {
    if (isSubmitting || loadingProvider) {
      return;
    }

    setFormError(null);
    setLoadingProvider(provider);

    const error = await signInWithProvider(provider);

    if (error) {
      setFormError(error.message);
      setLoadingProvider(null);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
        ]}
        keyboardShouldPersistTaps="handled">
        <AuthLogo />
        <AuthHeader title="Welcome back" subtitle="Continue your journey with AIVO." />

        <AuthSocialButtons
          providers={policy.providers}
          onSelect={handleSocial}
          loadingProvider={loadingProvider}
        />

        {policy.providers.length > 0 ? <AuthDivider /> : null}

        <AuthError message={formError} />

        {step === 'email' ? (
          <View style={styles.fields}>
            <AuthTextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={fieldErrors.email}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={handleEmailSubmit}
            />

            <AuthButton
              label="Continue with Email"
              loading={isSubmitting}
              loadingLabel="Sending code..."
              onPress={handleEmailSubmit}
            />
          </View>
        ) : (
          <View style={styles.fields}>
            {notice ? (
              <View accessibilityRole="alert" style={styles.noticeBox}>
                <Text style={styles.noticeText}>{notice}</Text>
              </View>
            ) : null}

            <AuthOtpField
              label="Verification code"
              value={otp}
              onChangeText={setOtp}
              error={fieldErrors.otp}
              placeholder="000000"
              length={policy.otpLength}
              returnKeyType="go"
              onSubmitEditing={handleCodeSubmit}
            />

            <View style={styles.otpActions}>
              <Pressable
                accessibilityRole="link"
                onPress={() => {
                  setStep('email');
                  setOtp('');
                  setFieldErrors({});
                  setFormError(null);
                  setNotice(null);
                }}
                hitSlop={8}>
                <Text style={styles.actionText}>Change email</Text>
              </Pressable>

              <Pressable
                accessibilityRole="link"
                onPress={handleResend}
                disabled={cooldown > 0 || isSubmitting}
                hitSlop={8}>
                <Text style={[styles.actionText, cooldown > 0 ? styles.actionDisabled : null]}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </Text>
              </Pressable>
            </View>

            <AuthButton
              label="Verify and Sign In"
              loading={isSubmitting}
              loadingLabel="Verifying..."
              onPress={handleCodeSubmit}
            />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>
          <Link href="/auth/sign-up" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text style={styles.footerLink}>Create account</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#09090B',
  },
  content: {
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
  },
  fields: {
    gap: Spacing.three,
  },
  noticeBox: {
    borderWidth: 1,
    borderColor: AuthColors.hairline,
    backgroundColor: AuthColors.card,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  noticeText: {
    color: AuthColors.textSecondary,
    fontSize: 14,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionText: {
    color: AuthColors.textSecondary,
    fontSize: 14,
  },
  actionDisabled: {
    opacity: 0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.two,
    marginTop: Spacing.two,
  },
  footerText: {
    color: AuthColors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: AuthColors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
});
