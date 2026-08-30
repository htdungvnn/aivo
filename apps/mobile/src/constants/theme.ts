/**
 * AIVO Mobile Theme - Design Tokens
 * Aligned with @repo/design-system for consistent visual language
 * Premium dark-mode health and fitness platform
 */

import { Platform } from 'react-native';

// AIVO Design System Colors
export const AIVOColors = {
  // Background Colors
  background: '#080B0A',
  surface: '#0F1412',
  elevated: '#151B18',
  muted: '#1A211E',

  // Brand Colors
  primary: '#22C55E',
  primaryHover: '#16A34A',
  primaryForeground: '#052E16',
  accent: '#A3E635',
  accentHover: '#84CC16',

  // Text Colors
  foreground: '#F5F7F6',
  mutedForeground: '#9CA7A1',
  tertiary: '#6B7872',

  // Border Colors
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
  borderAccent: 'rgba(34, 197, 94, 0.3)',

  // Semantic Colors
  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  // Glass Effect
  glass: 'rgba(15, 20, 18, 0.8)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',
} as const;

// Light theme (for future use)
export const LightColors = {
  background: '#F5F7F6',
  surface: '#FFFFFF',
  elevated: '#F0F2F0',
  muted: '#E5E7E5',

  primary: '#22C55E',
  primaryHover: '#16A34A',
  primaryForeground: '#FFFFFF',
  accent: '#84CC16',
  accentHover: '#65A30D',

  foreground: '#080B0A',
  mutedForeground: '#6B7872',
  tertiary: '#9CA7A1',

  border: 'rgba(0, 0, 0, 0.08)',
  borderHover: 'rgba(0, 0, 0, 0.12)',
  borderAccent: 'rgba(34, 197, 94, 0.3)',

  success: '#22C55E',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',

  glass: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',
} as const;

// Colors object for theme hook compatibility
export const Colors = {
  light: LightColors,
  dark: AIVOColors,
} as const;

// Spacing Scale (aligned with Tailwind spacing)
export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

// Border Radius Scale
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

// Font Sizes (matching Tailwind)
export const FontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
  '5xl': 48,
  '6xl': 60,
  '7xl': 72,
} as const;

// Font Weights
export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Line Heights
export const LineHeight = {
  tight: 1.1,
  snug: 1.25,
  normal: 1.5,
  relaxed: 1.625,
};

// Shadows (using elevation simulation)
export const Shadows = {
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    android: {
      elevation: 2,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 6,
    },
    android: {
      elevation: 4,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.4,
      shadowRadius: 15,
    },
    android: {
      elevation: 8,
    },
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 20 },
      shadowOpacity: 0.5,
      shadowRadius: 25,
    },
    android: {
      elevation: 12,
    },
  }),
  glow: Platform.select({
    ios: {
      shadowColor: '#22C55E',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.3,
      shadowRadius: 20,
    },
    android: {
      elevation: 0,
    },
  }),
} as const;

// Typography
export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Menlo',
  },
  default: {
    sans: 'Roboto',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

// Layout
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
export const SafeAreaPadding = Platform.select({ ios: 60, android: 50 }) ?? 50;

// Animation Durations
export const Animation = {
  fast: 150,
  normal: 300,
  slow: 500,
  slower: 700,
} as const;

// Z-Index Scale
export const ZIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
} as const;

// Export all tokens as single object
export const theme = {
  colors: AIVOColors,
  spacing: Spacing,
  borderRadius: BorderRadius,
  fontSize: FontSize,
  fontWeight: FontWeight,
  lineHeight: LineHeight,
  shadows: Shadows,
  fonts: Fonts,
  animation: Animation,
  zIndex: ZIndex,
} as const;

export type Theme = typeof theme;
