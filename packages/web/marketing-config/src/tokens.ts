/**
 * AIVO Design System - Design Tokens
 * Premium dark-mode health and fitness platform with semantic tokens
 */

// =============================================================================
// Foundation Colors (Raw Values)
// =============================================================================

export const foundation = {
  // Dark Theme Backgrounds
  backgroundDark: "#080B0A",
  surfaceDark: "#0F1412",
  elevatedDark: "#151B18",
  mutedDark: "#1A211E",
  
  // Light Theme Backgrounds
  backgroundLight: "#FAFAF9",
  surfaceLight: "#FFFFFF",
  elevatedLight: "#F5F5F4",
  mutedLight: "#E7E5E4",
  
  // Brand Colors
  primary: "#22C55E",
  primaryHover: "#16A34A",
  primaryForeground: "#052E16",
  accent: "#A3E635",
  accentHover: "#84CC16",
  
  // Semantic Colors
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",
  
  // Health Domain Colors
  readiness: "#22C55E",
  sleep: "#38BDF8",
  hydration: "#22D3EE",
  nutrition: "#A3E635",
  workout: "#8B5CF6",
  activity: "#22C55E",
  ai: "#8B5CF6",
  weight: "#A855F7",
  stress: "#F59E0B",
  
  // Text Colors
  foregroundDark: "#F5F7F6",
  foregroundLight: "#1C1917",
  mutedForegroundDark: "#9CA7A1",
  mutedForegroundLight: "#78716C",
  tertiaryDark: "#6B7872",
  tertiaryLight: "#A8A29E",
  
  // Border Colors
  borderDark: "rgba(255, 255, 255, 0.08)",
  borderLight: "rgba(0, 0, 0, 0.08)",
  borderHoverDark: "rgba(255, 255, 255, 0.12)",
  borderHoverLight: "rgba(0, 0, 0, 0.12)",
  borderAccent: "rgba(34, 197, 94, 0.3)",
} as const;

// =============================================================================
// Semantic Color Tokens (Dark Theme)
// =============================================================================

export const semanticDark = {
  // Backgrounds and Surfaces
  "background.primary": foundation.backgroundDark,
  "background.surface": foundation.surfaceDark,
  "background.elevated": foundation.elevatedDark,
  "background.muted": foundation.mutedDark,
  
  // Foreground / Text
  "text.primary": foundation.foregroundDark,
  "text.secondary": foundation.mutedForegroundDark,
  "text.muted": foundation.tertiaryDark,
  "text.disabled": foundation.tertiaryDark,
  "text.inverse": foundation.backgroundDark,
  
  // Borders
  "border.default": foundation.borderDark,
  "border.hover": foundation.borderHoverDark,
  "border.active": foundation.borderAccent,
  "border.focus": foundation.primary,
  
  // Interactive States
  "interactive.default": foundation.surfaceDark,
  "interactive.hover": foundation.elevatedDark,
  "interactive.active": foundation.mutedDark,
  "interactive.disabled": foundation.mutedDark,
  
  // Brand / Primary
  "brand.primary": foundation.primary,
  "brand.primaryHover": foundation.primaryHover,
  "brand.primaryForeground": foundation.primaryForeground,
  "brand.accent": foundation.accent,
  "brand.accentHover": foundation.accentHover,
  
  // Semantic States
  "semantic.success": foundation.success,
  "semantic.successMuted": "rgba(34, 197, 94, 0.15)",
  "semantic.warning": foundation.warning,
  "semantic.warningMuted": "rgba(245, 158, 11, 0.15)",
  "semantic.error": foundation.error,
  "semantic.errorMuted": "rgba(239, 68, 68, 0.15)",
  "semantic.info": foundation.info,
  "semantic.infoMuted": "rgba(59, 130, 246, 0.15)",
  
  // Health Domains
  "health.readiness": foundation.readiness,
  "health.readinessMuted": "rgba(34, 197, 94, 0.15)",
  "health.sleep": foundation.sleep,
  "health.sleepMuted": "rgba(56, 189, 248, 0.15)",
  "health.hydration": foundation.hydration,
  "health.hydrationMuted": "rgba(34, 211, 238, 0.15)",
  "health.nutrition": foundation.nutrition,
  "health.nutritionMuted": "rgba(163, 230, 53, 0.15)",
  "health.workout": foundation.workout,
  "health.workoutMuted": "rgba(139, 92, 246, 0.15)",
  "health.activity": foundation.activity,
  "health.activityMuted": "rgba(34, 197, 94, 0.15)",
  "health.ai": foundation.ai,
  "health.aiMuted": "rgba(139, 92, 246, 0.15)",
  "health.weight": foundation.weight,
  "health.weightMuted": "rgba(168, 85, 247, 0.15)",
  "health.stress": foundation.stress,
  "health.stressMuted": "rgba(245, 158, 11, 0.15)",
  
  // Charts
  "chart.primary": foundation.primary,
  "chart.secondary": foundation.accent,
  "chart.tertiary": foundation.sleep,
  "chart.quaternary": foundation.hydration,
  "chart.quinary": foundation.workout,
  
  // Glass Effects
  "glass.background": "rgba(15, 20, 18, 0.8)",
  "glass.border": "rgba(255, 255, 255, 0.06)",
  
  // Overlay
  "overlay.light": "rgba(255, 255, 255, 0.05)",
  "overlay.medium": "rgba(255, 255, 255, 0.1)",
  "overlay.dark": "rgba(0, 0, 0, 0.5)",
} as const;

