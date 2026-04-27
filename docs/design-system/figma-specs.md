# Figma Specifications

This document provides detailed Figma implementation specifications for the AIVO design system. It serves as the developer handoff guide to ensure pixel-perfect implementation.

---

## Table of Contents

1. [Design File Structure](#design-file-structure)
2. [Color Styles](#color-styles)
3. [Text Styles](#text-styles)
4. [Effects](#effects)
5. [Component Specifications](#component-specifications)
6. [Page Templates](#page-templates)
7. [Auto Layout Guidelines](#auto-layout-guidelines)
8. [Export Settings](#export-settings)
9. [Developer Handoff](#developer-handoff)
10. [Component Checklist](#component-checklist)

---

## Design File Structure

### File Organization

```
AIVO Design System.fig
├── 📁 01 Foundations
│   ├── Grid & Layout
│   ├── Colors
│   └── Typography
├── 📁 02 Components
│   ├── Buttons
│   ├── Forms
│   ├── Cards
│   ├── Navigation
│   └── Feedback
├── 📁 03 Patterns
│   ├── Lists
│   ├── Tables
│   └── Layouts
├── 📁 04 Pages
│   ├── Mobile
│   │   ├── Login
│   │   ├── Dashboard
│   │   └── Workout
│   └── Web
│       ├── Home
│       ├── Dashboard
│       └── Profile
└── 📁 05 Developer Handoff
    ├── Specs
    └── Animations
```

### Naming Conventions

- **Components**: `Component/Variant/State/Size`  
  Example: `Button/Primary/Default/Large`
- **Colors**: `Category/Variant`  
  Example: `Primary/500`, `Semantic/Success`
- **Text Styles**: `Style/Size/Weight`  
  Example: `Heading/H1/Bold`, `Body/Large/Regular`

---

## Color Styles

### Color Library

All colors are defined in the **Local Colors** panel.

#### Primary Palette

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Primary/50 | `#eff6ff` | rgb(239, 246, 255) | Light backgrounds |
| Primary/100 | `#dbeafe` | rgb(219, 234, 254) | - |
| Primary/200 | `#bfdbfe` | rgb(191, 219, 254) | - |
| Primary/300 | `#93c5fd` | rgb(147, 197, 253) | Highlights |
| Primary/400 | `#60a5fa` | rgb(96, 165, 250) | Interactive |
| **Primary/500** | **`#3b82f6`** | **rgb(59, 130, 246)** | **Primary brand** |
| Primary/600 | `#2563eb` | rgb(37, 99, 235) | Buttons, links |
| Primary/700 | `#1d4ed8` | rgb(29, 78, 216) | Hover |
| Primary/800 | `#1e40af` | rgb(30, 64, 175) | - |
| Primary/900 | `#1e3a8a` | rgb(30, 58, 138) | Dark accents |

#### Neutral Palette

| Name | Hex | Usage |
|------|-----|-------|
| Gray/50 | `#f9fafb` | Light bg |
| Gray/100 | `#f3f4f6` | Card bg (light) |
| Gray/200 | `#e5e7eb` | Dividers |
| Gray/300 | `#d1d5db` | Disabled border |
| Gray/400 | `#9ca3af` | Placeholder |
| Gray/500 | `#6b7280` | Secondary text |
| Gray/600 | `#4b5563` | - |
| Gray/700 | `#374151` | Border (dark) |
| Gray/800 | `#1f2937` | Card bg (dark) |
| Gray/900 | `#111827` | Background (dark) |
| Gray/950 | `#030712` | Deepest bg |

#### Semantic Colors

| Name | Hex | Usage |
|------|-----|-------|
| Success/500 | `#10b981` | Success messages |
| Warning/500 | `#f59e0b` | Warnings |
| Error/500 | `#ef4444` | Errors |
| Info/500 | `#3b82f6` | Info messages |

### Dark Theme Colors

Dark theme uses the same color names but mapped to dark values:

```yaml
Background/Primary: Gray/950 (#030712)
Surface/Primary: Gray/900 (#111827)
Text/Primary: Gray/50 (#f9fafb)  # Inverted!
Border/Primary: Gray/700 (#374151)
```

---

## Text Styles

### Typography Scale

| Style Name | Font Family | Size | Weight | Line Height | Token |
|------------|-------------|------|--------|-------------|-------|
| Display/1 | Geist | 64px | 800 | 64px (1.0) | text-6xl |
| Display/2 | Geist | 48px | 800 | 48px (1.0) | text-5xl |
| Heading/1 | Geist | 36px | 700 | 40px (1.11) | text-4xl |
| Heading/2 | Geist | 30px | 700 | 36px (1.2) | text-3xl |
| Heading/3 | Geist | 24px | 700 | 32px (1.33) | text-2xl |
| Heading/4 | Geist | 20px | 600 | 30px (1.5) | text-xl |
| Body/Large | Inter | 18px | 500 | 28px (1.56) | text-lg |
| Body/Default | Inter | 16px | 400 | 24px (1.5) | text-base |
| Body/Small | Inter | 14px | 400 | 20px (1.43) | text-sm |
| Caption | Inter | 12px | 400 | 16px (1.33) | text-xs |
| Code | JetBrains Mono | 14px | 400 | 20px (1.43) | font-mono text-sm |

### Setting Up Text Styles in Figma

1. Create text layer
2. Set font properties (family, size, weight, line height)
3. Click **Style** → **Create new text style**
4. Name using convention: `Category/Size/Weight`  
   Example: `Heading/H1/Bold`, `Body/Large/Medium`
5. Click **Done**

---

## Effects

### Shadows

| Name | Properties | Usage |
|------|-------------|-------|
| Shadow/Small | `0 1px 2px rgba(0,0,0,0.05)` | Subtle elevation |
| Shadow/Medium | `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1)` | Cards (default) |
| Shadow/Large | `0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -4px rgba(0,0,0,0.1)` | Elevated cards |
| Shadow/XLarge | `0 25px 50px -12px rgba(0,0,0,0.25)` | Modals, popovers |

**Dark mode shadows**:
```css
Shadow/Medium: 0 4px 6px -1px rgba(0,0,0,0.3)
```

### Border Radius

| Name | Value | Usage |
|------|-------|-------|
| Radius/Small | 6px | Small badges, tags |
| Radius/Medium | 8px | Buttons, inputs (default) |
| Radius/Large | 12px | Cards, modals |
| Radius/XLarge | 16px | Large cards |
| Radius/Full | 9999px | Pills, avatars |

---

## Component Specifications

### Button

#### Variants

**Primary**
- Background: Primary/600
- Text: White
- Hover: Primary/700
- Active: Primary/800

**Secondary**
- Background: Gray/700
- Text: White
- Hover: Gray/600

**Outline**
- Background: Transparent
- Border: Gray/600 (1px)
- Text: White
- Hover: Gray/800 (20% opacity)

**Ghost**
- Background: Transparent
- Text: White
- Hover: Gray/800 (20% opacity)

**Destructive**
- Background: Error/500
- Text: White
- Hover: Error/600

#### Sizes

| Size | Height | Padding X | Padding Y | Text Style | Radius |
|------|--------|-----------|-----------|------------|--------|
| Small | 32px | 12px | 4px | Body/Small | 6px |
| Medium | 40px | 16px | 8px | Body/Default | 8px |
| Large | 48px | 24px | 12px | Body/Large | 8px |
| XLarge | 56px | 32px | 16px | Display/3 | 8px |

#### States

- **Default**: Full opacity, normal colors
- **Hover**: Slightly darker background (use component variant)
- **Pressed**: 85% scale (transform: scale(0.95))
- **Disabled**: 50% opacity, cursor: not-allowed
- **Loading**: Spinner icon (16px for md), button non-interactive

#### Structure

```
┌─────────────────────────────┐
│  [icon?]  Text  [iconRight?] │  ← Auto Layout: Horizontal, center aligned
└─────────────────────────────┘
```

**Auto Layout Settings**:
- Direction: Horizontal
- Alignment: Center
- Padding: See size table above
- Spacing between elements: 8px (gap-2)
- Min width: 0 (allow shrink)
- Min height: per size

---

### Card

#### Variants

**Elevated** (default):
- Background: Surface/Primary (Gray/900)
- Shadow: Shadow/Medium
- Border: None

**Outlined**:
- Background: Background/Primary (Gray/950)
- Border: Gray/700 (1px)
- Shadow: None

**Filled**:
- Background: Gray/800
- Border: None
- Shadow: None

#### Structure

```
┌─────────────────────────────────────────┐
│  [Title]  [actions?]                    │  ← Header: Auto Layout, space-between
├─────────────────────────────────────────┤
│                                         │
│  Content                                │  ← Body: Fill container
│  (No padding-x, uses outer padding)    │
│                                         │
├─────────────────────────────────────────┤
│  [footer]                               │  ← Footer: Full width
└─────────────────────────────────────────┘
```

**Auto Layout Settings**:
- Direction: Vertical
- Padding: 24px (size-md)
- Spacing between sections:
  - Header → Body: 16px
  - Body → Footer: 24px

#### Text Styles

- **Title**: Heading/4 (text-xl, semibold)
- **Subtitle**: Body/Small (text-sm, regular, Gray/400)
- **Body**: Body/Default (text-base, regular)

---

### Input

#### Structure

```
┌─────────────────────────────────────────────┐
│  Label (required *)                        │  ← Auto Layout: Horizontal
├─────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐  │
│  │  [prefix]  Input text  [suffix]     │  │  ← Input container: Auto Layout
│  └─────────────────────────────────────┘  │
│  helper-text / error-message             │  ← Below input
└─────────────────────────────────────────────┘
```

#### Dimensions

| Property | Value |
|----------|-------|
| Height | 44px (includes 2px border) |
| Border radius | 8px |
| Padding X | 12px (adjust if prefix/suffix present) |
| Padding Y | 0 (vertical centering via flex) |
| Border | 1px solid Gray/700 |

#### States

**Default**:
- Background: Gray/800
- Border: Gray/700
- Text: White

**Focus**:
- Border: Primary/500 (2px)
- Ring: Primary/500 with 30% opacity, 3px offset

**Error**:
- Border: Error/500 (2px)
- Text: Error/500
- Helper text: Error/500

**Disabled**:
- Background: Gray/900 (darker)
- Opacity: 60%
- Cursor: Not-allowed

#### Text Styles

- **Label**: Body/Small, semibold, Gray/100
- **Input**: Body/Default, regular
- **Helper**: Body/Small, regular, Gray/400
- **Error**: Body/Small, regular, Error/500

---

### Badge

#### Variants

| Variant | Background | Text |
|---------|------------|------|
| Default | Gray/700 | Gray/100 |
| Primary | Primary/500 | White |
| Success | Success/500 | White |
| Warning | Warning/500 | White |
| Error | Error/500 | White |

#### Sizes

| Size | Padding | Text | Border Radius |
|------|---------|------|---------------|
| Small | 8px 10px | Caption | 9999px |
| Medium | 10px 12px | Body/Small | 9999px ⭐ |
| Large | 12px 16px | Body/Default | 8px |

#### Structure

**With dot indicator**:
```
┌─────────────┐
│  ●  Text    │  ← Auto Layout Horizontal, gap: 6px
└─────────────┘
```

**Dot size**: 6px diameter (medium), 8px (large)

---

### Avatar

#### Sizes

| Size | Dimensions | Image | Initials Font |
|------|------------|-------|---------------|
| XSmall | 24×24px | 20px | 8px |
| Small | 32×32px | 28px | 10px |
| Medium | 40×40px | 36px | 12px |
| Large | 56×56px | 52px | 16px |
| XLarge | 80×80px | 76px | 24px |

#### Properties

- **Border**: 2px solid Surface/Primary (Gray/900)
- **Border radius**: 50% (full)
- **Fallback gradient**: Linear 135°, Primary/500 → Accent/500

#### Status Indicator

Position: Bottom-right corner (absolute)

| Avatar Size | Dot Diameter | Offset |
|-------------|--------------|--------|
| XSmall | 8px | 2px |
| Small | 10px | 3px |
| Medium | 12px | 4px |
| Large | 16px | 5px |
| XLarge | 20px | 6px |

**Status colors**:
- Online: Success/500
- Offline: Gray/500
- Away: Warning/500
- Busy: Error/500

---

### Modal

#### Sizes

| Size | Max Width | Max Height | Use |
|------|-----------|------------|-----|
| Small | 400px | 60vh | Confirmations, simple forms |
| Medium | 560px | 70vh | Default, forms, details |
| Large | 720px | 70vh | Complex forms |
| XLarge | 900px | 80vh | Full-screen mobile |

#### Structure

```
┌─────────────────────────────────────────────┐
│  ┌─────────────────────────────────────┐  │
│  │  [X] Title                          │  │  ← Header: 56px height, px-6
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │                                     │  │
│  │   Content (max-height: 70vh)        │  │  ← Body: Scrollable overflow-y
│  │   Overflow-y: auto                  │  │
│  │                                     │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐  │
│  │  [Cancel]  [Primary Action]        │  │  ← Footer: px-6 py-4, right-aligned
│  └─────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

#### Overlay

- Position: Fixed, inset: 0
- Background: rgba(0, 0, 0, 0.75)
- Backdrop filter: blur(4px) (optional)
- Z-index: 50

#### Animation (Mobile)

```typescript
// Reanimated
const opacity = useSharedValue(0);
const scale = useSharedValue(0.95);

opacity.value = withTiming(1, { duration: 200 });
scale.value = withTiming(1, { duration: 200 });

// Styles
style={{
  opacity: opacity.value,
  transform: [{ scale: scale.value }],
}}
```

---

## Page Templates

### Mobile Login Page

**Layout**: Vertical stack, centered

```
┌─────────────────────────────┐
│         [Logo]               │  ← 64px margin top
│      Welcome Back            │  ← Heading/2, 32px margin bottom
├─────────────────────────────┤
│  [Input: Email]             │  ← Space-y-4
│  [Input: Password]          │
│  [Forgot password?]         │  ← Link, right-aligned, text-sm
├─────────────────────────────┤
│  [Button: Sign In]          │  ← mt-6, full width
├─────────────────────────────┤
│  ──────── OR ────────       │  ← text-gray-500, my-6
├─────────────────────────────┤
│  [Google Sign In Button]    │
│  [Facebook Sign In Button]  │  ← mt-3
├─────────────────────────────┤
│  Don't have an account?     │  ← mt-8
│  [Sign up]                  │
└─────────────────────────────┘
```

**Spacing**:
- Safe area padding: 24px
- Gap between elements: 16px
- Button height: 48px

---

### Dashboard Layout (Web)

**Layout**: Sidebar navigation + main content

```
┌─────────────────────────────────────────────┐
│  Header: Logo, User avatar, notifications  │  ← h-16
├────────┬────────────────────────────────────┤
│        │                                    │
│  Side  │   Main Content                     │
│  bar   │   (p-8)                            │
│  (w-64)│                                    │
│        │                                    │
│        │                                    │
└────────┴────────────────────────────────────┘
```

**Sidebar**:
- Width: 256px (w-64)
- Fixed position, full height
- Navigation items: flex-col, gap-2

**Main Content**:
- Margin-left: 256px
- Padding: 32px (p-8)
- Max-width: 1536px

---

## Auto Layout Guidelines

### General Rules

1. **Use Auto Layout for everything** - Avoid manual positioning
2. **Set proper constraints** - Use min/max width/height
3. **Consistent spacing** - Use `gap` not individual margins
4. **Responsive resizing** - Test at different sizes

### Button Auto Layout

```
Settings:
- Direction: Horizontal
- Alignment: Center (both axes)
- Padding: [12, 16, 12, 16] (or per size spec)
- Gap between children: 8px
- Min Width: 0 (allows shrink to content)
- Min Height: from size spec
- Resizing: Hug contents (width), Fixed (height)
```

### Card Auto Layout

```
Settings:
- Direction: Vertical
- Padding: 24px (all sides)
- Gap between children:
  - Header → Body: 16px
  - Body → Footer: 24px
- Resizing: Fill container (width), Hug contents (height)
```

---

## Export Settings

### Icons

- **Format**: SVG
- **Export**: Individual files per icon
- **Size**: 24×24px (default), scale as needed
- **Naming**: `icon-{name}.svg` → `Icon{Name}.tsx`

Example:
```
icon-activity.svg → IconActivity.tsx
icon-workout.svg → IconWorkout.tsx
```

### Images

- **Format**: PNG or WebP (for compression)
- **Scale**: @2x for retina displays
- **Naming**: `img-{name}.png`

---

## Developer Handoff

### Measuring Specs

Developers can measure directly from Figma:

1. Select element
2. Hold `Shift` + `R` to show ruler
3. Click to measure distances
4. Values shown in pixels

### Inspecting Properties

1. Select layer
2. Right panel shows:
   - Dimensions (W×H)
   - Position (X, Y)
   - Fill colors (hex, RGB)
   - Stroke (width, color)
   - Effects (shadows)
   - Text properties

### Code Generation (Plugin)

Install **Figma to Code** plugin:
1. Select component
2. Run plugin
3. Copy generated Tailwind/React Native code

---

## Component Checklist

Use this to track implementation status:

| Component | Web | Mobile | Status | Notes |
|-----------|-----|--------|--------|-------|
| Button | ✅ | ⚠️ Partial | In Progress | Mobile needs full variant support |
| Card | ✅ | ❌ | To Do | Web done, mobile pending |
| Input | ✅ | ❌ | To Do | Web done, mobile pending |
| Badge | ✅ | ❌ | To Do | Web done, mobile pending |
| Avatar | ✅ | ❌ | To Do | Web done, mobile pending |
| Modal | ❌ | ❌ | Not Started | Needs implementation |
| Tabs | ❌ | ❌ | Not Started | High priority |
| Checkbox | ❌ | ❌ | Not Started | Medium priority |
| Switch | ❌ | ❌ | Not Started | Medium priority |
| Select | ❌ | ❌ | Not Started | Use native picker on mobile |
| DatePicker | ❌ | ❌ | Not Started | Platform native |

---

## Design Tokens Summary

Export these tokens for developers:

### Web (Tailwind Config)

```javascript
// tailwind.config.ts
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { /* all 50-900 */ },
        accent: { /* 400-700 */ },
        gray: { /* 50-950 */ },
        semantic: { success, warning, error, info },
        // Semantic mappings
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        text: 'var(--color-text)',
      },
      spacing: {
        '1': '4px',
        '2': '8px',
        // ... up to 20
      },
      fontSize: {
        'xs': ['12px', { lineHeight: '16px' }],
        // ... all sizes
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
      },
      boxShadow: {
        'sm': '...',
        'md': '...',
        'lg': '...',
      },
    },
  },
};
```

### Mobile (NativeWind)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { /* same values */ },
        // ...
      },
      spacing: {
        '1': 4,
        '2': 8,
        // ...
      },
      fontSize: {
        'xs': 12,
        // ...
      },
    },
  },
};
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-04-27 | Initial design system specification |

---

## Questions?

Contact the design team or open an issue in GitHub with:
1. Component name
2. Figma frame/component link
3. Specific question or issue

---

**Document Status**: Production Ready  
**Last Updated**: 2025-04-27  
**Maintained by**: Design Team
