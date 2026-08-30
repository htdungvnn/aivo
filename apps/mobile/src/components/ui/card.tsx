/**
 * Mobile Card Component
 * AIVO Design System - Mobile Implementation
 */

import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { Colors, Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type CardVariant = 'default' | 'elevated' | 'glass' | 'borderAccent';
type CardPadding = 'none' | 'sm' | 'default' | 'lg';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  style?: ViewStyle;
  onPress?: () => void;
}

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm: Spacing[3],
  default: Spacing[4],
  lg: Spacing[6],
};

const radiusMap = {
  none: 0,
  sm: BorderRadius.sm,
  md: BorderRadius.md,
  lg: BorderRadius.lg,
  xl: BorderRadius.xl,
  '2xl': BorderRadius['2xl'],
  full: BorderRadius.full,
};

export function Card({
  children,
  variant = 'default',
  padding = 'default',
  style,
}: CardProps) {
  const theme = useTheme();
  const colors = Colors[theme.dark ? 'dark' : 'light'];

  const getBackgroundColor = () => {
    switch (variant) {
      case 'elevated':
        return colors.elevated;
      case 'glass':
        return colors.glass;
      case 'borderAccent':
        return colors.surface;
      default:
        return colors.surface;
    }
  };

  const getBorderStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: radiusMap.lg,
    };

    if (variant === 'borderAccent') {
      baseStyle.borderWidth = 1;
      baseStyle.borderColor = colors.borderAccent;
    } else {
      baseStyle.borderWidth = 1;
      baseStyle.borderColor = colors.border;
    }

    return baseStyle;
  };

  const getShadowStyle = (): ViewStyle => {
    if (variant === 'elevated') {
      return Shadows.lg as ViewStyle;
    }
    return {};
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: getBackgroundColor() },
        getBorderStyle(),
        getShadowStyle(),
        { padding: paddingMap[padding] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
});

export default Card;
