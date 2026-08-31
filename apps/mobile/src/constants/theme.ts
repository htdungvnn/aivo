/**
 * AIVO Mobile Theme - Design Tokens
 * Aligned with semantic tokens for consistent visual language
 * Premium dark-mode health and fitness platform
 */

import { Platform, Dimensions } from 'react-native';

// Re-export semantic tokens for backward compatibility
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
  getThemeColors,
  createTheme,
  darkTheme,
  lightTheme,
  type Theme,
  type ColorScheme,
  type ThemeColors,
} from './use-theme-tokens';

export type { SemanticTokens, SemanticColors, SemanticColorsLight } from './use-theme-tokens';

// =============================================================================
// AIVO Design System Colors (Legacy export for compatibility)
// =============================================================================

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

  // Domain-specific colors
  ai: '#8B5CF6',
  sleep: '#38BDF8',
  hydration: '#22D3EE',
  nutrition: '#22C55E',
  workout: '#8B5CF6',
  activity: '#22C55E',
  readiness: '#10B981',
  recovery: '#3B82F6',
  danger: '#EF4444',
} as const;

// Light theme (for future use)
export const LightColors = {
  background: '#F5F7F6',
  surface: '#FFFFFF',
  elevated: '#F8FAF9',
  muted: '#E5E8E6',

  primary: '#22C55E',
  primaryHover: '#16A34A',
  primaryForeground: '#FFFFFF',
  accent: '#84CC16',
  accentHover: '#65A30D',

  foreground: '#080B0A',
  mutedForeground: '#4B5563',
  tertiary: '#9CA3AF',

  border: 'rgba(0, 0, 0, 0.08)',
  borderHover: 'rgba(0, 0, 0, 0.12)',
  borderAccent: 'rgba(34, 197, 94, 0.3)',

  success: '#16A34A',
  warning: '#D97706',
  error: '#DC2626',
  info: '#2563EB',

  glass: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',

  // Domain-specific colors
  ai: '#7C3AED',
  sleep: '#0EA5E9',
  hydration: '#06B6D4',
  nutrition: '#16A34A',
  workout: '#7C3AED',
  activity: '#16A34A',
  readiness: '#059669',
  recovery: '#2563EB',
  danger: '#DC2626',
} as const;

// Colors object for theme hook compatibility
export const Colors = {
  light: LightColors,
  dark: AIVOColors,
} as const;

// =============================================================================
// Spacing Scale (aligned with 8px grid)
// =============================================================================

export const Spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

// Named spacing for clarity
export const SpacingNamed = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
  '6xl': 64,
} as const;

// =============================================================================
// Border Radius Scale
// =============================================================================

export const BorderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 24,
  full: 9999,
} as const;

export const RadiusNamed = {
  controls: 8,
  buttons: 12,
  cards: 16,
  hero: 24,
  pill: 9999,
} as const;

// =============================================================================
// Font Sizes (matching semantic tokens)
// =============================================================================

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 19,
  '2xl': 22,
  '3xl': 26,
  '4xl': 30,
  '5xl': 36,
  '6xl': 44,
  '7xl': 52,
} as const;

// Font Weights
export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

// Line Heights
export const LineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.65,
};

// =============================================================================
// Shadows (using elevation simulation)
// =============================================================================

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
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
      shadowOpacity: 0.2,
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
      shadowOpacity: 0.25,
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
      shadowOpacity: 0.3,
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
      shadowOpacity: 0.4,
      shadowRadius: 20,
    },
    android: {
      elevation: 0,
    },
  }),
} as const;

// =============================================================================
// Layout
// =============================================================================

export const BottomTabInset = Platform.select({ ios: 34, android: 24 }) ?? 24;
export const MaxContentWidth = 600;
export const SafeAreaPadding = Platform.select({ ios: 60, android: 50 }) ?? 50;

// Screen dimensions
export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// =============================================================================
// Animation Durations
// =============================================================================

export const Animation = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
} as const;

// =============================================================================
// Z-Index Scale
// =============================================================================

export const ZIndex = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
  tooltip: 600,
} as const;

// =============================================================================
// Touch Targets
// =============================================================================

export const TouchTarget = {
  minimum: 44,
  comfortable: 48,
  large: 56,
} as const;

// =============================================================================
// Typography
// =============================================================================

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
});

// =============================================================================
// Export all tokens as single object (legacy)
// =============================================================================

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
