import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';

import { AuthButton } from '@/components/auth/auth-controls';
import { AuthColors, AuthError, AuthHeader, AuthLogo } from '@/components/auth/auth-primitives';
import { useAuthContext } from '@/lib/auth-context';

/**
 * The authentication callback screen.
 *
 * Social providers return the user here after the redirect. The screen
 * waits for the session to be established, then routes on to the
 * authenticated destination. Provider errors are never shown verbatim.
 */
export default function AuthCallbackScreen() {
  const insets = useSafeAreaInsets();
  const { error } = useLocalSearchParams<{ error?: string }>();

  const { isLoading, isAuthenticated } = useAuthContext();
  const hasNavigated = useRef(false);

  const failed = Boolean(error) || (!isLoading && !isAuthenticated);

  useEffect(() => {
    if (failed || isLoading || hasNavigated.current) {
      return;
    }

    hasNavigated.current = true;
    router.replace('/(app)');
  }, [failed, isLoading]);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
      ]}>
      <AuthLogo />
      <AuthHeader
        title={failed ? 'Sign-in failed' : 'Signing you in'}
        subtitle={
          failed
            ? "We couldn't complete authentication."
            : 'One moment while we finish signing you in.'
        }
      />

      {failed ? (
        <>
          <AuthError message="We couldn't complete authentication." />

          <AuthButton
            label="Try Again"
            loading={false}
            loadingLabel="Retrying..."
            onPress={() => router.replace('/auth/sign-in')}
          />

          <AuthButton
            label="Back to Sign In"
            loading={false}
            loadingLabel="Returning..."
            variant="secondary"
            onPress={() => router.replace('/auth/sign-in')}
          />
        </>
      ) : (
        <View style={styles.loading}>
          <ActivityIndicator color={AuthColors.primary} />
          <Text style={styles.loadingText}>Authenticating...</Text>
        </View>
      )}
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
  loading: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.four,
  },
  loadingText: {
    color: AuthColors.textSecondary,
    fontSize: 15,
  },
});
