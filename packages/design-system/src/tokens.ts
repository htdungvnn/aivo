/**
 * AIVO Design System - Design Tokens
 * Premium dark-mode health and fitness platform
 */

// Color Palette
export const colors = {
  // Background Colors
  background: "#080B0A",
  surface: "#0F1412",
  elevated: "#151B18",
  muted: "#1A211E",

  // Brand Colors
  primary: "#22C55E",
  primaryHover: "#16A34A",
  primaryForeground: "#052E16",
  accent: "#A3E635",
  accentHover: "#84CC16",

  // Text Colors
  foreground: "#F5F7F6",
  mutedForeground: "#9CA7A1",
  tertiary: "#6B7872",

  // Border Colors
  border: "rgba(255, 255, 255, 0.08)",
  borderHover: "rgba(255, 255, 255, 0.12)",
  borderAccent: "rgba(34, 197, 94, 0.3)",

  // Semantic Colors
  success: "#22C55E",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#3B82F6",

  // Glass Effect
  glass: "rgba(15, 20, 18, 0.8)",
  glassBorder: "rgba(255, 255, 255, 0.06)",
} as const;

// Typography Scale
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

// Spacing Scale
export const spacing = {
  0: "0",
  1: "0.25rem",
  2: "0.5rem",
  3: "0.75rem",
  4: "1rem",
  5: "1.25rem",
  6: "1.5rem",
  8: "2rem",
  10: "2.5rem",
  12: "3rem",
  16: "4rem",
  20: "5rem",
  24: "6rem",
  32: "8rem",
} as const;

// Border Radius
export const radius = {
  sm: "0.375rem",
  md: "0.5rem",
  lg: "0.75rem",
  xl: "1rem",
  "2xl": "1.5rem",
  full: "9999px",
} as const;

// Shadows
export const shadows = {
  sm: "0 1px 2px 0 rgba(0, 0, 0, 0.4)",
  md: "0 4px 6px -1px rgba(0, 0, 0, 0.4), 0 2px 4px -2px rgba(0, 0, 0, 0.3)",
  lg: "0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3)",
  xl: "0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3)",
  glow: "0 0 40px rgba(34, 197, 94, 0.15)",
  glowLg: "0 0 60px rgba(34, 197, 94, 0.2)",
} as const;

// Animation
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

// Breakpoints
export const breakpoints = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1400px",
  "3xl": "1536px",
} as const;

// Container widths
export const containers = {
  sm: "640px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
  "2xl": "1400px",
  "3xl": "1536px",
} as const;

// Z-Index Scale
export const zIndex = {
  dropdown: "100",
  sticky: "200",
  overlay: "300",
  modal: "400",
  toast: "500",
} as const;

// Export all tokens as a single object
export const designTokens = {
  colors,
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
