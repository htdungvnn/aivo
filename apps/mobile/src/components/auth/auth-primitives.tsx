import { Text, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

/**
 * The shared styles for the mobile authentication screens.
 *
 * The palette mirrors `apps/web/app/globals.css`, so the web and mobile
 * surfaces share one design system.
 */
export const AuthColors = {
  ink: Colors.dark.background,
  surface: Colors.dark.backgroundElement,
  card: Colors.dark.backgroundSelected,
  primary: Colors.dark.primary,
  primaryInk: Colors.dark.primaryInk,
  text: Colors.dark.text,
  textSecondary: Colors.dark.textSecondary,
  hairline: 'rgba(255, 255, 255, 0.08)',
  hairlineStrong: 'rgba(255, 255, 255, 0.16)',
  danger: '#F87171',
} as const;

/**
 * The AIVO wordmark shown at the top of every authentication screen.
 */
export function AuthLogo() {
  return (
    <View style={styles.logoRow}>
      <View style={styles.logoMark}>
        <View style={styles.logoGlyph} />
      </View>
      <Text style={styles.logoText}>AIVO</Text>
    </View>
  );
}

/**
 * The screen title and subtitle.
 */
export function AuthHeader({
  title,
  subtitle
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

/**
 * The inline error message.
 *
 * The message is safe to display: it never contains provider errors, tokens
 * or internal details.
 */
export function AuthError({ message }: { message?: string | null }) {
  if (!message) {
    return null;
  }

  return (
    <View accessibilityRole="alert" style={styles.errorBox}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

const styles = {
  logoRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: AuthColors.ink,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  logoGlyph: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 11,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: AuthColors.primary,
  },
  logoText: {
    color: AuthColors.text,
    fontSize: 16,
    fontWeight: '700' as const,
    letterSpacing: -0.2,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.four,
  },
  title: {
    color: AuthColors.text,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '600' as const,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: AuthColors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  errorBox: {
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 14,
    lineHeight: 20,
  },
};
