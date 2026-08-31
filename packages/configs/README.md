# Configuration Packages

This directory contains shared configuration packages for the AIVO monorepo.

## Packages

### `@aivo/eslint-config`

ESLint configurations for TypeScript and React projects.

**Exports:**
- `eslint-config/base` - Base TypeScript configuration
- `eslint-config/next-js` - Next.js specific configuration
- `eslint-config/react-internal` - Internal React component configuration

### `@aivo/typescript-config`

TypeScript configuration presets.

**Exports:**
- `typescript-config/base.json` - Base TypeScript configuration
- `typescript-config/react-library.json` - React library configuration
- `typescript-config/nextjs.json` - Next.js configuration

## Usage

```json
// package.json
{
  "eslintConfig": {
    "extends": "@aivo/eslint-config/base"
  }
}
```

```json
// tsconfig.json
{
  "extends": "@aivo/typescript-config/base.json"
}
```
