# Web (Next.js 15)

Complete reference for AIVO's web application built with Next.js 15, App Router, and Tailwind CSS.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Cloudflare account (for Pages deployment)

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp apps/web/.env.local.example apps/web/.env.local
# Edit .env.local with your values (see Environment Variables section)

# Run development server
cd apps/web
pnpm run dev
# Open http://localhost:3000
```

### Verify Installation

1. **Health check**: Visit `http://localhost:3000/api/health` (proxied to API)
2. **Login**: Click "Sign in with Google" (requires OAuth credentials)
3. **Dashboard**: Should load user workouts and metrics

---

## Architecture

### Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS + NativeWind-like patterns
- **State Management**: React Context + SWR for data fetching
- **Authentication**: OAuth 2.0 (Google/Facebook) via `@react-oauth/google`
- **API Client**: Fetch with custom wrapper
- **Deployment**: Cloudflare Pages
- **Design System**: Custom component library (`components/common/`)

### Project Structure

```
apps/web/
├── app/
│   ├── (auth)/           # Auth group (login, callback)
│   ├── (dashboard)/      # Protected routes
│   │   ├── page.tsx      # Dashboard home
│   │   ├── workouts/     # Workout pages
│   │   ├── nutrition/    # Nutrition tracking
│   │   ├── body/         # Body metrics
│   │   └── ai/           # AI coach chat
│   ├── layout.tsx
│   ├── page.tsx          # Landing page
│   └── globals.css       # Tailwind imports + custom CSS
├── components/
│   ├── common/           # Reusable UI (Button, Card, Input, Modal)
│   ├── auth/             # LoginPage, OAuth buttons
│   ├── dashboard/        # Dashboard widgets
│   ├── workouts/         # Workout-specific components
│   ├── nutrition/        # Food logging UI
│   ├── body/             # Metrics charts, photo upload
│   └── ui/               # Low-level primitives
├── lib/
│   ├── api/              # API client functions
│   ├── auth/             # Auth context, token management
│   ├── hooks/            # Custom hooks
│   └── utils/            # Helpers (formatting, validation)
├── types/
│   └── index.ts          # Shared TypeScript interfaces
├── public/               # Static assets
├── .env.local            # Environment variables
├── next.config.js        # Next.js configuration
├── next.config.cloudflare.js # Cloudflare Pages build config
├── tailwind.config.ts    # Tailwind + design tokens
├── tsconfig.json
└── package.json
```

---

## Routing (App Router)

### Route Groups

- `(auth)` - Public authentication pages (`/login`, `/auth/callback`)
- `(dashboard)` - Protected user dashboard (`/dashboard`, `/dashboard/workouts`, etc.)
- Public routes - Landing page, marketing pages

### Protected Routes

Dashboard routes use `middleware.ts` to enforce authentication:

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')?.value;
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login');

  if (!token && !isAuthRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (token && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
```

---

## Components

### Design System

AIVO uses a custom design system with Tailwind CSS. All components in `components/common/` follow the specification in `DESIGN_SYSTEM.md`.

#### Core Components

- **Button** - Variants: primary, secondary, outline, ghost, destructive
- **Card** - Variants: elevated, outlined, filled
- **Input** - Text, number, select, textarea with labels
- **Badge** - Status badges with dots
- **Avatar** - User avatar with status indicator
- **Modal** - Dialog overlay with header/body/footer
- **Spinner** - Loading indicator

**Example**:
```tsx
import { Button, Card, Input } from '@/components/common';

export function WorkoutForm() {
  return (
    <Card variant="outlined" className="p-6">
      <h2 className="text-xl font-semibold mb-4">Create Workout</h2>
      <Input
        label="Workout Name"
        name="name"
        placeholder="Morning Run"
        required
      />
      <Button variant="primary" className="mt-4">
        Save Workout
      </Button>
    </Card>
  );
}
```

---

## API Integration

### API Client

Centralized API client in `lib/api/client.ts`:

```typescript
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = getAuthToken(); // from localStorage/cookie

  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  });

  return response.json();
}
```

### Usage Examples

```typescript
import { apiFetch } from '@/lib/api/client';

// GET workouts
const { data } = await apiFetch<Workout[]>('/api/workouts?limit=20');

