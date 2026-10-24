import {
  buildPasswordRequirements,
  passwordsMatch,
} from '@repo/auth';
import { useLocalSearchParams, router } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

import { AuthButton } from '@/components/auth/auth-controls';
import {
  AuthPasswordField,
  AuthPasswordRequirements,
} from '@/components/auth/auth-fields';
import { AuthColors, AuthError, AuthHeader, AuthLogo } from '@/components/auth/auth-primitives';
import { resetPassword } from '@/lib/auth-actions';
import { useAuthPolicy } from '@/lib/auth-policy';

/**
 * The reset-password screen.
 *
 * The token comes from the reset link. An invalid or expired token is
 * reported as a generic message, and the user is offered a way to request a
 * new link.
 */
export default function ResetPasswordScreen() {
  const insets = useSafeAreaInsets();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { policy } = useAuthPolicy();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    newPassword?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const requirements = useMemo(
    () => buildPasswordRequirements(newPassword, policy.minPasswordLength),
    [newPassword, policy.minPasswordLength]
  );

  async function handleSubmit() {
    if (isSubmitting || !token) {
      return;
    }

    if (newPassword.length === 0) {
      setFieldErrors({ newPassword: 'Password is required' });
      setFormError(null);
      return;
    }

    if (!passwordsMatch(newPassword, confirmPassword)) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await resetPassword(newPassword, token);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    setIsDone(true);
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
          title="Reset your password"
          subtitle="Choose a new password to secure your account."
        />

        {!token ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>This reset link is no longer valid.</Text>
              <Text style={styles.cardBody}>
                Reset links expire after a short time. Request a new one to continue.
              </Text>
            </View>

            <AuthButton
              label="Request New Link"
              loading={false}
              loadingLabel="Requesting..."
              onPress={() => router.replace('/auth/forgot-password')}
            />
          </>
        ) : isDone ? (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Password updated</Text>
              <Text style={styles.cardBody}>
                Your password has been changed successfully.
              </Text>
            </View>

            <AuthButton
              label="Continue to Sign In"
              loading={false}
              loadingLabel="Continuing..."
              onPress={() => router.replace('/auth/sign-in')}
            />
          </>
        ) : (
          <>
            <AuthError message={formError} />

            <View style={styles.passwordGroup}>
              <AuthPasswordField
                label="New Password"
                value={newPassword}
                onChangeText={setNewPassword}
                error={fieldErrors.newPassword}
                placeholder="Create a new password"
                autoComplete="new-password"
                textContentType="newPassword"
              />
              <AuthPasswordRequirements requirements={requirements.requirements} />
            </View>

            <AuthPasswordField
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={fieldErrors.confirmPassword}
              placeholder="Repeat your new password"
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
            />

            <AuthButton
              label="Reset Password"
              loading={isSubmitting}
              loadingLabel="Resetting password..."
              onPress={handleSubmit}
            />
          </>
        )}
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
  passwordGroup: {
    gap: Spacing.two,
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
});