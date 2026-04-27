# AIVO Design System - Complete Specification

**Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: 2025-04-27

This is the complete design system specification for AIVO. This document is the authoritative reference for designers and developers implementing the AIVO UI.

---

## Table of Contents

1. [Design Tokens](#design-tokens)
2. [Color System Deep Dive](#color-system-deep-dive)
3. [Typography System](#typography-system)
4. [Spacing & Grid](#spacing--grid)
5. [Component Specifications](#component-specifications)
6. [Platform Implementation Details](#platform-implementation-details)
7. [Animation & Motion](#animation--motion)
8. [Dark Theme Implementation](#dark-theme-implementation)
9. [Responsive Design Patterns](#responsive-design-patterns)
10. [Accessibility Requirements](#accessibility-requirements)
11. [Developer Workflow](#developer-workflow)
12. [Testing Guidelines](#testing-guidelines)

---

## Design Tokens

Design tokens are the single source of truth for all visual properties. They are defined once and used across platforms.

### Token Format

```typescript
// Token name: {category}-{property}-{variant}
// Example: color-primary-500, spacing-4, radius-md
```

### Token Categories

| Category | Prefix | Examples |
|----------|--------|----------|
| Colors | `color-` | `color-primary-500`, `color-success-500` |
| Spacing | `space-` | `space-4`, `space-8` |
| Typography | `text-` | `text-sm`, `text-lg` |
| Border Radius | `radius-` | `radius-sm`, `radius-md` |
| Shadows | `shadow-` | `shadow-sm`, `shadow-lg` |
| Font Weight | `font-` | `font-medium`, `font-bold` |
| Z-Index | `z-` | `z-10`, `z-50` |
| Transition | `transition-` | `transition-fast`, `transition-normal` |

---

## Color System Deep Dive

### Primary Palette

The primary color is the core brand color used for primary actions, links, and highlights.

```typescript
const primary = {
  50: '#eff6ff', // Lightest - backgrounds
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa', // Highlights
  500: '#3b82f6', // PRIMARY BRAND (main)
  600: '#2563eb', // Primary interactive
  700: '#1d4ed8', // Hover/focus
  800: '#1e40af',
  900: '#1e3a8a', // Darkest
};
```

**Usage guidelines**:
- `primary-500`: Primary buttons, active links, brand elements
- `primary-600`: Button hover states, emphasized elements
- `primary-400`: Highlights, focus rings, secondary actions
- `primary-50`-`100`: Light backgrounds, badges

### Accent Palette

Secondary brand color for variety and hierarchy.

```typescript
const accent = {
  400: '#a78bfa', // Light
  500: '#8b5cf6', // PRIMARY ACCENT
  600: '#7c3aed', // Interactive
  700: '#6d28d9', // Hover
};
```

**Usage**: Secondary buttons, tags, alternative highlights

### Neutral/Gray Scale

10-level grayscale for text, backgrounds, borders.

```typescript
const gray = {
  50: '#f9fafb', // Lightest bg (light theme)
  100: '#f3f4f6', // Card bg (light)
  200: '#e5e7eb', // Dividers
  300: '#d1d5db', // Disabled borders
  400: '#9ca3af', // Placeholder text
  500: '#6b7280', // Secondary text
  600: '#4b5563',
  700: '#374151', // Borders (dark)
  800: '#1f2937', // Card bg (dark)
  900: '#111827', // Background (dark)
  950: '#030712', // Deepest background
};
```

**Dark theme mapping**:
- Light theme `gray-50` (bg) → Dark theme `gray-950`
- Light theme `gray-900` (text) → Dark theme `gray-50`

### Semantic Colors

Pre-defined colors for common UI semantics.

```typescript
const semantic = {
  success: {
    50: '#ecfdf5',
    100: '#d1fae5',
    500: '#10b981', // Success state
    600: '#059669',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    500: '#f59e0b', // Warning state
    600: '#d97706',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    500: '#ef4444', // Error state
    600: '#dc2626',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    500: '#3b82f6', // Info state
    600: '#2563eb',
  },
};
```

### Color Application Matrix

| Token | Background | Text | Border | Fill | Use Case |
|-------|------------|------|--------|------|----------|
| `bg-background` | ✅ | | | | Main background |
| `bg-surface` | ✅ | | | | Card background |
| `bg-primary-500` | ✅ | | | | Primary button |
| `text-primary` | | ✅ | | | Main text |
| `text-secondary` | | ✅ | | | Secondary text |
| `border-primary` | | | ✅ | | Default border |
| `fill-primary` | | | | ✅ | Checkboxes, radios |

---

## Typography System

### Font Families

#### Web

```css
font-sans: 'Inter', system-ui, sans-serif;  /* Body text */
font-display: 'Geist', system-ui, sans-serif;  /* Headlines */
font-mono: 'JetBrains Mono', monospace;  /* Code, data */
```

**Installation**:
```bash
npm install @fontsource/inter @fontsource/geist @fontsource/jetbrains-mono
```

#### Mobile

```javascript
font-sans: 'System',  // SF Pro (iOS), Roboto (Android)
font-mono: 'JetBrainsMono',  // Must bundle font
```

**Installation**:
```bash
npx expo install expo-font @expo-google-fonts/inter
# JetBrains Mono needs manual font addition
```

### Type Scale

Modular scale: 1.25 ratio

| Scale | Size | Weight | Line Height | Token |
|-------|------|--------|-------------|-------|
| 0 | 12px | 400 | 16px (1.33) | `text-xs` |
| 1 | 14px | 400 | 20px (1.43) | `text-sm` |
| 2 | 16px | 400 | 24px (1.5) | `text-base` |
| 3 | 18px | 500 | 28px (1.56) | `text-lg` |
| 4 | 20px | 600 | 30px (1.5) | `text-xl` |
| 5 | 24px | 700 | 32px (1.33) | `text-2xl` |
| 6 | 30px | 700 | 36px (1.2) | `text-3xl` |
| 7 | 36px | 800 | 40px (1.11) | `text-4xl` |
| 8 | 48px | 800 | 48px (1.0) | `text-5xl` |
| 9 | 64px | 800 | 64px (1.0) | `text-6xl` |

### Font Weights

```typescript
const fontWeights = {
  light: 300,
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
};
```

### Text Styles Presets

```typescript
const textStyles = {
  // Headlines
  h1: 'text-4xl font-bold tracking-tight',
  h2: 'text-2xl font-semibold',
  h3: 'text-xl font-semibold',
  h4: 'text-lg font-semibold',
  
  // Body
  body: 'text-base font-normal',
  bodySmall: 'text-sm font-normal',
  
  // Labels
  label: 'text-sm font-medium',
  caption: 'text-xs font-normal text-text-secondary',
  
  // Code
  code: 'font-mono text-sm',
};
```

---

## Spacing & Grid

### Base Unit

**4px base grid**: All spacing should be multiples of 4px.

```typescript
const spacing = {
  1: '4px',   // 0.25rem
  2: '8px',   // 0.5rem
  3: '12px',  // 0.75rem
  4: '16px',  // 1rem ⭐ DEFAULT
  5: '20px',
  6: '24px',  // 1.5rem
  8: '32px',  // 2rem
  10: '40px',
  12: '48px', // 3rem
  16: '64px', // 4rem
  20: '80px', // 5rem
};
```

**Spacing rule**: Use `space-4` (16px) as the default gap. Increase by increments of 4.

### Layout Grid

#### Container Widths

```typescript
const containers = {
  sm: '640px',   // Mobile landscape
  md: '768px',   // Tablet portrait
  lg: '1024px',  // Laptop
  xl: '1280px',  // Desktop
  '2xl': '1536px', // Large screens
};
```

**Usage**:
```typescript
<div className="max-w-2xl mx-auto p-4 md:p-6">
  Content constrained to 2xl container, centered
</div>
```

### Grid System

#### Column Grid (12 columns)

```typescript
// Tailwind has this built-in
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
```

Responsive grid examples:
```typescript
// Mobile: 1 col, Tablet: 2 cols, Desktop: 3 cols
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

---

## Component Specifications

### 6.1 Button

#### Visual Specs

| Variant | Background | Text | Border | Hover |
|---------|------------|------|--------|-------|
| primary | `bg-primary-600` | white | none | `bg-primary-700` |
| secondary | `bg-gray-700` | white | none | `bg-gray-600` |
| outline | transparent | white | `border-gray-600` | `bg-gray-800` |
| ghost | transparent | white | none | `bg-gray-800` |
| destructive | `bg-error-500` | white | none | `bg-error-600` |

#### Dimensions

| Size | Height | Padding X | Padding Y | Font |
|------|--------|-----------|-----------|------|
| sm | 32px | 12px | 4px | text-sm |
| md | 40px | 16px | 8px | text-base ⭐ |
| lg | 48px | 24px | 12px | text-lg |
| xl | 56px | 32px | 16px | text-xl |

#### Border Radius

- All sizes: `border-radius: 8px` (`rounded-lg`)

#### States

**Focus Ring** (Web only):
```css
focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 focus:ring-offset-gray-900
```

**Disabled**:
- Opacity: 0.5
- Cursor: not-allowed

**Loading**:
- Show spinner (16px for md, 20px for lg)
- Spinner color: white (or primary-500 for outline/ghost)
- Disable button

#### Icon Placement

```typescript
// Left icon
<Button icon={<Icon />}>Text</Button>
// Classes: "flex-row items-center gap-2"

// Right icon
<Button iconRight={<Icon />}>Text</Button>
```

**Icon spacing**: `gap-2` (8px)

---

### 6.2 Card

#### Variants

| Variant | Background | Border | Shadow | Padding |
|---------|------------|--------|--------|---------|
| elevated | `bg-surface` | none | `shadow-lg` | p-6 |
| outlined | `bg-background` | `border-gray-700` | none | p-6 |
| filled | `bg-gray-800` | none | none | p-6 |

#### Structure

```
┌─────────────────────────────────────┐
│  [title] [actions?]                 │  ← Header row (flex, justify-between)
│  [subtitle]                         │
├─────────────────────────────────────┤
│                                     │
│  children content                   │  ← Body (padding-x: 0 optional)
│                                     │
├─────────────────────────────────────┤
│  [footer actions]                   │  ← Footer (optional)
└─────────────────────────────────────┘
```

**Spacing**:
- Header to body: `mt-4`
- Body to footer: `mt-6`
- Padding: `p-6` (default), `p-4` (sm), `p-8` (lg)

#### Title Styles

```typescript
title: 'text-xl font-semibold text-text-primary'
subtitle: 'text-sm text-text-secondary mt-1'
```

---

### 6.3 Input

#### Structure

```
┌─────────────────────────────────────────────┐
│  Label (required *)                        │
│  ┌─────────────────────────────────────┐  │
│  │ [prefix] Input text [suffix] [icon] │  │
│  └─────────────────────────────────────┘  │
│  helper-text / error-message             │
└─────────────────────────────────────────────┘
```

#### Dimensions

| State | Height | Padding X | Border Radius |
|-------|--------|-----------|---------------|
| Default | 44px | 12px | 8px |
| With prefix/suffix | 44px | 8px (inner) | 8px |
| Multiline | auto | 12px | 8px |

#### Input Field Styles

```css
/* Default */
background: #111827 (dark) / #ffffff (light)
border: 1px solid #374151
border-radius: 8px
color: #ffffff (dark) / #111827 (light)
font-size: 16px  /* Prevents iOS zoom */

/* Focus */
outline: none
border-color: #3b82f6
box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3)

/* Error */
border-color: #ef4444
box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2)

/* Disabled */
background: #1f2937
opacity: 0.6
cursor: not-allowed
```

#### Label Styles

```typescript
label: 'text-sm font-medium text-text-primary mb-2 block'
required: 'text-error-500 ml-1'  // After label text
```

#### Helper/Error Text

```typescript
helper: 'text-xs text-text-secondary mt-1.5'
error: 'text-xs text-error-500 mt-1.5'
```

---

### 6.4 Badge

#### Visual Specs

| Variant | Background | Text | Border | Padding |
|---------|------------|------|--------|---------|
| default | `bg-gray-700` | `text-gray-100` | none | `px-2.5 py-1` |
| primary | `bg-primary-500` | `text-white` | none | `px-2.5 py-1` |
| success | `bg-success-500` | `text-white` | none | `px-2.5 py-1` |
| warning | `bg-warning-500` | `text-white` | none | `px-2.5 py-1` |
| error | `bg-error-500` | `text-white` | none | `px-2.5 py-1` |

**Border radius**: `rounded-full` (capsule shape) for md/lg, `rounded-sm` for sm

**Font**: `text-xs font-medium` (sm), `text-sm font-medium` (md)

#### Dot Indicator

For status badges with colored dot:

```typescript
// Layout: [dot] [text] with gap-1.5
<Badge dot variant="primary">Live</Badge>
```

Dot: 6px diameter, full border radius, color = variant color

---

### 6.5 Avatar

#### Sizes

| Size | Dimensions | Image | Initials |
|------|------------|-------|----------|
| xs | 24×24px | 20px | 8px |
| sm | 32×32px | 28px | 10px |
| md | 40×40px | 36px | 12px |
| lg | 56×56px | 52px | 16px |
| xl | 80×80px | 76px | 24px |

#### Styles

```typescript
// Border
border: 2px solid #1f2937 (matches card bg)
border-radius: 50%

// Fallback background (when no image)
background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)

// Initials text
color: white
font-weight: 600
text-transform: uppercase
```

#### Status Indicator

Position: Bottom-right corner (absolute)

| Size | Dot Diameter | Offset |
|------|--------------|--------|
| xs | 8px | 2px |
| sm | 10px | 3px |
| md | 12px | 4px |
| lg | 16px | 5px |
| xl | 20px | 6px |

**Status colors**:
- `online`: `#10b981` (success-500)
- `offline`: `#6b7280` (gray-500)
- `away`: `#f59e0b` (warning-500)
- `busy`: `#ef4444` (error-500)

---

### 6.6 Modal

#### Structure

```
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐  │
│  │  [X] Title                    │     │  ← Header: close btn (right), title (left)
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │                                    │  │
│  │        Content Area                │  │  ← Body: scrollable if overflow
│  │        (max-height: 70vh)          │  │
│  │                                    │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │  [Cancel]  [Primary Action]        │  │  ← Footer: right-aligned actions
│  └─────────────────────────────────────┘  │
│  ┌─────────────────────────────────────┐  │
│  │              Overlay                │  │  ← Backdrop: dark with blur
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

#### Sizes

| Size | Width | Max Width | Content Max Height |
|------|-------|-----------|-------------------|
| sm | 100% | 400px | 60vh |
| md | 100% | 560px | 70vh ⭐ default |
| lg | 100% | 720px | 70vh |
| xl | 100% | 900px | 80vh |

#### Overlay

```css
position: fixed
inset: 0
background: rgba(0, 0, 0, 0.75)
backdrop-filter: blur(4px)  /* optional */
z-index: 50
```

#### Animation

**Web**: Framer Motion
```typescript
const variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};
```

**Mobile**: Reanimated
```typescript
const opacity = useSharedValue(0);
opacity.value = withTiming(1, { duration: 200 });
```

---

## Platform Implementation Details

### Web (Next.js)

#### CSS Architecture

```typescript
// apps/web/app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom CSS variables for theming */
:root {
  --color-primary-500: #3b82f6;
  --color-background: #ffffff;
  --color-text: #111827;
  /* ... */
}

.dark {
  --color-primary-500: #3b82f6;
  --color-background: #030712;
  --color-text: #ffffff;
}
```

#### Component Structure

```typescript
// components/common/Button.tsx
'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg',
  {
    variants: {
      variant: {
        primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
        secondary: 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-800',
        outline: 'border border-gray-600 bg-transparent text-white hover:bg-gray-800 active:bg-gray-700',
        ghost: 'bg-transparent text-white hover:bg-gray-800 active:bg-gray-700',
        destructive: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-700',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-base',
        lg: 'px-6 py-3 text-lg',
        xl: 'px-8 py-4 text-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, icon, children, ...props }, ref) => (
    <button
      ref={ref}
      className={buttonVariants({ variant, size, className })}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-2" />}
      {icon && <span className="mr-2">{icon}</span>}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
```

---

### Mobile (React Native + NativeWind)

#### Component Structure

```typescript
// components/common/Button.tsx
import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  disabled, 
  loading, 
  fullWidth,
  onPress, 
  children 
}: ButtonProps) {
  const getBackgroundColor = () => {
    if (disabled) return 'bg-gray-700';
    switch (variant) {
      case 'primary': return 'bg-primary-600';
      case 'secondary': return 'bg-gray-700';
      case 'outline': return 'bg-transparent border border-gray-600';
      case 'ghost': return 'bg-transparent';
      case 'destructive': return 'bg-error-500';
      default: return 'bg-primary-600';
    }
  };
  
  const getTextColor = () => {
    if (variant === 'outline' || variant === 'ghost') return 'text-white';
    return 'text-white';
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        flex-row items-center justify-center font-medium rounded-lg
        ${getBackgroundColor()}
        ${size === 'sm' ? 'px-3 py-1.5 text-sm' : ''}
        ${size === 'md' ? 'px-4 py-2 text-base' : ''}
        ${size === 'lg' ? 'px-6 py-3 text-lg' : ''}
        ${size === 'xl' ? 'px-8 py-4 text-xl' : ''}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50' : ''}
      `}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      activeOpacity={0.7}
    >
      {loading && <ActivityIndicator size="small" color="#ffffff" className="mr-2" />}
      <Text className={`${getTextColor()} text-center`}>{children}</Text>
    </TouchableOpacity>
  );
}
```

---

## Animation & Motion

### Timing

| Token | Duration | Easing | Use |
|-------|----------|--------|-----|
| fast | 150ms | `ease-out` | Button clicks, micro-interactions |
| normal | 250ms | `ease-in-out` | Page transitions, modals |
| slow | 400ms | `ease-in-out` | Complex animations |

### Common Animations

#### Fade In

```typescript
// Web - Framer Motion
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.25 }}
>
  Content
</motion.div>

// Mobile - Reanimated
const opacity = useSharedValue(0);
useEffect(() => {
  opacity.value = withTiming(1, { duration: 250 });
}, []);
```

#### Slide Up

```typescript
// Web
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25 }}
>
  Content
</motion.div>

// Mobile
const translateY = useSharedValue(20);
useEffect(() => {
  translateY.value = withTiming(0, { duration: 250 });
}, []);
```

#### Scale Press (Buttons)

```typescript
// Web
<motion.button
  whileTap={{ scale: 0.95 }}
  transition={{ duration: 0.1 }}
>
  Press me
</motion.button>

// Mobile
<TouchableOpacity
  activeOpacity={0.7}
>
  Press me
</TouchableOpacity>
```

---

## Dark Theme Implementation

### Theme Provider

```typescript
// apps/web/src/providers/ThemeProvider.tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark'); // Default dark
  
  useEffect(() => {
    // Check system preference
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');
    
    const handler = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? 'dark' : 'light');
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <html className={theme} data-theme={theme}>
        {children}
      </html>
    </ThemeContext.Provider>
  );
}
```

### Dark Theme Colors

Use Tailwind `dark:` variant:

```typescript
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content adapts to theme
</div>
```

**Common mappings**:

| Element | Light | Dark |
|---------|-------|------|
| Background | `bg-white` / `bg-gray-50` | `bg-gray-900` / `bg-gray-800` |
| Surface | `bg-white` | `bg-gray-800` |
| Text primary | `text-gray-900` | `text-white` |
| Text secondary | `text-gray-600` | `text-gray-400` |
| Border | `border-gray-200` | `border-gray-700` |

---

## Accessibility Requirements

### WCAG 2.1 AA Checklist

- [ ] **1.4.3 Contrast (Minimum)**: Text 4.5:1, large text 3:1 ✅ All tokens validated
- [ ] **2.1.1 Keyboard**: All functionality available via keyboard (web)
- [ ] **2.1.2 No Keyboard Trap**: Focus can move in/out of all components
- [ ] **2.4.3 Focus Order**: Logical, intuitive focus sequence
- [ ] **2.4.7 Focus Visible**: Focus indicator visible (blue ring, 2px)
- [ ] **2.5.1 Pointer Gestures**: Single-pointer available (no complex gestures)
- [ ] **2.5.2 Pointer Cancellation**: Actions cancelable (no accidental triggers)
- [ ] **2.5.3 Label in Name**: Button text matches accessible name
- [ ] **2.5.4 Motion Actuation**: No motion-only activation
- [ ] **4.1.2 Name, Role, Value**: Proper ARIA attributes

### Component Accessibility

#### Button

```typescript
// Accessible button
<button
  onClick={handleClick}
  disabled={isDisabled}
  aria-label="Save workout"  // If icon-only
  aria-describedby={error ? 'error-message' : undefined}
>
  Save
</button>
```

#### Input

```typescript
<label htmlFor="email">Email</label>
<input
  id="email"
  type="email"
  aria-invalid={!!error}
  aria-describedby={error ? 'email-error' : undefined}
  required
/>
{error && <span id="email-error" role="alert">{error}</span>}
```

#### Modal

```typescript
// When opening modal:
// 1. Set aria-hidden on main content
// 2. Trap focus within modal
// 3. Return focus to trigger element on close
// 4. Close on Escape key
```

---

## Developer Workflow

### Adding a New Component

1. **Design approval**: Get designs from senior-designer
2. **Create component**: Implement for web and mobile
3. **Add to exports**: `components/index.ts`
4. **Document**: Add to DESIGN_SYSTEM.md
5. **Test**: Accessibility, cross-platform
6. **Storybook** (future): Add stories

### Updating Tokens

1. Update `tailwind.config.ts` (web) and `tailwind.config.js` (mobile)
2. Document changes in this file
3. Bump version if breaking changes

---

## Testing Guidelines

### Visual Regression

Use Chromatic or similar to catch visual changes:

```bash
# Web
pnpm --filter @aivo/web test:chromatic

# Mobile (future)
pnpm --filter @aivo/mobile test:snapshot
```

### Accessibility Testing

```bash
# Web - Axe CLI
npx axe http://localhost:3000

# Manual - Screen reader
# iOS: VoiceOver (double-tap to activate)
# Android: TalkBack
```

### Cross-Platform Testing

| Test | Web | Mobile |
|------|-----|--------|
| Chrome | ✅ | - |
| Safari | ✅ | - |
| Firefox | ✅ | - |
| Edge | ✅ | - |
| iOS Safari | ✅ (responsive) | ✅ |
| Chrome Android | ✅ (responsive) | ✅ |
| Samsung Internet | ✅ | ✅ |

---

**Document Status**: Complete  
**Next Review**: When component library expands  
**Maintainers**: Design Team, Technical-docs