// =============================================================================
// Semantic Color Tokens (Light Theme)
// =============================================================================

export const semanticLight = {
  // Backgrounds and Surfaces
  "background.primary": foundation.backgroundLight,
  "background.surface": foundation.surfaceLight,
  "background.elevated": foundation.elevatedLight,
  "background.muted": foundation.mutedLight,
  
  // Foreground / Text
  "text.primary": foundation.foregroundLight,
  "text.secondary": foundation.mutedForegroundLight,
  "text.muted": foundation.tertiaryLight,
  "text.disabled": foundation.tertiaryLight,
  "text.inverse": foundation.foregroundDark,
  
  // Borders
  "border.default": foundation.borderLight,
  "border.hover": foundation.borderHoverLight,
  "border.active": foundation.primary,
  "border.focus": foundation.primary,
  
  // Interactive States
  "interactive.default": foundation.surfaceLight,
  "interactive.hover": foundation.elevatedLight,
  "interactive.active": foundation.mutedLight,
  "interactive.disabled": foundation.mutedLight,
  
  // Brand / Primary
  "brand.primary": foundation.primary,
  "brand.primaryHover": foundation.primaryHover,
  "brand.primaryForeground": foundation.primaryForeground,
  "brand.accent": foundation.accent,
  "brand.accentHover": foundation.accentHover,
  
  // Semantic States
  "semantic.success": foundation.success,
  "semantic.successMuted": "rgba(34, 197, 94, 0.1)",
  "semantic.warning": foundation.warning,
  "semantic.warningMuted": "rgba(245, 158, 11, 0.1)",
  "semantic.error": foundation.error,
  "semantic.errorMuted": "rgba(239, 68, 68, 0.1)",
  "semantic.info": foundation.info,
  "semantic.infoMuted": "rgba(59, 130, 246, 0.1)",
  
  // Health Domains
  "health.readiness": foundation.readiness,
  "health.readinessMuted": "rgba(34, 197, 94, 0.1)",
  "health.sleep": foundation.sleep,
  "health.sleepMuted": "rgba(56, 189, 248, 0.1)",
  "health.hydration": foundation.hydration,
  "health.hydrationMuted": "rgba(34, 211, 238, 0.1)",
  "health.nutrition": foundation.nutrition,
  "health.nutritionMuted": "rgba(163, 230, 53, 0.1)",
  "health.workout": foundation.workout,
  "health.workoutMuted": "rgba(139, 92, 246, 0.1)",
  "health.activity": foundation.activity,
  "health.activityMuted": "rgba(34, 197, 94, 0.1)",
  "health.ai": foundation.ai,
  "health.aiMuted": "rgba(139, 92, 246, 0.1)",
  "health.weight": foundation.weight,
  "health.weightMuted": "rgba(168, 85, 247, 0.1)",
  "health.stress": foundation.stress,
  "health.stressMuted": "rgba(245, 158, 11, 0.1)",
  
  // Charts
  "chart.primary": foundation.primary,
  "chart.secondary": foundation.accent,
  "chart.tertiary": foundation.sleep,
  "chart.quaternary": foundation.hydration,
  "chart.quinary": foundation.workout,
  
  // Glass Effects
  "glass.background": "rgba(255, 255, 255, 0.8)",
  "glass.border": "rgba(0, 0, 0, 0.06)",
  
  // Overlay
  "overlay.light": "rgba(0, 0, 0, 0.02)",
  "overlay.medium": "rgba(0, 0, 0, 0.05)",
  "overlay.dark": "rgba(0, 0, 0, 0.5)",
} as const;

// =============================================================================
// Color Palette (Legacy Export for Compatibility)
// =============================================================================

