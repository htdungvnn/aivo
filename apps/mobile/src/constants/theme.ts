/**
 * The AIVO palette for the mobile app.
 *
 * Values mirror `apps/web/app/globals.css` and `packages/brand`, so the
 * three surfaces share one design system.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#FAFAFA',
    background: '#09090B',
    backgroundElement: '#111113',
    backgroundSelected: '#18181B',
    textSecondary: '#A1A1AA',
    primary: '#A3FF12',
    primaryInk: '#0A0F02',
  },
  dark: {
    text: '#FAFAFA',
    background: '#09090B',
    backgroundElement: '#111113',
    backgroundSelected: '#18181B',
    textSecondary: '#A1A1AA',
    primary: '#A3FF12',
    primaryInk: '#0A0F02',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
