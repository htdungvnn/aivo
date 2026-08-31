/**
 * AIVO Mobile Semantic Design Tokens
 * Premium dark-first health and fitness platform
 * Following the design system with semantic naming for Mobile-specific use
 */

import { Platform, TextStyle, ViewStyle } from 'react-native';

// =============================================================================
// Semantic Color Tokens
// =============================================================================

export const semanticColors = {
  // Core backgrounds
  background: '#080B0A',
  surface: '#0F1412',
  surfaceElevated: '#151B18',
  surfacePressed: '#1B231F',
  surfaceMuted: '#1A211E',

  // Primary brand
  primary: '#22C55E',
  primaryHover: '#16A34A',
  primaryForeground: '#052E16',
  primaryText: '#FFFFFF',

  // Accent (lime)
  accent: '#A3E635',
  accentHover: '#84CC16',
  accentForeground: '#1A2E05',

  // AI features (purple)
  ai: '#8B5CF6',
  aiHover: '#7C3AED',
  aiForeground: '#FFFFFF',

  // Sleep (blue)
  sleep: '#38BDF8',
  sleepHover: '#0EA5E9',
  sleepForeground: '#FFFFFF',

  // Hydration (cyan)
  hydration: '#22D3EE',
  hydrationHover: '#06B6D4',
  hydrationForeground: '#083344',

  // Nutrition (green/amber)
  nutrition: '#22C55E',
  nutritionSecondary: '#F59E0B',
  nutritionForeground: '#FFFFFF',

  // Workout (violet/orange)
  workout: '#8B5CF6',
  workoutSecondary: '#F97316',
  workoutForeground: '#FFFFFF',

  // Activity (green)
  activity: '#22C55E',
  activityForeground: '#FFFFFF',

  // Readiness (emerald)
  readiness: '#10B981',
  readinessForeground: '#FFFFFF',

  // Recovery (blue)
  recovery: '#3B82F6',
  recoveryForeground: '#FFFFFF',

  // Warning (amber)
  warning: '#F59E0B',
  warningHover: '#D97706',
  warningForeground: '#FFFFFF',

  // Danger (red)
  danger: '#EF4444',
  dangerHover: '#DC2626',
  dangerForeground: '#FFFFFF',

  // Text colors
  textPrimary: '#F5F7F6',
  textSecondary: '#C4CCC8',
  textMuted: '#8B9690',
  textDisabled: '#5A635F',

  // Borders
  border: 'rgba(255, 255, 255, 0.08)',
  borderHover: 'rgba(255, 255, 255, 0.12)',
  borderAccent: 'rgba(34, 197, 94, 0.3)',
  borderFocused: 'rgba(34, 197, 94, 0.5)',

  // Status
  success: '#22C55E',
  successForeground: '#FFFFFF',
  info: '#3B82F6',
  infoForeground: '#FFFFFF',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayLight: 'rgba(0, 0, 0, 0.4)',
  overlayDark: 'rgba(0, 0, 0, 0.8)',

  // Glass effects
  glass: 'rgba(15, 20, 18, 0.85)',
  glassBorder: 'rgba(255, 255, 255, 0.06)',
  glassStrong: 'rgba(15, 20, 18, 0.95)',

  // Chart colors
  chartReadiness: '#10B981',
  chartSleep: '#38BDF8',
  chartHydration: '#22D3EE',
  chartCalories: '#22C55E',
  chartProtein: '#F59E0B',
  chartCarbs: '#3B82F6',
  chartFat: '#8B5CF6',
  chartActivity: '#22C55E',
  chartWeight: '#A855F7',
  chartStress: '#F59E0B',
  chartHeartRate: '#EF4444',

  // Score ring backgrounds
  ringBackground: '#1A211E',
  ringTrack: '#2A322C',
} as const;

// Light theme colors
export const semanticColorsLight = {
  // Core backgrounds
  background: '#F5F7F6',
  surface: '#FFFFFF',
  surfaceElevated: '#F8FAF9',
  surfacePressed: '#EEF1EF',
  surfaceMuted: '#E5E8E6',

  // Primary brand (same)
  primary: '#22C55E',
  primaryHover: '#16A34A',
  primaryForeground: '#FFFFFF',
  primaryText: '#FFFFFF',

  // Accent (lime)
  accent: '#84CC16',
  accentHover: '#65A30D',
  accentForeground: '#FFFFFF',

  // AI features (purple)
  ai: '#7C3AED',
  aiHover: '#6D28D9',
  aiForeground: '#FFFFFF',

  // Sleep (blue)
  sleep: '#0EA5E9',
  sleepHover: '#0284C7',
  sleepForeground: '#FFFFFF',

  // Hydration (cyan)
  hydration: '#06B6D4',
  hydrationHover: '#0891B2',
  hydrationForeground: '#FFFFFF',

  // Nutrition (green/amber)
  nutrition: '#16A34A',
  nutritionSecondary: '#D97706',
  nutritionForeground: '#FFFFFF',

  // Workout (violet/orange)
  workout: '#7C3AED',
  workoutSecondary: '#EA580C',
  workoutForeground: '#FFFFFF',

  // Activity (green)
  activity: '#16A34A',
  activityForeground: '#FFFFFF',

  // Readiness (emerald)
  readiness: '#059669',
  readinessForeground: '#FFFFFF',

  // Recovery (blue)
  recovery: '#2563EB',
  recoveryForeground: '#FFFFFF',

  // Warning (amber)
  warning: '#D97706',
  warningHover: '#B45309',
  warningForeground: '#FFFFFF',

  // Danger (red)
  danger: '#DC2626',
  dangerHover: '#B91C1C',
  dangerForeground: '#FFFFFF',

  // Text colors
  textPrimary: '#080B0A',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textDisabled: '#D1D5DB',

  // Borders
  border: 'rgba(0, 0, 0, 0.08)',
  borderHover: 'rgba(0, 0, 0, 0.12)',
  borderAccent: 'rgba(34, 197, 94, 0.3)',
  borderFocused: 'rgba(34, 197, 94, 0.5)',

  // Status
  success: '#16A34A',
  successForeground: '#FFFFFF',
  info: '#2563EB',
  infoForeground: '#FFFFFF',

  // Overlays
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',
  overlayDark: 'rgba(0, 0, 0, 0.7)',

  // Glass effects
  glass: 'rgba(255, 255, 255, 0.9)',
  glassBorder: 'rgba(0, 0, 0, 0.06)',
  glassStrong: 'rgba(255, 255, 255, 0.98)',

  // Chart colors (same)
  chartReadiness: '#059669',
  chartSleep: '#0EA5E9',
  chartHydration: '#06B6D4',
  chartCalories: '#16A34A',
  chartProtein: '#D97706',
  chartCarbs: '#2563EB',
  chartFat: '#7C3AED',
  chartActivity: '#16A34A',
  chartWeight: '#9333EA',
  chartStress: '#D97706',
  chartHeartRate: '#DC2626',

  // Score ring backgrounds
  ringBackground: '#E5E7EB',
  ringTrack: '#D1D5DB',
} as const;

