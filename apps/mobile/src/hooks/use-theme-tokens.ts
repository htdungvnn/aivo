/**
 * AIVO Mobile Theme Hook
 * Provides semantic tokens and theme utilities for React Native
 */

import { useColorScheme, Appearance } from 'react-native';
import {
  semanticColors,
  semanticColorsLight,
  spacing,
  spacingNamed,
  borderRadius,
  radiusNamed,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  duration,
  easing,
  zIndex,
  touchTarget,
  layout,
  accessibility,
} from '@/constants/semantic-tokens';

// Theme types
export type ColorScheme = 'light' | 'dark';
export type ThemeColors = typeof semanticColors;
export type Spacing = typeof spacing;
export type FontSize = typeof fontSize;
export type BorderRadius = typeof borderRadius;
export type Shadows = typeof shadows;

// Combined theme object
export interface Theme {
  dark: boolean;
  colors: ThemeColors;
  spacing: Spacing;
  spacingNamed: typeof spacingNamed;
  borderRadius: BorderRadius;
  radiusNamed: typeof radiusNamed;
  fontSize: FontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  shadows: Shadows;
  duration: typeof duration;
  easing: typeof easing;
  zIndex: typeof zIndex;
  touchTarget: typeof touchTarget;
  layout: typeof layout;
  accessibility: typeof accessibility;
}

// Get color scheme
export function getColorScheme(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'unspecified' ? 'dark' : scheme ?? 'dark';
}

// Get theme colors
export function getThemeColors(isDark: boolean): ThemeColors {
  return isDark ? semanticColors : semanticColorsLight;
}

// Create theme object
export function createTheme(isDark: boolean): Theme {
  return {
    dark: isDark,
    colors: getThemeColors(isDark),
    spacing,
    spacingNamed,
    borderRadius,
    radiusNamed,
    fontSize,
    fontWeight,
    lineHeight,
    shadows,
    duration,
    easing,
    zIndex,
    touchTarget,
    layout,
    accessibility,
  };
}

// Pre-created themes
export const darkTheme = createTheme(true);
export const lightTheme = createTheme(false);

// Export individual tokens for direct access
export {
  semanticColors,
  semanticColorsLight,
  spacing,
  spacingNamed,
  borderRadius,
  radiusNamed,
  fontSize,
  fontWeight,
  lineHeight,
  shadows,
  duration,
  easing,
  zIndex,
  touchTarget,
  layout,
  accessibility,
};
