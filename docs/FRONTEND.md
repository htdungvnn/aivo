# Frontend Applications

AIVO has two frontend applications: a Next.js web app and a React Native Expo mobile app.

## Quick Comparison

| Feature | Web (Next.js) | Mobile (Expo) |
|---------|---------------|---------------|
| Framework | Next.js 15 (App Router) | React Native (Expo SDK 52+) |
| Language | TypeScript | TypeScript |
| Styling | Tailwind CSS | NativeWind 4 |
| Navigation | Next.js Routing | Expo Router |
| State Management | React Context + SWR | React Query + Zustand |
| Auth | Google OAuth | Google + Facebook OAuth |
| Platform | Browser | iOS + Android |
| Hosting | Vercel (recommended) | EAS Build + App Stores |

---

## Web Application (apps/web)

### Architecture

```
apps/web/
├── src/
│   ├── app/              # Next.js App Router pages
│   │   ├── dashboard/    # Main dashboard
│   │   ├── login/        # OAuth entry point
│   │   ├── profile/      # User profile
│   │   └── layout.tsx    # Root layout
│   ├── components/       # Reusable UI components
│   ├── lib/              # Utilities, API clients
│   └── styles/           # Global styles
├── public/               # Static assets
└── next.config.js        # Next.js config
```

### Key Features

1. **OAuth Login**
   - Google Sign-In via `@react-oauth/google`
   - Redirect flow exchanges code for JWT

2. **Dashboard**
   - Current routine display
   - Today's workout card
   - Body metrics chart
   - Quick actions

3. **Chat Interface**
   - AI coach conversation
   - Memory-aware responses
   - Message history

4. **Progress Tracking**
   - Weight/body fat charts
   - Personal records
   - Body photos (upload & comparison)

5. **Routine Management**
   - Create/edit routines
   - Exercise library
   - Template selection

### Setup

```bash
cd apps/web
pnpm install
pnpm run dev
```

Visit `http://localhost:3000`

### Environment Variables (`.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:8787
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
NEXT_PUBLIC_OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
```

### Build

```bash
pnpm run build        # Production build
pnpm start            # Start production server
```

---

## Mobile Application (apps/mobile)

### Architecture

```
apps/mobile/
├── app/                # Expo Router screens
│   ├── (tabs)/         # Tab navigation
│   │   ├── index.tsx   # Home/dashboard
│   │   ├── chat.tsx    # AI chat
│   │   ├── profile.tsx # Profile
│   │   └── workouts.tsx
│   ├── login/          # OAuth flow
│   └── _layout.tsx     # Root layout
├── components/         # Reusable components
├── hooks/              # Custom hooks
├── lib/                # API client, storage
└── assets/             # Images, fonts
```

### Key Features

1. **OAuth Login**
   - Google Sign-In via `expo-auth-session`
   - Facebook Login via native SDK
   - Deep linking for callback

2. **Dashboard**
   - Today's workout overview
   - Body metrics summary
   - Quick workout logging

3. **AI Chat**
   - Full chat interface
   - Voice input (optional)
   - Memory-aware responses

4. **Workout Tracking**
   - Timer & set tracking
   - Exercise logging
   - Rest timers
   - Progress photos

5. **Notifications**
   - Push notifications for workouts
   - Reminders
   - Expo Push Notifications service

6. **Offline Support**
   - Cached routines
   - Queued sync
   - Local storage

### Setup

```bash
cd apps/mobile
pnpm install
pnpm exec expo start
```

Scan QR code with Expo Go app.

### Environment Variables (`.env`)

```env
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=your_facebook_app_id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id  # For web auth flow
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id   # iOS native
```

### Build

**Development:**
```bash
pnpm exec expo start
```

**Production (EAS):**
```bash
# Build for iOS
eas build --platform ios --profile production

# Build for Android
eas build --platform android --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

---

## Shared Components

Both apps share design principles:

### Design System

- **Typography:** Inter (sans), Playfair Display (serif)
- **Colors:**
  - Primary: `#3B82F6` (blue-500)
  - Success: `#10B981` (green-500)
  - Warning: `#F59E0B` (amber-500)
  - Error: `#EF4444` (red-500)
  - Dark: `#111827` (gray-900)
- **Spacing:** 4px base unit
- **Border Radius:** 12px (cards), 8px (inputs), 20px (chips)

### UI Components (Web)

Located in `apps/web/src/components/`:

- `Button.tsx` - Primary/secondary/ghost buttons
- `Card.tsx` - Content containers
- `Input.tsx` - Text inputs with labels
- `Modal.tsx` - Dialogs
- `WorkoutCard.tsx` - Workout display
- `ExerciseItem.tsx` - Exercise in routine
- `MetricChart.tsx` - Chart for body metrics
- `ChatInterface.tsx` - AI conversation UI

