import {
  buildPasswordRequirements,
  emailSchema,
  passwordsMatch,
  type AuthProvider,
} from '@repo/auth';
import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
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
import {
  AuthPasswordField,
  AuthPasswordRequirements,
  AuthTextField,
} from '@/components/auth/auth-fields';
import { AuthColors, AuthError, AuthHeader, AuthLogo } from '@/components/auth/auth-primitives';
import { signInWithProvider, signUpWithEmail } from '@/lib/auth-actions';
import { useAuthPolicy } from '@/lib/auth-policy';

/**
 * The sign-up screen.
 *
 * The password requirements come from the backend policy, so the checklist
 * shown here can never disagree with what the server enforces.
 */
export default function SignUpScreen() {
  const insets = useSafeAreaInsets();
  const { policy } = useAuthPolicy();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);

  const requirements = useMemo(
    () => buildPasswordRequirements(password, policy.minPasswordLength),
    [password, policy.minPasswordLength]
  );

  async function handleSubmit() {
    if (isSubmitting) {
      return;
    }

    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setFieldErrors({ email: parsedEmail.error.issues[0]?.message });
      setFormError(null);
      return;
    }

    if (password.length === 0) {
      setFieldErrors({ password: 'Password is required' });
      setFormError(null);
      return;
    }

    if (!passwordsMatch(password, confirmPassword)) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await signUpWithEmail(parsedEmail.data, password);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    // When email verification is required, the user confirms their address
    // before a session is created. Otherwise the account is usable right
    // away.
    if (policy.requireEmailVerification) {
      router.replace({
        pathname: '/auth/verify-email',
        params: { email: parsedEmail.data },
      });
      return;
    }

    router.replace('/(app)');
  }

  async function handleSocial(provider: Exclude<AuthProvider, 'credential'>) {
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
        <AuthHeader
          title="Create your AIVO account"
          subtitle="Your personalized fitness journey starts here."
        />

        <AuthSocialButtons
          providers={policy.providers}
          onSelect={handleSocial}
          loadingProvider={loadingProvider}
        />

        {policy.providers.length > 0 ? <AuthDivider /> : null}

        <AuthError message={formError} />

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
          />

          <View style={styles.passwordGroup}>
            <AuthPasswordField
              label="Password"
              value={password}
              onChangeText={setPassword}
              error={fieldErrors.password}
              placeholder="Create a password"
              autoComplete="new-password"
              textContentType="newPassword"
            />
            <AuthPasswordRequirements requirements={requirements.requirements} />
          </View>

          <AuthPasswordField
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            error={fieldErrors.confirmPassword}
            placeholder="Repeat your password"
            autoComplete="new-password"
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />
        </View>

        <AuthButton
          label="Create Account"
          loading={isSubmitting}
          loadingLabel="Creating account..."
          onPress={handleSubmit}
        />

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Link href="/auth/sign-in" asChild>
            <Pressable accessibilityRole="link" hitSlop={8}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  passwordGroup: {
    gap: Spacing.two,
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