// POST create workout
await apiFetch('/api/workouts', {
  method: 'POST',
  body: JSON.stringify({
    name: 'Upper Body',
    date: '2025-04-27',
  }),
});

// Error handling
const response = await apiFetch('/api/workouts');
if (!response.success) {
  console.error(response.error.message);
}
```

---

## Authentication

### OAuth Implementation

#### Google OAuth

```tsx
// components/auth/LoginPage.tsx
import { GoogleLogin } from '@react-oauth/google';

export default function LoginPage() {
  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    const res = await fetch(`${API_URL}/api/auth/google`, {
      method: 'POST',
      body: JSON.stringify({
        token: credentialResponse.credential,
      }),
    });

    const { data } = await res.json();
    localStorage.setItem('auth_token', data.token);
    router.push('/dashboard');
  };

  return (
    <div>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => console.log('Login Failed')}
        theme="dark"
        shape="rectangular"
        text="signin_with"
        width="280"
      />
    </div>
  );
}
```

#### Facebook OAuth

```tsx
const handleFacebookLogin = () => {
  const width = 600;
  const height = 600;
  const left = screen.width / 2 - width / 2;
  const top = screen.height / 2 - height / 2;

  const popup = window.open(
    `${API_URL}/api/auth/facebook?redirect_uri=${REDIRECT_URI}`,
    'facebook_login',
    `width=${width},height=${height},left=${left},top=${top},popup=true`
  );

  // Listen for message from popup
  window.addEventListener('message', (event) => {
    if (event.data.type === 'OAUTH_SUCCESS') {
      const { token } = event.data;
      localStorage.setItem('auth_token', token);
      router.push('/dashboard');
    }
  });
};
```

**See `OAUTH_SECURITY_REVIEW.md` for security improvements needed.**

---

### Auth Context

```typescript
// lib/auth/AuthContext.tsx
'use client';

import { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verify token on mount
    const token = localStorage.getItem('auth_token');
    if (token) {
      verifyToken(token).then(setUser).finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
```

---

## Key Features

### Dashboard

**Route**: `/dashboard`

Shows:
- Today's workout
- Progress metrics
- AI coaching snippet
- Weekly summary

**Components**:
- `DashboardStats` - Key metrics cards
- `UpcomingWorkout` - Next scheduled workout
- `RecentProgress` - Chart of recent performance
- `AiAssistant` - Quick chat interface

---

### Workout Tracking

**Routes**:
- `/dashboard/workouts` - List workouts
- `/dashboard/workouts/new` - Create workout
- `/dashboard/workouts/[id]` - View/edit workout
- `/dashboard/workouts/complete/[id]` - Log completion

**Components**:
- `WorkoutList` - Filterable list with pagination
- `WorkoutForm` - Create/edit routine
- `WorkoutView` - Detailed view with exercises
- `WorkoutCompletion` - Log sets/reps/RPE

---

### AI Coaching

**Route**: `/dashboard/ai`

Chat interface with AI coach.

**Features**:
- Real-time streaming responses (Server-Sent Events)
- Memory context injection
- Voice input support (Web Speech API)
- Conversation history

**Implementation**:
```typescript
// Use streaming endpoint
const response = await fetch(`${API_URL}/api/ai/chat`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message, includeMemory: true }),
});

const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader!.read();
  if (done) break;
  const chunk = new TextDecoder().decode(value);
  // Append to UI
}
```

---

### Nutrition Tracking

**Routes**:
- `/dashboard/nutrition` - Daily summary
- `/dashboard/nutrition/log` - Log food
- `/dashboard/nutrition/search` - Search food database

**Features**:
- Barcode scanning (via camera)
- Image analysis (vision AI)
- Voice logging
- Macro tracking with goals

---

### Body Metrics

**Routes**:
- `/dashboard/body` - Metrics dashboard
- `/dashboard/body/upload` - Upload progress photos
- `/dashboard/body/analysis` - AI analysis results

**Components**:
- `MetricsChart` - Time series charts (weight, body fat)
- `PhotoUpload` - Drag-drop R2 upload
- `BodyInsights` - AI-generated insights cards

---

## State Management

### Server State (SWR)

```typescript
import useSWR from 'swr';

