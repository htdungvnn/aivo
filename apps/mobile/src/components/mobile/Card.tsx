/**
 * AIVO Mobile - Card Component
 * Consistent card surfaces for content grouping
 */

import React, { ReactNode } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { Colors, spacingNamed, borderRadius, Shadows, TouchTarget } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type CardVariant = 'default' | 'elevated' | 'glass' | 'bordered' | 'accent';
type CardPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

interface CardProps {
  children: ReactNode;
  variant?: CardVariant;
  padding?: CardPadding;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
}

const paddingMap: Record<CardPadding, number> = {
  none: 0,
  sm: spacingNamed.sm,
  md: spacingNamed.lg,
  lg: spacingNamed['2xl'],
  xl: spacingNamed['3xl'],
};

export function Card({
  children,
  variant = 'default',
  padding = 'md',
  style,
  onPress,
  disabled = false,
}: CardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const getBackgroundColor = (): string => {
    switch (variant) {
      case 'elevated':
        return colors.surfaceElevated;
      case 'glass':
        return colors.glass;
      case 'accent':
        return colors.surface;
      default:
        return colors.surface;
    }
  };

  const getBorderStyle = (): ViewStyle => {
    if (variant === 'bordered') {
      return {
        borderWidth: 1,
        borderColor: colors.border,
      };
    }
    if (variant === 'accent') {
      return {
        borderWidth: 1,
        borderColor: colors.borderAccent,
      };
    }
    return {
      borderWidth: 0.5,
      borderColor: colors.border,
    };
  };

  const getShadowStyle = (): ViewStyle => {
    if (variant === 'elevated') {
      return Shadows.md as ViewStyle;
    }
    return {};
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius: borderRadius.cards,
    padding: paddingMap[padding],
    ...getBorderStyle(),
    ...getShadowStyle(),
  };

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.7}
        style={[styles.card, cardStyle, disabled && styles.disabled, style]}
        accessibilityRole="button"
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[styles.card, cardStyle, style]}>{children}</View>;
}

// Section card with title
interface SectionCardProps extends CardProps {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  left?: ReactNode;
}

export function SectionCard({
  children,
  title,
  subtitle,
  right,
  left,
  style,
  ...props
}: SectionCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <Card style={style} {...props}>
      {(title || subtitle || right || left) && (
        <View style={styles.sectionHeader}>
          {left && <View style={styles.sectionLeft}>{left}</View>}
          <View style={styles.sectionTitleContainer}>
            {title && (
              <View style={styles.sectionTitleRow}>
                <View style={styles.sectionTitle}>
                  {/* Title text rendered by parent */}
                </View>
                {right && <View style={styles.sectionRight}>{right}</View>}
              </View>
            )}
            {subtitle && (
              <View style={styles.sectionSubtitle}>
                {/* Subtitle text rendered by parent */}
              </View>
            )}
          </View>
        </View>
      )}
      {children}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
  },
  disabled: {
    opacity: 0.5,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacingNamed.md,
  },
  sectionLeft: {
    marginRight: spacingNamed.md,
  },
  sectionTitleContainer: {
    flex: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    flex: 1,
  },
  sectionRight: {
    marginLeft: spacingNamed.md,
  },
  sectionSubtitle: {
    marginTop: spacingNamed.xs,
  },
});

export default Card;