// =============================================================================
// Spacing System (8px base)
// =============================================================================

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  32: 128,
} as const;

// Named spacing
export const spacingNamed = {
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
  '7xl': 80,
  '8xl': 96,
} as const;

// =============================================================================
// Border Radius
// =============================================================================

export const borderRadius = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// Named radius
export const radiusNamed = {
  controls: 8,    // Small controls
  buttons: 12,    // Buttons and inputs
  cards: 16,      // Cards
  hero: 24,       // Hero cards
  pill: 9999,     // Pills
  circle: 9999,   // Circle
} as const;

// =============================================================================
// Typography
// =============================================================================

export const fontSize = {
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
  '8xl': 62,
} as const;

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

export const lineHeight = {
  tight: 1.15,
  snug: 1.3,
  normal: 1.5,
  relaxed: 1.65,
  loose: 1.8,
} as const;

export const letterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
} as const;

// =============================================================================
// Shadows
// =============================================================================

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  } as ViewStyle,
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: Platform.select({ ios: 0.15, android: 0.5 }),
    shadowRadius: 2,
    elevation: 2,
  } as ViewStyle,
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: Platform.select({ ios: 0.2, android: 0.6 }),
    shadowRadius: 6,
    elevation: 4,
  } as ViewStyle,
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: Platform.select({ ios: 0.25, android: 0.7 }),
    shadowRadius: 15,
    elevation: 8,
  } as ViewStyle,
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: Platform.select({ ios: 0.3, android: 0.8 }),
    shadowRadius: 25,
    elevation: 12,
  } as ViewStyle,
  glow: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Platform.select({ ios: 0.4, android: 0.5 }),
    shadowRadius: 20,
    elevation: 0,
  } as ViewStyle,
  glowLg: {
    shadowColor: '#22C55E',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: Platform.select({ ios: 0.5, android: 0.6 }),
    shadowRadius: 30,
    elevation: 0,
  } as ViewStyle,
} as const;

// =============================================================================
// Animation
// =============================================================================

export const duration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 400,
  slower: 600,
  slowest: 800,
} as const;

export const easing = {
  linear: 'linear',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  outExpo: 'cubic-bezier(0.16, 1, 0.3, 1)',
  outBack: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  spring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
} as const;

// =============================================================================
// Z-Index Scale
// =============================================================================

export const zIndex = {
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

export const touchTarget = {
  minimum: 44,
  comfortable: 48,
  large: 56,
} as const;

// =============================================================================
// Layout
// =============================================================================

export const layout = {
  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 24,
  itemGap: 12,
  safeAreaBottom: Platform.select({ ios: 34, android: 24 }) ?? 24,
  headerHeight: Platform.select({ ios: 96, android: 80 }) ?? 80,
  tabBarHeight: Platform.select({ ios: 84, android: 80 }) ?? 80,
  maxContentWidth: 600,
} as const;

// =============================================================================
// Accessibility
// =============================================================================

export const accessibility = {
  minTouchTarget: 44,
  minContrastRatio: 4.5,
  minContrastRatioLarge: 3.0,
  reducedMotionMaxDuration: 300,
} as const;

// =============================================================================
// Export all semantic tokens
// =============================================================================

export const semanticTokens = {
  colors: semanticColors,
  colorsLight: semanticColorsLight,
  spacing,
  spacingNamed,
  borderRadius,
  radiusNamed,
  fontSize,
  fontWeight,
  lineHeight,
  letterSpacing,
  shadows,
  duration,
  easing,
  zIndex,
  touchTarget,
  layout,
  accessibility,
} as const;

export type SemanticTokens = typeof semanticTokens;
export type SemanticColors = typeof semanticColors;
export type SemanticColorsLight = typeof semanticColorsLight;

// Helper to get colors for theme
export function getThemeColors(isDark: boolean) {
  return isDark ? semanticColors : semanticColorsLight;
}