const { data: workouts, mutate } = useSWR<Workout[]>(
  ['/api/workouts', userId],
  (key, uid) => apiFetch(`/api/workouts?userId=${uid}`).then(r => r.data),
  { refreshInterval: 30000 } // Poll every 30s
);

// Mutate after create
await apiFetch('/api/workouts', { method: 'POST', body: ... });
mutate(); // Refetch
```

### Client State (React Context)

- `AuthContext` - User session
- `ThemeContext` - Dark/light mode
- `ToastContext` - Notifications

---

## Design System

### Tailwind Configuration

`tailwind.config.ts`:

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: [
    './apps/web/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/components/**/*.{js,ts,jsx,tsx,mdx}',
    './apps/web/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',  // PRIMARY BRAND
          600: '#2563eb',  // Interactive
          700: '#1d4ed8',  // Hover
        },
        background: {
          light: '#ffffff',
          dark: '#030712',
        },
        // ... see DESIGN_SYSTEM.md
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Geist', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      spacing: {
        '18': '4.5rem',
        // 4px base grid
      },
    },
  },
  plugins: [],
} satisfies Config;
```

### Dark Mode

Default is dark mode. Toggle via `ThemeContext`.

```tsx
// Use dark: variant
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Content adapts
</div>
```

---

## Environment Variables

**.env.local** (required):

```
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
NEXT_PUBLIC_FACEBOOK_CLIENT_ID=your-fb-app-id
NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-...r2.dev
```

**Optional**:
```
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_SENTRY_DSN=...
```

See `ENV_VARIABLES_REFERENCE.md` for validation rules.

---

## Deployment

### Cloudflare Pages

#### Build Configuration

`next.config.cloudflare.js`:

```javascript
const withCloudflarePages = require('@cloudflare/next-on-pages')({
  // Options
});

module.exports = withCloudflarePages({
  // Next.js config
  output: 'export', // Static export for Pages
  trailingSlash: true,
  images: {
    unoptimized: true, // Pages doesn't support Next/image
  },
});
```

`pages.config.toml`:

```toml
[build]
command = "pnpm run build:pages"

[build.environment]
NODE_VERSION = "18"

[site]
bucket = ".vercel/output/static"
```

---

#### Deploy Script

```bash
./scripts/deploy-web-pages.sh
```

Steps:
1. Build Next.js app (`next build`)
2. Output to `.vercel/output/static`
3. `wrangler pages deploy` with project name `aivo-web`
4. Set environment variables in Pages dashboard

---

#### Environment Variables (Production)

Set in Cloudflare Pages dashboard:
- `NEXT_PUBLIC_API_URL` = `https://api.aivo.app`
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `NEXT_PUBLIC_FACEBOOK_CLIENT_ID`
- `NEXT_PUBLIC_R2_PUBLIC_URL`

---

### Vercel Alternative

If deploying to Vercel instead:

1. Import project to Vercel
2. Set environment variables in Vercel dashboard
3. Configure OAuth redirect URIs to Vercel domain
4. Vercel builds automatically on git push

---

## Performance Optimization

### Image Optimization

Cloudflare Pages doesn't support `next/image`. Use native `<img>` with R2 URLs:

```tsx
import Image from 'next/image'; // Only for static assets in /public
import { R2Image } from '@/components/R2Image';

// For R2-hosted images, use custom component
<R2Image
  src={imageUrl}
  alt="Progress photo"
  width={300}
  height={300}
  className="rounded-lg"
/>
```

---

### Code Splitting

Next.js App Router automatic code splitting. For manual:

```typescript
import dynamic from 'next/dynamic';

const HeavyChart = dynamic(
  () => import('@/components/charts/ProgressChart'),
  { loading: () => <Spinner />, ssr: false }
);
```

---

### Caching

**API responses**: SWR cache (default 5min)
**Static assets**: Cloudflare CDN (auto-cached)
**Images**: R2 + Cloudflare Images (optional)

---

## Testing

### Unit Tests (Jest + React Testing Library)

```bash
cd apps/web
pnpm test
```

Example:
```typescript
// components/common/__tests__/Button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '../Button';

test('renders primary button', () => {
  render(<Button variant="primary">Click me</Button>);
  expect(screen.getByText('Click me')).toHaveClass('bg-primary-600');
});
```

---