export const colors = {
  // Background Colors
  background: foundation.backgroundDark,
  surface: foundation.surfaceDark,
  elevated: foundation.elevatedDark,
  muted: foundation.mutedDark,

  // Brand Colors
  primary: foundation.primary,
  primaryHover: foundation.primaryHover,
  primaryForeground: foundation.primaryForeground,
  accent: foundation.accent,
  accentHover: foundation.accentHover,

  // Text Colors
  foreground: foundation.foregroundDark,
  mutedForeground: foundation.mutedForegroundDark,
  tertiary: foundation.tertiaryDark,

  // Border Colors
  border: foundation.borderDark,
  borderHover: foundation.borderHoverDark,
  borderAccent: foundation.borderAccent,

  // Semantic Colors
  success: foundation.success,
  warning: foundation.warning,
  error: foundation.error,
  info: foundation.info,

  // Glass Effect
  glass: "rgba(15, 20, 18, 0.8)",
  glassBorder: "rgba(255, 255, 255, 0.06)",
} as const;

// =============================================================================
// Health Domain Colors
// =============================================================================

export const healthColors = {
  readiness: foundation.readiness,
  sleep: foundation.sleep,
  hydration: foundation.hydration,
  nutrition: foundation.nutrition,
  workout: foundation.workout,
  activity: foundation.activity,
  ai: foundation.ai,
  weight: foundation.weight,
  stress: foundation.stress,
} as const;

// =============================================================================
// Typography Scale
// =============================================================================

export const typography = {
  fontSizes: {
    xs: "0.75rem",
    sm: "0.875rem",
    base: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
    "5xl": "3rem",
    "6xl": "3.75rem",
    "7xl": "4.5rem",
  },
  fontWeights: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  lineHeights: {
    tight: "1.1",
    snug: "1.25",
    normal: "1.5",
    relaxed: "1.625",
  },
} as const;

// =============================================================================
// Spacing Scale (8px Foundation)
// =============================================================================

export const spacing = {
  0: "0",
  1: "0.25rem",   // 4px
  2: "0.5rem",    // 8px
  3: "0.75rem",   // 12px
  4: "1rem",      // 16px
  5: "1.25rem",   // 20px
  6: "1.5rem",    // 24px
  8: "2rem",      // 32px
  10: "2.5rem",   // 40px
  12: "3rem",     // 48px
  16: "4rem",     // 64px
  20: "5rem",     // 80px
  24: "6rem",     // 96px
  32: "8rem",     // 128px
} as const;

// =============================================================================
// Border Radius (8px System)
// =============================================================================

export const radius = {
  controls: "8px",     // Buttons, inputs
  standard: "12px",    // Standard components
  cards: "16px",       // Cards, panels
  hero: "24px",        // Hero panels
  pill: "9999px",      // Pills, badges
} as const;

// =============================================================================
// Shadows
// =============================================================================

export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.4)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
  glow: "0 0 40px rgba(34, 197, 94, 0.15)",
  glowLg: "0 0 60px rgba(34, 197, 94, 0.2)",
  "glow-primary": "0 0 20px rgba(34, 197, 94, 0.3)",
  "glow-accent": "0 0 20px rgba(163, 230, 53, 0.3)",
  "glow-sleep": "0 0 20px rgba(56, 189, 248, 0.3)",
  "glow-hydration": "0 0 20px rgba(34, 211, 238, 0.3)",
  "glow-workout": "0 0 20px rgba(139, 92, 246, 0.3)",
  "glow-ai": "0 0 20px rgba(139, 92, 246, 0.3)",
} as const;

// =============================================================================
// Animation
// =============================================================================

export const animation = {
  easing: {
    outExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
    outBack: "cubic-bezier(0.34, 1.56, 0.64, 1)",
    spring: "cubic-bezier(0.175, 0.885, 0.32, 1.275)",
  },
  durations: {
    fast: "150ms",
    normal: "300ms",
    slow: "500ms",
    slower: "700ms",
  },
} as const;

// =============================================================================
// Breakpoints
// =============================================================================

export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1400px",
  "3xl": "1536px",
} as const;

// =============================================================================
// Container widths
// =============================================================================

export const containers = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1400px",
  "3xl": "1536px",
} as const;

// =============================================================================
// Z-Index Scale
// =============================================================================

export const zIndex = {
  base: "0",
  dropdown: "100",
  sticky: "200",
  header: "300",
  overlay: "400",
  modal: "500",
  popover: "600",
  toast: "700",
} as const;

// =============================================================================
// Export all tokens as a single object
// =============================================================================

export const designTokens = {
  foundation,
  semanticDark,
  semanticLight,
  colors,
  healthColors,
  typography,
  spacing,
  radius,
  shadows,
  animation,
  breakpoints,
  containers,
  zIndex,
} as const;

export type DesignTokens = typeof designTokens;

// =============================================================================
// Type Helpers
// =============================================================================

export type SemanticToken = keyof typeof semanticDark;
export type HealthDomain = keyof typeof healthColors;
