import { emailSchema, type AuthProvider } from '@repo/auth';
import { Link, router } from 'expo-router';
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

import { AuthButton, AuthDivider, AuthSocialButtons } from '@/components/auth/auth-controls';
import { AuthPasswordField, AuthTextField } from '@/components/auth/auth-fields';
import { AuthColors, AuthError, AuthHeader, AuthLogo } from '@/components/auth/auth-primitives';
import { signInWithEmail, signInWithProvider } from '@/lib/auth-actions';
import { useAuthContext } from '@/lib/auth-context';
import { useAuthPolicy } from '@/lib/auth-policy';

/**
 * The sign-in screen.
 *
 * Only one primary action per state: the submit button, with the social
 * buttons above it.
 */
export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const { refresh } = useAuthContext();
  const { policy } = useAuthPolicy();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);

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

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    const error = await signInWithEmail(parsedEmail.data, password);

    if (error) {
      setFormError(error.message);
      setIsSubmitting(false);
      return;
    }

    await refresh();
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
        <AuthHeader title="Welcome back" subtitle="Continue your journey with AIVO." />

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
            returnKeyType="next"
          />

          <AuthPasswordField
            label="Password"
            value={password}
            onChangeText={setPassword}
            error={fieldErrors.password}
            placeholder="Enter your password"
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={handleSubmit}
          />

          <Pressable
            accessibilityRole="link"
            onPress={() => router.push('/auth/forgot-password')}
            style={styles.forgotLink}>
            <Text style={styles.forgotText}>Forgot password?</Text>
          </Pressable>
        </View>

        <AuthButton
          label="Sign In"
          loading={isSubmitting}
          loadingLabel="Signing in..."
          onPress={handleSubmit}
        />

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
  forgotLink: {
    alignSelf: 'flex-end',
  },
  forgotText: {
    color: AuthColors.textSecondary,
    fontSize: 14,
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
