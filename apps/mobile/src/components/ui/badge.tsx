/**
 * Mobile Badge Component
 * AIVO Design System - Mobile Implementation
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, FontSize, BorderRadius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type BadgeVariant = 'default' | 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'outline' | 'subtle';
type BadgeSize = 'sm' | 'default' | 'lg';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: ViewStyle;
}

const sizeStyles = {
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    fontSize: FontSize.xs,
  },
  default: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: FontSize.xs,
  },
  lg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    fontSize: FontSize.sm,
  },
};

export function Badge({
  children,
  variant = 'default',
  size = 'default',
  style,
}: BadgeProps) {
  const theme = useTheme();
  const colors = Colors[theme.dark ? 'dark' : 'light'];

  const getColors = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: `${colors.primary}20`,
          textColor: colors.primary,
          borderColor: `${colors.primary}30`,
        };
      case 'accent':
        return {
          backgroundColor: `${colors.accent}20`,
          textColor: colors.accent,
          borderColor: `${colors.accent}30`,
        };
      case 'success':
        return {
          backgroundColor: `${colors.success}20`,
          textColor: colors.success,
          borderColor: `${colors.success}30`,
        };
      case 'warning':
        return {
          backgroundColor: `${colors.warning}20`,
          textColor: colors.warning,
          borderColor: `${colors.warning}30`,
        };
      case 'error':
        return {
          backgroundColor: `${colors.error}20`,
          textColor: colors.error,
          borderColor: `${colors.error}30`,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          textColor: colors.mutedForeground,
          borderColor: colors.border,
        };
      case 'subtle':
        return {
          backgroundColor: colors.muted,
          textColor: colors.mutedForeground,
          borderColor: 'transparent',
        };
      default:
        return {
          backgroundColor: colors.elevated,
          textColor: colors.foreground,
          borderColor: colors.border,
        };
    }
  };

  const colorSet = getColors();
  const sizeSet = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: colorSet.backgroundColor,
          borderColor: colorSet.borderColor,
          paddingHorizontal: sizeSet.paddingHorizontal,
          paddingVertical: sizeSet.paddingVertical,
          borderWidth: variant === 'outline' || variant === 'default' ? 1 : 0,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colorSet.textColor,
            fontSize: sizeSet.fontSize,
          },
        ]}
      >
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.full,
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: '600',
  },
});

export default Badge;