### UI Components (Mobile)

Located in `apps/mobile/components/`:

- `Button.tsx` - Touchable buttons
- `Card.tsx` - Card containers
- `Input.tsx` - Form inputs
- `WorkoutCard.tsx`
- `ExerciseItem.tsx`
- `ChatBubble.tsx` - Chat message
- `MetricChart.tsx` - Using react-native-svg-charts

---

## API Client

Both apps use a shared API client pattern:

### Web

```typescript
// apps/web/src/lib/api.ts
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('aivo_jwt');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Mobile

```typescript
// apps/mobile/lib/api.ts
import { createClient } from 'react-native-supabase';

const client = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

// Or custom fetch with token
export const api = async (endpoint: string, options: RequestInit = {}) => {
  const token = await SecureStore.getItemAsync('aivo_jwt');
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}${endpoint}`,
    {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return response.json();
};
```

---

## Authentication Flow

### Web (Google OAuth)

1. User clicks "Sign in with Google"
2. Google OAuth popup opens
3. Google returns authorization code to `/login` callback
4. Frontend exchanges code for JWT via `POST /auth/google`
5. JWT stored in `localStorage`
6. User redirected to dashboard

### Mobile (Google + Facebook)

1. User taps "Sign in with Google" or "Facebook"
2. Native SDK opens auth flow
3. Returns access token (Google) or credentials (Facebook)
4. Mobile exchanges for JWT via respective endpoint
5. JWT stored in `AsyncStorage` (or `expo-secure-store`)
6. Navigate to dashboard

---

## State Management

### Web (React Context + SWR)

```typescript
// User context
const UserContext = createContext<User | null>(null);

// Data fetching with SWR
const { data: routine } = useSWR<Routine>(
  `/routines?userId=${userId}&active=true`
);
```

### Mobile (React Query)

```typescript
import { useQuery, useMutation } from '@tanstack/react-query';

const { data: workouts } = useQuery({
  queryKey: ['workouts', userId],
  queryFn: () => api.fetchWorkouts(userId),
});

const logWorkout = useMutation({
  mutationFn: (data: WorkoutData) => api.logWorkout(data),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workouts'] }),
});
```

---

## Responsive Design

### Web

- Mobile-first Tailwind classes
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Tablet and desktop layouts adapt

### Mobile

- Native responsive with Flexbox
- Safe area insets for notched devices
- Platform-specific touches (iOS vs Android)

---

## Testing

### Web

```bash
cd apps/web
pnpm test          # Jest unit tests
pnpm run lint      # ESLint
```

### Mobile

```bash
cd apps/mobile
pnpm test          # Jest tests
pnpm exec expo start --clear  # For debugging
```

---

## Debugging

### Web

- React DevTools browser extension
- Next.js DevTools panel
- Network tab for API inspection

### Mobile

- React DevTools (via Flipper)
- Expo DevTools in browser
- Console logs visible in terminal
- `expo start --dev-client` for native debugging

---

## Performance Tips

### Web

1. **Use `next/dynamic` for code splitting**
2. **Optimize images** with `next/image`
3. **Avoid unnecessary re-renders** with `useMemo`, `useCallback`
4. **SWR caching** reduces API calls

### Mobile

1. **FlatList** for long lists (not ScrollView)
2. **Memoize components** with `React.memo`
3. **Avoid inline functions** in render
4. **Use `useFocusEffect`** for cleanup

---

## Known Issues

### Web

- Google OAuth may be blocked by popup blockers (use redirect flow fallback)
- WASM loading may fail on HTTP (requires HTTPS or localhost)

### Mobile

- Facebook login requires native app installed
- Push notifications require production build (EAS)
- iOS simulator cannot use Google Sign-In (use test device)

---

## CI/CD

### Web (Vercel)

Connect GitHub repo to Vercel for automatic deployments on `main` branch.

Environment variables set in Vercel dashboard.

### Mobile (EAS)

`.eas/build-profile.json`:

```json
{
  "production": {
    "distribution": "store",
    "ios": { "simulator": false },
    "android": { "gradleCommand": ":app:bundle" }
  }
}
```

Auto-deploy on tag push:

```bash
eas update --branch production
```

---

## Future Enhancements

- [ ] Progressive Web App (PWA) support for web
- [ ] Offline-first sync for mobile
- [ ] Widgets for home screen (iOS/Android)
- [ ] Apple Watch companion app
- [ ] HealthKit / Google Fit integration
- [ ] Voice workout logging

---

**Last Updated:** 2026-04-22  
**Web Version:** 1.0.0  
**Mobile Version:** 1.0.0
