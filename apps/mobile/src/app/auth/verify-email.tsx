import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

import { AuthButton } from '@/components/auth/auth-controls';
import { AuthColors, AuthError, AuthHeader, AuthLogo } from '@/components/auth/auth-primitives';
import { resendVerificationEmail } from '@/lib/auth-actions';

/**
 * The email verification screen.
 *
 * The user arrives here after signing up, or by opening the verification
 * link that was emailed to them.
 */
export default function VerifyEmailScreen() {
  const insets = useSafeAreaInsets();
  const { email } = useLocalSearchParams<{ email?: string }>();

  const [message, setMessage] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [canResend, setCanResend] = useState(true);
  const hasResent = useRef(false);

  // Resending is rate limited by the server; the client keeps a matching
  // cooldown so the button cannot be hammered.
  useEffect(() => {
    if (!canResend) {
      return;
    }
    const timeout = setTimeout(() => setCanResend(false), 30_000);
    return () => clearTimeout(timeout);
  }, [canResend]);

  async function handleResend() {
    if (isResending || !email || !canResend) {
      return;
    }

    setIsResending(true);
    setMessage(null);

    const error = await resendVerificationEmail(email);

    if (error) {
      setMessage(error.message);
      setIsResending(false);
      return;
    }

    setMessage("We've sent another verification link to your email.");
    hasResent.current = true;
    setCanResend(false);
    setIsResending(false);
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
      ]}>
      <AuthLogo />
      <AuthHeader title="Verify your email" subtitle="We've sent a verification link to:" />

      {email ? <Text style={styles.email}>{email}</Text> : null}

      <View style={styles.card}>
        <Text style={styles.cardBody}>
          Open the link we sent to confirm your address. Verification links expire after a short
          time.
        </Text>
      </View>

      <AuthError message={message} />

      <AuthButton
        label={canResend ? 'Resend Email' : 'Please wait before resending'}
        loading={isResending}
        loadingLabel="Sending..."
        onPress={handleResend}
        disabled={!canResend || !email}
      />

      <AuthButton
        label="Change Email"
        loading={false}
        loadingLabel="Changing..."
        variant="secondary"
        onPress={() => router.replace('/auth/sign-up')}
      />
    </ScrollView>
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
  email: {
    color: AuthColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AuthColors.hairline,
    backgroundColor: AuthColors.card,
    padding: Spacing.four,
  },
  cardBody: {
    color: AuthColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
});