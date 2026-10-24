import { emailSchema } from '@repo/auth';
import { router } from 'expo-router';
import { useState } from 'react';
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

import { AuthButton } from '@/components/auth/auth-controls';
import { AuthTextField } from '@/components/auth/auth-fields';
import { AuthColors, AuthError, AuthHeader, AuthLogo } from '@/components/auth/auth-primitives';
import { requestPasswordReset } from '@/lib/auth-actions';

/**
 * The forgot-password screen.
 *
 * The success state never reveals whether an account exists.
 */
export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();

  const [email, setEmail] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      setFormError(null);
      return;
    }

    setFieldError(undefined);
    setFormError(null);
    setIsSubmitting(true);

    const error = await requestPasswordReset(parsed.data);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsSent(true);
    setIsSubmitting(false);
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
        <AuthHeader
          title="Forgot your password?"
          subtitle="Enter your email and we'll send you instructions to reset your password."
        />

        {isSent ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Check your email</Text>
            <Text style={styles.cardBody}>
              If an account is associated with this email, password reset instructions have been
              sent.
            </Text>
          </View>
        ) : (
          <>
            <AuthError message={formError} />

            <AuthTextField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={fieldError}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            <AuthButton
              label="Send Reset Link"
              loading={isSubmitting}
              loadingLabel="Sending email..."
              onPress={handleSubmit}
            />
          </>
        )}

        <Pressable
          accessibilityRole="link"
          onPress={() => router.replace('/auth/sign-in')}
          style={styles.footer}>
          <Text style={styles.footerLink}>Back to Sign In</Text>
        </Pressable>
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
  card: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AuthColors.hairline,
    backgroundColor: AuthColors.card,
    padding: Spacing.four,
    gap: Spacing.two,
  },
  cardTitle: {
    color: AuthColors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  cardBody: {
    color: AuthColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  footer: {
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  footerLink: {
    color: AuthColors.textSecondary,
    fontSize: 14,
  },
});