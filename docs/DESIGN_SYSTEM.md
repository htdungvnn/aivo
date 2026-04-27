# AIVO Design System

**Version**: 1.0.0  
**Last Updated**: 2025-04-27  
**Status**: Production Ready  
**Maintained by**: Design Team + Technical-docs

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Color System](#color-system)
4. [Typography](#typography)
5. [Spacing & Layout](#spacing--layout)
6. [Components](#components)
7. [Platform Implementation](#platform-implementation)
8. [Accessibility](#accessibility)
9. [Responsive Design](#responsive-design)
10. [Animations & Transitions](#animations--transitions)
11. [Quick Reference](#quick-reference)
12. [Resources](#resources)

---

## 1. Overview

### Purpose

The AIVO Design System provides a unified visual language for our web (Next.js) and mobile (Expo) applications. It ensures consistency, accelerates development, and maintains accessibility standards across all user touchpoints.

### Platforms

- **Web**: Next.js 15 with Tailwind CSS
- **Mobile**: React Native (Expo) with NativeWind v4
- **Future**: Watch apps, kiosks, etc.

### Core Values

1. **Clarity** - Information presented clearly without ambiguity
2. **Motivation** - Energetic, encouraging aesthetic that drives engagement
3. **Accessibility** - WCAG 2.1 AA compliant, inclusive design
4. **Performance** - Optimized rendering, minimal CSS overhead
5. **Consistency** - Same experience across all platforms

---

## 2. Design Principles

### Fitness-First Design

Every design decision should consider:
- **Actionability**: Can users quickly log workouts or metrics?
- **Motivation**: Does it encourage consistency?
- **Readability**: Can users view charts/data during workouts?
- **Context**: Appropriate for gym/home/office environments

### Dark-First Theme

AIVO uses a dark-first design system optimized for:
- Low-light gym environments
- Battery efficiency on mobile
- Modern, premium aesthetic

**Primary dark theme colors**:
- Background: `#030712` (very dark slate)
- Surface: `#111827` (dark gray)
- Text: `#ffffff` (white) / `#9ca3af` (gray)

Light theme is supported but secondary.

---

## 3. Color System

### Color Tokens

We use semantic color tokens rather than direct hex values. This enables theming and consistency.

#### Semantic Token Naming

`{element}-{variant}-{state}`

Examples:
- `bg-primary` - Primary background
- `text-secondary` - Secondary text color
- `border-focus` - Focus ring color
- `fill-interactive` - Interactive element fill

### Color Palette

#### Primary Brand Colors

| Token | Hex | Usage | Contrast (on dark) |
|-------|-----|-------|-------------------|
| `primary-50` | `#eff6ff` | Light backgrounds | - |
| `primary-100` | `#dbeafe` | - | - |
| `primary-200` | `#bfdbfe` | - | - |
| `primary-300` | `#93c5fd` | Highlights | - |
| `primary-400` | `#60a5fa` | Interactive elements | - |
| `primary-500` | `#3b82f6` | **Primary brand** | 7.2:1 ✅ |
| `primary-600` | `#2563eb` | Buttons, links | 8.1:1 ✅ |
| `primary-700` | `#1d4ed8` | Hover states | 9.1:1 ✅ |
| `primary-800` | `#1e40af` | - | - |
| `primary-900` | `#1e3a8a` | Dark accents | - |

#### Secondary/Accent Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `accent-400` | `#a78bfa` | Light purple accents |
| `accent-500` | `#8b5cf6` | **Secondary brand** |
| `accent-600` | `#7c3aed` | Accent buttons |

#### Neutral/Gray Scale

| Token | Hex | Usage |
|-------|-----|-------|
| `gray-50` | `#f9fafb` | Light bg (light theme) |
| `gray-100` | `#f3f4f6` | Cards (light) |
| `gray-200` | `#e5e7eb` | Dividers |
| `gray-300` | `#d1d5db` | Disabled borders |
| `gray-400` | `#9ca3af` | Placeholder text |
| `gray-500` | `#6b7280` | Secondary text |
| `gray-600` | `#4b5563` | - |
| `gray-700` | `#374151` | Borders, dividers (dark) |
| `gray-800` | `#1f2937` | Card backgrounds (dark) |
| `gray-900` | `#111827` | Backgrounds (dark) |
| `gray-950` | `#030712` | Deepest background |

#### Semantic Colors

| Token | Hex | Meaning | WCAG AA |
|-------|-----|---------|---------|
| `success-500` | `#10b981` | Success, positive | 5.3:1 ✅ |
| `warning-500` | `#f59e0b` | Warning, caution | 4.6:1 ✅ |
| `error-500` | `#ef4444` | Error, destructive | 5.6:1 ✅ |
| `info-500` | `#3b82f6` | Information | 4.7:1 ✅ |

### Dark Theme Colors

For dark mode, use semantic tokens that automatically adapt:

```typescript
// Web (Tailwind)
className="bg-background text-text-primary"

// Mobile (NativeWind)
className="bg-background text-text-primary"
```

**Dark theme mappings**:
- `bg-background` → `#030712`
- `bg-surface` → `#111827`
- `text-primary` → `#ffffff`
- `text-secondary` → `#9ca3af`
- `border-primary` → `#374151`

### Color Blindness Considerations

- Never rely on color alone to convey information
- Use icons + text with colors for status indicators
- Ensure sufficient contrast for all text (4.5:1 minimum)
- Test with color blindness simulators

---

## 4. Typography

### Font Families

#### Web (Next.js)

```javascript
// tailwind.config.ts
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  display: ['Geist', 'system-ui', 'sans-serif'], // Headlines, hero text
  mono: ['JetBrains Mono', 'monospace'], // Code, data
}
```

#### Mobile (Expo)

```javascript
// tailwind.config.js
fontFamily: {
  sans: 'System', // SF Pro on iOS, Roboto on Android
  display: 'System', // Same with bold weight
  mono: 'JetBrainsMono', // Must install font
}
```

**Note**: Install Geist font for web via npm package `@fontsource/geist`.

### Type Scale

We use a modular scale (1.25 ratio) for consistent sizing.

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `text-xs` | 12px | 400 | 16px (1.33) | Legal text, captions |
| `text-sm` | 14px | 400 | 20px (1.43) | Helper text, labels |
| `text-base` | 16px | 400 | 24px (1.5) | Body text (default) |
| `text-lg` | 18px | 500 | 28px (1.56) | Subheadings |
| `text-xl` | 20px | 600 | 30px (1.5) | Card titles |
| `text-2xl` | 24px | 700 | 32px (1.33) | Section headers |
| `text-3xl` | 30px | 700 | 36px (1.2) | Page titles |
| `text-4xl` | 36px | 800 | 40px (1.11) | Hero headlines |
| `text-5xl` | 48px | 800 | 48px (1.0) | Marketing, splash |
| `text-6xl` | 64px | 800 | 64px (1.0) | Display text only |

### Font Weights

- `font-light`: 300 (rarely used)
- `font-normal`: 400 (body text)
- `font-medium`: 500 (emphasis)
- `font-semibold`: 600 (subheadings)
- `font-bold`: 700 (headlines, buttons)
- `font-extrabold`: 800 (hero text)

### Text Styles

#### Headline Hierarchy

```typescript
// H1 - Page title
className="text-4xl font-bold tracking-tight"

// H2 - Section header
className="text-2xl font-semibold"

// H3 - Subsection
className="text-xl font-semibold"

// Body
className="text-base font-normal"

// Small label
className="text-sm font-medium"
```

---

## 5. Spacing & Layout

### Spacing Scale

Based on 4px base unit (8px grid is too coarse, 2px too fine).

| Token | Value | Use Case |
|-------|-------|----------|
| `space-1` | 4px | Tiny gaps, icon padding |
| `space-2` | 8px | Small spacing, icon margins |
| `space-3` | 12px | Uncommon |
| `space-4` | 16px | **Default padding**, component gaps |
| `space-5` | 20px | Uncommon |
| `space-6` | 24px | Large spacing, section gaps |
| `space-8` | 32px | Section padding |
| `space-10` | 40px | Large containers |
| `space-12` | 48px | Page margins |
| `space-16` | 64px | Hero sections |
| `space-20` | 80px | Full-page spacing |

**Rule of thumb**: Use multiples of 4px (`space-4`, `space-8`, `space-12`, etc.)

### Layout Grid

#### Container Widths

| Breakpoint | Width | Use |
|------------|-------|-----|
| `container-sm` | 640px | Mobile (landscape) |
| `container-md` | 768px | Tablet portrait |
| `container-lg` | 1024px | Laptop |
| `container-xl` | 1280px | Desktop |
| `container-2xl` | 1536px | Large screens |

#### Responsive Breakpoints

```javascript
// Tailwind/Web
sm: '640px'   // Mobile landscape
md: '768px'   // Tablet
lg: '1024px'  // Laptop
xl: '1280px'  // Desktop
2xl: '1536px' // Large desktop

// Mobile (NativeWind) - use Dimensions API
const { width } = Dimensions.get('window');
const breakpoint = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};
```

### Safe Areas (Mobile)

Always respect safe area insets on mobile:

```typescript
import { SafeAreaView } from 'react-native';

<SafeAreaView edges={['top', 'bottom']}>
  <Content />
</SafeAreaView>
```

---

## 6. Components

### 6.1 Button

Primary action component with multiple variants and sizes.

#### Variants

| Variant | Use Case |
|---------|----------|
| `primary` | Main action (CTA), submit buttons |
| `secondary` | Secondary actions, cancel |
| `outline` | Tertiary actions, low emphasis |
| `ghost` | Minimal emphasis, inline actions |
| `destructive` | Delete, remove, dangerous actions |

#### Sizes

| Size | Dimensions | Text | Use |
|------|------------|------|-----|
| `sm` | 32px h | text-sm | Compact UIs, dense lists |
| `md` | 40px h | text-base | **Default**, most buttons |
| `lg` | 48px h | text-lg | Important actions |
| `xl` | 56px h | text-xl | Hero sections |

#### States

- `default` - Normal state
- `hover` - Mouse over (web only)
- `active` - Pressed
- `disabled` - Cannot interact
- `loading` - Spinner instead of text

#### Props

```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean; // Mobile only
  icon?: ReactNode; // Left icon
  iconRight?: ReactNode; // Right icon
  onPress: () => void;
  children: React.ReactNode;
}
```

#### Examples

```typescript
// Primary button (default)
<Button onPress={handleSubmit}>Save Workout</Button>

// Secondary with icon
<Button variant="secondary" icon={<DownloadIcon />}>
  Export PDF
</Button>

// Destructive (delete)
<Button variant="destructive" onPress={handleDelete}>
  Delete Account
</Button>

// Disabled state
<Button disabled>Cannot Click</Button>

// Loading state
<Button loading>Submitting...</Button>
```

#### Implementation Notes

**Web**:
```typescript
// Use native <button> for accessibility
// Add focus ring for keyboard navigation
// Use cursor-pointer for hover feedback
```

**Mobile**:
```typescript
// Use TouchableOpacity or Pressable
// Add haptic feedback on press (optional)
// Minimum touch target: 44×44pt
```

---

### 6.2 Card

Container component for grouping related content with optional actions.

#### Variants

| Variant | Background | Border | Use |
|---------|------------|--------|-----|
| `elevated` | `bg-surface` | Shadow | Default, emphasizes importance |
| `outlined` | `bg-background` | `border-gray-700` | Subtle separation |
| `filled` | `bg-gray-800` | None | Compact, grouped items |

#### Sizes

| Size | Padding | Title |
|------|---------|-------|
| `sm` | `p-4` | `text-base` |
| `md` | `p-6` | `text-lg` ⬅ **Default** |
| `lg` | `p-8` | `text-xl` |

#### Props

```typescript
interface CardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  size?: 'sm' | 'md' | 'lg';
  title?: string;
  subtitle?: string;
  actions?: ReactNode; // Top-right action buttons
  footer?: ReactNode; // Bottom actions
  children: React.ReactNode;
  onClick?: () => void; // Makes card interactive
}
```

#### Examples

```typescript
// Basic card
<Card title="Today's Workout" subtitle="Upper Body Strength">
  <p>5 exercises • 45 minutes</p>
</Card>

// Card with actions
<Card
  title="Body Metrics"
  actions={<Button size="sm" variant="outline">Add</Button>}
>
  <WeightChart data={chartData} />
</Card>

// Interactive card
<Card onClick={navigateToDetail}>
  <WorkoutPreview workout={workout} />
</Card>

// Card with footer
<Card
  title="Nutrition Goals"
  footer={
    <div className="flex gap-2">
      <Button size="sm">Edit</Button>
    </div>
  }
>
  <MacroChart macros={macros} />
</Card>
```

---

### 6.3 Input

Form input with label, helper text, validation states, and optional icons.

#### Types Supported

- `text` - Default
- `email` - Email input with validation
- `password` - Masked input
- `number` - Numeric input
- `date` - Date picker (mobile uses native picker)
- `select` - Dropdown (use `Picker` on mobile)

#### States

| State | Styling |
|-------|---------|
| `default` | Gray border, white bg |
| `focus` | Blue ring, border primary |
| `error` | Red border, error message |
| `disabled` | Grayed out, no interaction |
| `success` | Green border, success icon (optional) |

#### Props

```typescript
interface InputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'email' | 'password' | 'number' | 'date';
  placeholder?: string;
  helperText?: string;
  error?: string; // Shows error state if provided
  prefix?: string; // Text before input (e.g., "$", "kg")
  suffix?: string; // Text after input (e.g., "lbs", "%")
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  disabled?: boolean;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;
  multiline?: boolean;
  rows?: number; // For multiline
}
```

#### Examples

```typescript
// Basic text input
<Input
  label="Weight (kg)"
  value={weight}
  onChange={setWeight}
  type="number"
/>

// With helper text
<Input
  label="Email"
  value={email}
  onChange={setEmail}
  type="email"
  helperText="We'll never share your email"
/>

// With error
<Input
  label="Password"
  value={password}
  onChange={setPassword}
  type="password"
  error="Password must be at least 8 characters"
/>

// With prefix/suffix
<Input
  label="Goal Weight"
  value={goalWeight}
  onChange={setGoalWeight}
  type="number"
  prefix="target:"
  suffix="kg"
/>

// Multiline (notes)
<Input
  label="Workout Notes"
  value={notes}
  onChange={setNotes}
  multiline
  rows={4}
  helperText="How did you feel? Any PRs?"
/>
```

---

### 6.4 Badge

Small status indicators and category labels.

#### Variants

| Variant | Background | Text | Use |
|---------|------------|------|-----|
| `default` | `bg-gray-700` | `text-gray-100` | Neutral labels |
| `primary` | `bg-primary-500` | `text-white` | Highlights |
| `success` | `bg-success-500` | `text-white` | Completed, achieved |
| `warning` | `bg-warning-500` | `text-white` | Caution, pending |
| `error` | `bg-error-500` | `text-white` | Errors, failures |

#### Sizes

| Size | Padding | Text | Radius |
|------|---------|------|--------|
| `sm` | `px-2 py-0.5` | `text-xs` | `rounded-sm` |
| `md` | `px-2.5 py-1` | `text-sm` | `rounded` ⬅ **Default** |
| `lg` | `px-3 py-1.5` | `text-base` | `rounded-md` |

#### Props

```typescript
interface BadgeProps {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode; // Badge text
  dot?: boolean; // Show colored dot indicator
}
```

#### Examples

```typescript
// Status badges
<Badge variant="success">Completed</Badge>
<Badge variant="warning">In Progress</Badge>
<Badge variant="error">Failed</Badge>

// With dot
<Badge variant="primary" dot>
  Live
</Badge>

// Size variants
<Badge size="sm">Small</Badge>
<Badge size="lg">Large</Badge>
```

---

### 6.5 Avatar

User profile pictures with fallback initials.

#### Sizes

| Size | Dimensions | Use |
|------|------------|-----|
| `xs` | 24px | Tiny badges, list items |
| `sm` | 32px | Compact lists |
| `md` | 40px | Default, lists, comments |
| `lg` | 56px | Profile headers |
| `xl` | 80px | Profile page, hero |

#### Props

```typescript
interface AvatarProps {
  src?: string; // Image URL
  alt: string; // Accessibility label
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'away' | 'busy'; // Status indicator dot
  initials?: string; // Fallback if no image (auto-generated if omitted)
}
```

#### Examples

```typescript
// With image
<Avatar
  src={user.avatarUrl}
  alt={user.name}
  size="md"
/>

// With fallback initials
<Avatar
  alt="John Doe"
  initials="JD"
  size="lg"
/>

// With status indicator
<Avatar
  src={user.avatarUrl}
  alt={user.name}
  size="sm"
  status="online"
/>

// Auto-generates initials from alt
<Avatar alt="Alice Smith" /> // Shows "AS"
```

---

### 6.6 Modal

Overlay dialogs for confirmations, forms, and critical content.

#### Sizes

| Size | Width | Max Width | Use |
|------|-------|-----------|-----|
| `sm` | 100% | 400px | Simple forms, confirmations |
| `md` | 100% | 560px | **Default**, forms, details |
| `lg` | 100% | 720px | Complex forms |
| `xl` | 100% | 900px | Full-screen mobile, wide content |

#### Props

```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnOverlayClick?: boolean; // Default: true
  closeOnEscape?: boolean; // Default: true
  showCloseButton?: boolean; // Default: true
  children: React.ReactNode;
  footer?: ReactNode; // Action buttons
}
```

#### Modal Patterns

**Confirmation Dialog**:
```typescript
<Modal
  isOpen={showDeleteConfirm}
  onClose={cancelDelete}
  title="Delete Workout?"
  description="This action cannot be undone."
  size="sm"
>
  <Modal.Actions>
    <Button variant="secondary" onPress={cancelDelete}>
      Cancel
    </Button>
    <Button variant="destructive" onPress={confirmDelete}>
      Delete
    </Button>
  </Modal.Actions>
</Modal>
```

**Form Modal**:
```typescript
<Modal
  isOpen={showEditModal}
  onClose={closeModal}
  title="Edit Workout"
  size="md"
>
  <WorkoutForm workout={workout} onSubmit={handleSubmit} />
  <Modal.Actions>
    <Button variant="secondary" onPress={closeModal}>
      Cancel
    </Button>
    <Button onPress={handleSubmit}>Save</Button>
  </Modal.Actions>
</Modal>
```

---

## 7. Platform Implementation

### Web (Next.js + Tailwind)

#### Configuration

`apps/web/tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class', // Controlled by theme provider
  theme: {
    extend: {
      colors: {
        // Primary palette
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        // Semantic tokens (light)
        background: '#ffffff',
        'background-secondary': '#f9fafb',
        surface: '#ffffff',
        'surface-secondary': '#f3f4f6',
        text: '#111827',
        'text-secondary': '#6b7280',
        'text-tertiary': '#9ca3af',
        border: '#e5e7eb',
        'border-secondary': '#d1d5db',
      },
      // Dark mode overrides
      dark: {
        background: '#030712',
        'background-secondary': '#111827',
        surface: '#111827',
        'surface-secondary': '#1f2937',
        text: '#ffffff',
        'text-secondary': '#9ca3af',
        'text-tertiary': '#6b7280',
        border: '#374151',
        'border-secondary': '#4b5563',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        'sm': ['14px', { lineHeight: '20px' }],
        'base': ['16px', { lineHeight: '24px' }],
        'lg': ['18px', { lineHeight: '28px' }],
        'xl': ['20px', { lineHeight: '30px' }],
        '2xl': ['24px', { lineHeight: '32px' }],
        '3xl': ['30px', { lineHeight: '36px' }],
        '4xl': ['36px', { lineHeight: '40px' }],
        '5xl': ['48px', { lineHeight: '48px' }],
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
        'full': '9999px',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      },
    },
  },
  plugins: [],
};
export default config;
```

#### Component Example (Web)

```typescript
// components/common/Button.tsx
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', loading, children, ...props }, ref) => {
    const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg';
    
    const variantClasses = {
      primary: 'bg-primary-600 text-white hover:bg-primary-700 active:bg-primary-800',
      secondary: 'bg-gray-700 text-white hover:bg-gray-600 active:bg-gray-800',
      outline: 'border border-gray-600 bg-transparent text-white hover:bg-gray-800 active:bg-gray-700',
      ghost: 'bg-transparent text-white hover:bg-gray-800 active:bg-gray-700',
      destructive: 'bg-error-500 text-white hover:bg-error-600 active:bg-error-700',
    };
    
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg',
      xl: 'px-8 py-4 text-xl',
    };
    
    return (
      <button
        ref={ref}
        className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
        {...props}
      >
        {loading && <Spinner size="sm" className="mr-2" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

---

### Mobile (Expo + NativeWind)

#### Configuration

`apps/mobile/tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Same palette as web
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          // ... all colors
        },
        background: '#000000',
        'background-secondary': '#111827',
        surface: '#111827',
        text: '#ffffff',
        'text-secondary': '#9ca3af',
        border: '#374151',
      },
      spacing: {
        '1': 4,
        '2': 8,
        '3': 12,
        '4': 16,
        '6': 24,
        '8': 32,
        '12': 48,
        '16': 64,
      },
      fontSize: {
        'xs': 12,
        'sm': 14,
        'base': 16,
        'lg': 18,
        'xl': 20,
        '2xl': 24,
        '3xl': 30,
        '4xl': 36,
      },
      borderRadius: {
        'sm': 6,
        'md': 8,
        'lg': 12,
        'xl': 16,
      },
    },
  },
  plugins: [],
};
```

#### Component Example (Mobile)

```typescript
// components/common/Button.tsx
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

export function Button({ variant = 'primary', size = 'md', disabled, loading, onPress, children }: ButtonProps) {
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
  
  const getPadding = () => {
    switch (size) {
      case 'sm': return 'px-3 py-1.5';
      case 'md': return 'px-4 py-2';
      case 'lg': return 'px-6 py-3';
      case 'xl': return 'px-8 py-4';
      default: return 'px-4 py-2';
    }
  };
  
  const getFontSize = () => {
    switch (size) {
      case 'sm': return 'text-sm';
      case 'md': return 'text-base';
      case 'lg': return 'text-lg';
      case 'xl': return 'text-xl';
      default: return 'text-base';
    }
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`
        flex-row items-center justify-center font-medium
        ${getBackgroundColor()}
        ${getPadding()}
        ${getFontSize()}
        rounded-lg
        ${disabled ? 'opacity-50' : ''}
      `}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading && <ActivityIndicator size="small" color="#ffffff" className="mr-2" />}
      <Text className={`${getTextColor()} text-center`}>{children}</Text>
    </TouchableOpacity>
  );
}
```

---

## 8. Accessibility

All components and pages must meet **WCAG 2.1 AA** standards.

### Core Requirements

#### 1. Color Contrast

| Element | Minimum Contrast Ratio |
|---------|------------------------|
| Normal text | 4.5:1 |
| Large text (18pt+ bold or 24pt+) | 3:1 |
| UI components (buttons, inputs) | 3:1 |
| Hover/focus states | 3:1 |

**Validation**: All AIVO colors have been validated and meet these ratios.

#### 2. Keyboard Navigation (Web)

- All interactive elements must be focusable (`tabindex` ≥ 0)
- Visible focus indicator (blue ring, 2px solid)
- Logical tab order (DOM order)
- No keyboard traps
- `:focus-visible` not `:focus` for mouse users

```typescript
// Web: Focus ring example
<button className="focus:ring-2 focus:ring-primary-500 focus:ring-offset-2">
  Click me
</button>
```

#### 3. Screen Reader Support

- **Semantic HTML**: Use `<button>`, `<nav>`, `<main>`, etc.
- **ARIA labels** for icon-only buttons:
  ```typescript
  <Button accessibilityLabel="Close modal">
    <XIcon />
  </Button>
  ```
- **Alt text** for images: `alt="User avatar"` or `alt=""` for decorative
- **Live regions** for dynamic content: `aria-live="polite"`

#### 4. Touch Targets (Mobile)

- Minimum: 44×44 dp (density-independent pixels)
- Recommended: 48×48 dp
- Spacing: 8dp minimum between targets

```typescript
// Mobile: Ensure touch target size
<TouchableOpacity className="min-h-[44px] min-w-[44px]">
  <Icon />
</TouchableOpacity>
```

#### 5. Reduced Motion

Respect `prefers-reduced-motion`:

```typescript
// Check in useEffect
const [reduceMotion, setReduceMotion] = useState(false);

useEffect(() => {
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  setReduceMotion(mediaQuery.matches);
  const handler = (e: MediaQueryListEvent) => setReduceMotion(e.matches);
  mediaQuery.addEventListener('change', handler);
  return () => mediaQuery.removeEventListener('change', handler);
}, []);
```

For animations:
```typescript
const animationConfig = reduceMotion ? { duration: 0 } : { duration: 300 };
```

### Component Accessibility Checklist

| Component | Keyboard | Screen Reader | Touch Target | Notes |
|-----------|----------|---------------|--------------|-------|
| Button | ✅ | ✅ (text label) | ✅ 44×44 | Use `<button>` element |
| Input | ✅ | ✅ (label) | ✅ | Associate `<label>` |
| Card (clickable) | ✅ | ✅ | ✅ | `role="button"`, `tabIndex={0}` |
| Modal | ✅ | ✅ | ✅ | Focus trap, escape closes |
| Tabs | ✅ | ✅ | ✅ | `role="tablist"`, arrow key nav |
| Checkbox | ✅ | ✅ | ✅ | `role="checkbox"` |

---

## 9. Responsive Design

### Breakpoints

| Name | Width | Devices |
|------|-------|---------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet portrait |
| `lg` | 1024px | Laptop, small desktop |
| `xl` | 1280px | Desktop |
| `2xl` | 1536px | Large screens |

### Web Responsive Patterns

```typescript
// Mobile-first: default styles for mobile, override for larger screens
<div className="
  flex-col           // Mobile: vertical
  md:flex-row        // Tablet+: horizontal
  gap-4
  md:gap-6
  p-4
  md:p-6
  text-sm
  md:text-base
">
  Content
</div>
```

### Mobile Responsive Patterns

Use conditional rendering based on screen size:

```typescript
import { useWindowDimensions } from 'react-native';

function MyComponent() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  
  return (
    <View>
      {isTablet ? (
        <TabletLayout />
      ) : (
        <PhoneLayout />
      )}
    </View>
  );
}
```

Or use responsive styles:

```typescript
const styles = useResponsiveStyles({
  // Phone
  container: {
    padding: 16,
    fontSize: 14,
  },
  // Tablet
  'md': {
    padding: 24,
    fontSize: 16,
  },
  // Desktop
  'lg': {
    padding: 32,
    fontSize: 18,
  },
});
```

---

## 10. Animations & Transitions

### Principles

- **Purposeful**: Animations serve a functional purpose (feedback, direction, attention)
- **Fast**: Most animations 150-300ms
- **Subtle**: Don't distract from content
- **Reduced motion**: Disable for accessibility

### Animation Tokens

| Token | Duration | Easing | Use |
|-------|----------|--------|-----|
| `fast` | 150ms | `ease-out` | Micro-interactions, button clicks |
| `normal` | 250ms | `ease-in-out` | Page transitions, modal open |
| `slow` | 400ms | `ease-in-out` | Complex animations |

### Common Animations

#### Page Transitions (Web)

```typescript
// Use Framer Motion
import { motion } from 'framer-motion';

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

export function Page() {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
    >
      Content
    </motion.div>
  );
}
```

#### Modal Animation (Mobile)

```typescript
import { Animated, Easing } from 'react-native';

const fadeAnim = useRef(new Animated.Value(0)).current;

Animated.timing(fadeAnim, {
  toValue: 1,
  duration: 250,
  easing: Easing.inOut(Easing.ease),
  useNativeDriver: true,
}).start();
```

---

## 11. Quick Reference

### Common Patterns

#### Form Layout

```typescript
<View className="space-y-4">
  <Input label="Email" ... />
  <Input label="Password" type="password" ... />
  <Button onPress={submit}>Submit</Button>
</View>
```

#### Card with Header and Actions

```typescript
<Card
  title="Workout Title"
  subtitle="45 minutes • 5 exercises"
  actions={<Button size="sm">Edit</Button>}
>
  <WorkoutPreview data={workout} />
</Card>
```

#### List Item with Avatar

```typescript
<View className="flex-row items-center gap-3">
  <Avatar src={user.avatar} alt={user.name} size="md" />
  <View className="flex-1">
    <Text className="text-base font-medium">{user.name}</Text>
    <Text className="text-sm text-text-secondary">{user.role}</Text>
  </View>
  <ChevronRightIcon className="text-gray-500" />
</View>
```

#### Status Badge

```typescript
<Badge variant={status === 'completed' ? 'success' : 'warning'}>
  {status}
</Badge>
```

#### Loading State

```typescript
<View className="items-center justify-center p-8">
  <ActivityIndicator size="large" color="#3b82f6" />
  <Text className="mt-2 text-text-secondary">Loading...</Text>
</View>
```

#### Empty State

```typescript
<View className="items-center justify-center p-12">
  <WorkoutIcon size={64} className="text-gray-600 mb-4" />
  <Text className="text-lg font-medium mb-2">No workouts yet</Text>
  <Text className="text-text-secondary text-center mb-4">
    Start logging your first workout to see it here.
  </Text>
  <Button onPress={createWorkout}>Create Workout</Button>
</View>
```

---

## 12. Resources

### Design Files

- **Figma**: [AIVO Design System](https://figma.com/file/design-system-aivo)
- **Component Library**: `components/common/` (web & mobile)

### Implementation Guides

- **Web**: See `apps/web/README.md` for setup
- **Mobile**: See `docs/MOBILE_DEVELOPMENT.md`

### Component Checklist

Use this to track component implementation status:

| Component | Web | Mobile | Status |
|-----------|-----|--------|--------|
| Button | ✅ | ⚠️ Partial | Needs mobile completion |
| Card | ✅ | ❌ | To build |
| Input | ✅ | ❌ | To build |
| Badge | ✅ | ❌ | To build |
| Avatar | ✅ | ❌ | To build |
| Modal | ❌ | ❌ | Missing |
| Tabs | ❌ | ❌ | To build |
| Switch | ❌ | ❌ | To build |
| Checkbox | ❌ | ❌ | To build |
| Radio Group | ❌ | ❌ | To build |
| Slider | ❌ | ❌ | To build |
| Date Picker | ❌ | ❌ | Platform native |
| Toast | ❌ | ❌ | To build |

**Priority**: Implement Button, Input, Card, Modal for mobile first (critical for MVP).

---

**Document Status**: Production Ready  
**Owner**: Design Team + Technical-docs  
**Last Review**: 2025-04-27  
**Next Review**: 2025-05-27 (monthly)

---

*For questions or updates, contact the design team or open an issue in GitHub.*
