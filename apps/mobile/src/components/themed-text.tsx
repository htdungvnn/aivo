/**
 * Themed Text Component
 * AIVO Design System - Mobile Implementation
 */

import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, FontSize, FontWeight, LineHeight, Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextVariant = 
  | 'default' 
  | 'title' 
  | 'titleLarge'
  | 'h2'
  | 'h3'
  | 'small' 
  | 'smallBold' 
  | 'subtitle' 
  | 'link' 
  | 'linkPrimary' 
  | 'code'
  | 'muted'
  | 'accent';

export type ThemedTextProps = TextProps & {
  variant?: TextVariant;
  themeColor?: keyof typeof Colors.dark;
};

export function ThemedText({ 
  style, 
  variant = 'default', 
  themeColor,
  ...rest 
}: ThemedTextProps) {
  const theme = useTheme();
  const colors = Colors[theme.dark ? 'dark' : 'light'];

  const getTextColor = () => {
    if (themeColor) {
      return colors[themeColor] || colors.foreground;
    }
    switch (variant) {
      case 'link':
        return colors.mutedForeground;
      case 'linkPrimary':
        return colors.primary;
      case 'muted':
        return colors.mutedForeground;
      case 'accent':
        return colors.accent;
      default:
        return colors.foreground;
    }
  };

  return (
    <Text
      style={[
        { color: getTextColor() },
        variant === 'default' && styles.default,
        variant === 'title' && styles.title,
        variant === 'titleLarge' && styles.titleLarge,
        variant === 'h2' && styles.h2,
        variant === 'h3' && styles.h3,
        variant === 'small' && styles.small,
        variant === 'smallBold' && styles.smallBold,
        variant === 'subtitle' && styles.subtitle,
        variant === 'link' && styles.link,
        variant === 'linkPrimary' && styles.linkPrimary,
        variant === 'code' && styles.code,
        variant === 'muted' && styles.muted,
        variant === 'accent' && styles.accent,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.normal,
    fontWeight: FontWeight.medium,
  },
  title: {
    fontSize: FontSize['4xl'],
    lineHeight: FontSize['4xl'] * LineHeight.tight,
    fontWeight: FontWeight.bold,
  },
  titleLarge: {
    fontSize: FontSize['5xl'],
    lineHeight: FontSize['5xl'] * LineHeight.tight,
    fontWeight: FontWeight.bold,
  },
  h2: {
    fontSize: FontSize['3xl'],
    lineHeight: FontSize['3xl'] * LineHeight.snug,
    fontWeight: FontWeight.bold,
  },
  h3: {
    fontSize: FontSize['2xl'],
    lineHeight: FontSize['2xl'] * LineHeight.snug,
    fontWeight: FontWeight.semibold,
  },
  small: {
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.normal,
    fontWeight: FontWeight.medium,
  },
  smallBold: {
    fontSize: FontSize.sm,
    lineHeight: FontSize.sm * LineHeight.normal,
    fontWeight: FontWeight.bold,
  },
  subtitle: {
    fontSize: FontSize.lg,
    lineHeight: FontSize.lg * LineHeight.relaxed,
    fontWeight: FontWeight.medium,
  },
  link: {
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.normal,
    fontWeight: FontWeight.medium,
    textDecorationLine: 'underline',
  },
  linkPrimary: {
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.normal,
    fontWeight: FontWeight.medium,
    textDecorationLine: 'underline',
  },
  code: {
    fontFamily: Platform.OS === 'ios' ? Fonts.mono : 'monospace',
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.sm,
    backgroundColor: 'rgba(0,0,0,0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  muted: {
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.normal,
    fontWeight: FontWeight.normal,
  },
  accent: {
    fontSize: FontSize.base,
    lineHeight: FontSize.base * LineHeight.normal,
    fontWeight: FontWeight.medium,
  },
});

export default ThemedText;
