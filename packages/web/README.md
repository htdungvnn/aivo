# Web Packages

This directory contains web-specific packages for the Next.js application.

## Design Principles

1. **Next.js Compatible** - All packages work with Next.js 16
2. **React Based** - May depend on React
3. **No Mobile Code** - These packages are NOT for mobile (React Native)

## Packages

### `@aivo/i18n`

Internationalization utilities using `next-intl`.

**Features:**
- Message loading
- Locale detection
- Translation helpers

**Usage:**
```typescript
import { useTranslations, useLocale } from "@aivo/i18n";

export function MyComponent() {
  const t = useTranslations("common");
  const locale = useLocale();
  
  return <h1>{t("welcome", { locale })}</h1>;
}
```

### `@aivo/marketing-config`

Landing page configuration data.

**Exports:**
- `tokens` - Design tokens (colors, spacing, etc.)
- `pricing` - Pricing plans configuration
- `features` - Feature highlights
- `navigation` - Navigation items (mainNav, footerNav, authNav)
- `faq` - FAQ items
- `testimonials` - Customer testimonials
- `howItWorks` - How it works steps
- `previewData` - Preview/screenshot data

**Usage:**
```typescript
import { mainNav, pricingPlans, features } from "@aivo/marketing-config";
```

### `@aivo/ui-components`

Shared React components for the web application.

**Note:** This is for internal web components. The design system tokens and configuration are in `@aivo/marketing-config`.

## Forbidden Dependencies

- React Native
- Expo
- Mobile-specific APIs
- Native modules