### E2E Tests (Playwright)

```bash
pnpm run test:e2e
```

Tests:
- Login flow (Google OAuth mocked)
- Create workout
- Log nutrition
- AI chat

---

### Visual Regression (Chromatic)

```bash
pnpm run chromatic
```

Configured for component library (future).

---

## Environment Variables

See `ENV_VARIABLES_REFERENCE.md` for complete list.

**Web-specific**:
- `NEXT_PUBLIC_API_URL` - API endpoint (required)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` - Google OAuth (required for Google login)
- `NEXT_PUBLIC_FACEBOOK_CLIENT_ID` - Facebook OAuth (required for Facebook login)
- `NEXT_PUBLIC_R2_PUBLIC_URL` - R2 storage URL for images

---

## Troubleshooting

### OAuth redirect URI mismatch

**Error**: `Error: unauthorized_client` from Google/Facebook.

**Fix**: Add to Google Cloud Console:
- Authorized JavaScript origins: `http://localhost:3000` (dev), `https://your-domain.com` (prod)
- Authorized redirect URIs: `http://localhost:3000/login/callback` (dev)

---

### API requests return 401

**Cause**: No auth token or invalid token.

**Debug**:
```bash
# Check localStorage in browser console
localStorage.getItem('auth_token')

# Verify token
curl -H "Authorization: Bearer <token>" http://localhost:8787/api/auth/verify
```

**Fix**: Re-login to get fresh token.

---

### Images not loading from R2

**Cause**: R2 bucket not public or CORS misconfigured.

**Fix**:
1. Make bucket public: `wrangater r2 bucket update aivo-images --public`
2. Or use signed URLs (recommended for private images)
3. Check CORS rules in R2 settings

---

### Build fails on Cloudflare Pages

**Error**: `Error: Cannot find module '@aivo/compute'`

**Cause**: WASM package not published or missing.

**Fix**:
1. Ensure `pnpm run build:wasm` completed before web build
2. Check that `packages/aivo-compute/pkg` exists
3. Verify `apps/web/package.json` has dependency: `"@aivo/compute": "workspace:*"`

---

### TypeScript errors after dependency update

**Fix**:
```bash
pnpm install
pnpm run type-check
# Fix any breaking changes in types
```

---

## Performance Checklist

- [ ] Images optimized (compressed, correct dimensions)
- [ ] Code splitting configured for heavy components
- [ ] API calls debounced/throttled (search inputs)
- [ ] SWR caching enabled with appropriate TTL
- [ ] Bundle size analyzed (`pnpm run build:analyze`)
- [ ] Lazy loading for below-the-fold content
- [ ] CSS purged (Tailwind `content` configured correctly)
- [ ] Fonts optimized (`font-display: swap`)
- [ ] Web Vitals measured (LCP, FID, CLS)

---

## Development Workflow

### Add New Page (App Router)

```typescript
// app/dashboard/workouts/page.tsx
import { WorkoutList } from '@/components/workouts/WorkoutList';

export const metadata = {
  title: 'Workouts | AIVO',
  description: 'View and manage your workouts',
};

export default function WorkoutsPage() {
  return (
    <div>
      <h1>Workouts</h1>
      <WorkoutList />
    </div>
  );
}
```

---

### Add New Component

```typescript
// components/workouts/WorkoutCard.tsx
import { Workout } from '@/types';

interface WorkoutCardProps {
  workout: Workout;
  onSelect: (id: string) => void;
}

export function WorkoutCard({ workout, onSelect }: WorkoutCardProps) {
  return (
    <Card variant="outlined" onClick={() => onSelect(workout.id)}>
      <h3>{workout.name}</h3>
      <p>{workout.date}</p>
    </Card>
  );
}
```

Add to `components/index.ts` exports.

---

## References

- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs
- **React OAuth Google**: https://github.com/perifache/react-oauth-google
- **Design System**: `DESIGN_SYSTEM.md`
- **API Reference**: `API.md`
- **OAuth Security**: `OAUTH_SECURITY_REVIEW.md`
- **Deployment**: `DEPLOYMENT.md`

---

**Last Updated**: 2025-04-27  
**Framework**: Next.js 15 (App Router)  
**Styling**: Tailwind CSS 3.4  
**Target**: Cloudflare Pages
