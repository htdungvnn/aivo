/**
 * Themed View Component
 * AIVO Design System - Mobile Implementation
 */

import { View, type ViewProps, StyleSheet, Platform } from 'react-native';

import { Colors, Shadows } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SurfaceType = 
  | 'background' 
  | 'surface' 
  | 'elevated' 
  | 'muted'
  | 'glass'
  | 'primary'
  | 'accent';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: SurfaceType;
  variant?: 'default' | 'elevated' | 'glass' | 'bordered';
  padding?: 'none' | 'sm' | 'default' | 'lg';
  radius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
};

const radiusMap = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

const paddingMap = {
  none: 0,
  sm: 12,
  default: 16,
  lg: 24,
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type = 'background',
  variant = 'default',
  padding = 'none',
  radius = 'none',
  ...otherProps
}: ThemedViewProps) {
  const theme = useTheme();
  const colors = Colors[theme.dark ? 'dark' : 'light'];

  const getBackgroundColor = () => {
    switch (type) {
      case 'background':
        return colors.background;
      case 'surface':
        return colors.surface;
      case 'elevated':
        return colors.elevated;
      case 'muted':
        return colors.muted;
      case 'glass':
        return colors.glass;
      case 'primary':
        return colors.primary;
      case 'accent':
        return colors.accent;
      default:
        return colors.background;
    }
  };

  const getVariantStyles = (): ViewProps['style'] => {
    switch (variant) {
      case 'elevated':
        return [
          Shadows.md,
          Platform.OS === 'ios' && {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.3,
            shadowRadius: 8,
          },
        ];
      case 'glass':
        return {
          backgroundColor: colors.glass,
        };
      case 'bordered':
        return {
          borderWidth: 1,
          borderColor: colors.border,
        };
      default:
        return {};
    }
  };

  const backgroundColor = lightColor || darkColor || getBackgroundColor();

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: radiusMap[radius],
          padding: paddingMap[padding],
        },
        getVariantStyles(),
        style,
      ]}
      {...otherProps}
    />
  );
}

export default ThemedView;
