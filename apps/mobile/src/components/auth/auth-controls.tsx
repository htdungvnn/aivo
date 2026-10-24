import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { AuthColors } from './auth-primitives';

/**
 * The primary action button.
 *
 * It disables itself while a submission is in flight, which is what
 * prevents duplicate submissions.
 */
export function AuthButton({
  label,
  loading,
  loadingLabel,
  onPress,
  disabled,
  variant = 'primary'
}: {
  label: string;
  loading: boolean;
  loadingLabel: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}) {
  const isDisabled = loading || disabled === true;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' ? styles.buttonSecondary : styles.buttonPrimary,
        pressed && !isDisabled ? styles.buttonPressed : null,
        isDisabled ? styles.buttonDisabled : null,
      ]}>
      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={variant === 'primary' ? AuthColors.primaryInk : AuthColors.text} />
          <Text
            style={[
              styles.buttonLabel,
              variant === 'secondary' ? styles.buttonLabelSecondary : null,
            ]}>
            {loadingLabel}
          </Text>
        </View>
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'secondary' ? styles.buttonLabelSecondary : null,
          ]}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

/**
 * The social authentication buttons.
 *
 * Social auth is shown before the email form, matching the priority order
 * in the feature spec.
 */
export function AuthSocialButtons({
  providers,
  onSelect,
  loadingProvider
}: {
  providers: readonly ('google' | 'apple')[];
  onSelect: (provider: 'google' | 'apple') => void;
  loadingProvider?: 'google' | 'apple' | null;
}) {
  if (providers.length === 0) {
    return null;
  }

  return (
    <View style={styles.socialGroup}>
      {providers.map((provider) => (
        <Pressable
          key={provider}
          accessibilityRole="button"
          accessibilityState={{ busy: loadingProvider === provider }}
          disabled={loadingProvider !== null && loadingProvider !== provider}
          onPress={() => onSelect(provider)}
          style={({ pressed }) => [styles.socialButton, pressed ? styles.buttonPressed : null]}>
          {loadingProvider === provider ? (
            <ActivityIndicator color={AuthColors.text} />
          ) : (
            <Text style={styles.socialLabel}>
              Continue with {provider === 'google' ? 'Google' : 'Apple'}
            </Text>
          )}
        </Pressable>
      ))}
    </View>
  );
}

/**
 * The "or continue with email" divider.
 */
export function AuthDivider({ label = 'or continue with email' }: { label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label.toUpperCase()}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  buttonPrimary: {
    backgroundColor: AuthColors.primary,
  },
  buttonSecondary: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: AuthColors.hairlineStrong,
  },
  buttonPressed: {
    opacity: 0.85,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonLabel: {
    color: AuthColors.primaryInk,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonLabelSecondary: {
    color: AuthColors.text,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  socialGroup: {
    gap: Spacing.two,
  },
  socialButton: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: AuthColors.hairlineStrong,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialLabel: {
    color: AuthColors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: AuthColors.hairline,
  },
  dividerLabel: {
    color: AuthColors.textSecondary,
    fontSize: 11,
    letterSpacing: 1.4,
  },
});
