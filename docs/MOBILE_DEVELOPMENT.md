# Mobile Development Guide

Comprehensive guide for developing the AIVO mobile app using React Native with Expo.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Project Structure](#project-structure)
- [Navigation](#navigation)
- [Authentication](#authentication)
- [API Integration](#api-integration)
- [Styling](#styling)
- [Testing](#testing)
- [Building](#building)
- [Troubleshooting](#troubleshooting)

## Overview

AIVO Mobile is built with:
- **React Native** via Expo for cross-platform support
- **Expo Router** for file-based routing
- **NativeWind** (Tailwind CSS) for styling
- **React Query** for data fetching and caching
- **Hono API** on Cloudflare Workers for backend

**Target Platforms**: iOS, Android

**Minimum Versions**:
- iOS: 14.0+
- Android: API 26+ (Android 8.0)

## Prerequisites

### Software Requirements

```bash
# Node.js 20+
fnm install 20
fnm use 20

# pnpm 9+
npm install -g pnpm@9

# Expo CLI
npm install -g expo-cli

# iOS development (macOS only)
# Install Xcode from App Store
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Android development
# Install Android Studio
# Set ANDROID_HOME in shell:
export ANDROID_HOME="$HOME/Library/Android/sdk"
```

### Dependencies Setup

```bash
# Install monorepo dependencies
pnpm install

# Install iOS pods (macOS only)
cd apps/mobile/ios
pod install
cd ../..
```

### Environment Variables

Create `apps/mobile/.env` (see [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md)):

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=your-facebook-app-id
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_R2_PUBLIC_URL=https://your-bucket.r2.cloudflarestorage.com
EXPO_PUBLIC_SCHEME=aivomobile
```

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Auth screens (login, register)
│   │   ├── login.tsx
│   │   └── index.tsx
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home
│   │   ├── profile.tsx
│   │   └── workout.tsx
│   ├── _layout.tsx        # Root layout with providers
│   └── +not-found.tsx
├── components/            # Reusable UI components
│   ├── common/           # Button, Input, etc.
│   ├── auth/             # Auth-specific components
│   └── workout/          # Workout components
├── contexts/              # React contexts
│   ├── AuthContext.tsx   # Auth state
│   └── ThemeContext.tsx  # Theme/theme
├── hooks/                 # Custom hooks
│   ├── useAuth.ts
│   └── useApi.ts
├── services/              # API services
│   ├── auth.service.ts
│   ├── api-client.ts    # Base client with query client
│   └── storage.service.ts
├── theme/                 # NativeWind config, colors
│   ├── index.ts
│   └── colors.ts
├── types/                 # TypeScript definitions
│   └── index.ts
├── assets/                # Images, icons, fonts
├── app.json              # Expo config
└── babel.config.js       # Babel config
```

## Navigation

We use **Expo Router** (file-based routing) with tab navigation for authenticated areas.

### Route Structure

- `(auth)/` - Authentication screens (no tab bar)
- `(tabs)/` - Main app with bottom tab bar
- Public routes outside groups are accessible to all

### Navigation Flow

```
/
├── (auth)
│   ├── /login         → Unauthenticated users
│   └── /register      → Unauthenticated users
└── (tabs)
    ├── /              → Home (authenticated)
    ├── /profile       → Profile (authenticated)
    ├── /workout       → Workout (authenticated)
    └── /settings      → Settings (authenticated)
```

### Navigation Guards

Auth guard in `app/_layout.tsx`:

```typescript
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'expo-router';

export default function RootLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  return (
    <ThemeProvider>
      <Stack />
    </ThemeProvider>
  );
}
```

## Authentication

AIVO uses **Google and Facebook OAuth** exclusively. No email/password login.

### OAuth Flow

1. **Initiate Login**: User taps "Sign in with Google" or "Sign in with Facebook"
2. **External Auth**: System opens Google/Facebook auth page
3. **Callback**: OAuth provider redirects to deep link: `aivomobile://auth?code=...`
4. **Token Exchange**: App sends authorization code to API
5. **Session**: API returns JWT token, stored in AsyncStorage
6. **Authenticated**: App navigates to home screen

### Implementation

#### Google OAuth

We use `expo-auth-session` with Google:

```typescript
// services/auth.service.ts
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export function GoogleAuthButton() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      // Exchange code for JWT with our API
      exchangeCode('google', code);
    }
  }, [response]);

  return (
    <Button
      title="Sign in with Google"
      disabled={!request}
      onPress={() => {
        promptAsync();
      }}
    />
  );
}
```

#### Facebook OAuth

Facebook requires similar setup with `expo-auth-session`:

```typescript
import * as Facebook from 'expo-auth-session/providers/facebook';

export function FacebookAuthButton() {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    appId: process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID,
  });

  // Similar response handling
}
```

#### Token Exchange API Call

```typescript
// services/auth.service.ts
async function exchangeCode(provider: 'google' | 'facebook', code: string) {
  const response = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/api/auth/${provider}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    }
  );

  const data = await response.json();

  if (response.ok) {
    // Store JWT token
    await AsyncStorage.setItem('auth_token', data.token);
    // Set auth context
    setAuthToken(data.token);
    // Navigate to home
    router.replace('/');
  } else {
    // Handle error
    Alert.alert('Authentication failed', data.error);
  }
}
```

#### Auth Context

```typescript
// contexts/AuthContext.tsx
export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing token on app start
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      if (storedToken) {
        // Verify token with API
        const userData = await verifyToken(storedToken);
        setToken(storedToken);
        setUser(userData);
      }
    } catch (error) {
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (provider: 'google' | 'facebook', code: string) => {
    const response = await fetch(`${API_URL}/api/auth/${provider}`, {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
    const data = await response.json();

    if (response.ok) {
      await AsyncStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true };
    }
    return { success: false, error: data.error };
  };

  const logout = async () => {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await AsyncStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## API Integration

### API Client Setup

We use **React Query** for data fetching and caching:

```typescript
// services/api-client.ts
import { QueryClient } from '@tanstack/react-query';
import { fetch } from 'expo/fetch';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 5, // 5 minutes
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
});

// Fetch wrapper with auth
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await AsyncStorage.getItem('auth_token');

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

### Using React Query Hooks

```typescript
// hooks/useWorkouts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/services/api-client';

export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: () => apiFetch('/api/workouts'),
  });
}

export function useCreateWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workout: WorkoutData) =>
      apiFetch('/api/workouts', {
        method: 'POST',
        body: JSON.stringify(workout),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workouts'] });
    },
  });
}
```

### Component Usage

```typescript
// screens/WorkoutsScreen.tsx
export default function WorkoutsScreen() {
  const { data: workouts, isLoading, error } = useWorkouts();
  const createWorkout = useCreateWorkout();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <FlatList
      data={workouts}
      renderItem={({ item }) => (
        <WorkoutCard workout={item} />
      )}
      ListEmptyComponent={() => (
        <Text>No workouts yet. Create one!</Text>
      )}
    />
  );
}
```

## Styling

We use **NativeWind** (Tailwind CSS for React Native):

### Configuration

`tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
      },
    },
  },
  plugins: [],
};
```

`nativewind-env.d.ts`:

```typescript
/// <reference types="nativewind/types" />
```

### Using NativeWind

```typescript
// components/common/Button.tsx
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
}

export function Button({ title, onPress, variant = 'primary' }: ButtonProps) {
  return (
    <TouchableOpacity
      className={`
        px-4 py-3 rounded-lg font-semibold
        ${variant === 'primary' ? 'bg-primary-500 text-white' : ''}
        ${variant === 'secondary' ? 'bg-gray-200 text-gray-800' : ''}
        ${variant === 'outline' ? 'border-2 border-primary-500 text-primary-500' : ''}
      `}
      onPress={onPress}
    >
      <Text className="text-center">{title}</Text>
    </TouchableOpacity>
  );
}
```

### Dark Mode Support

```typescript
// theme/index.ts
import { useColorScheme } from 'react-native';

export function useTheme() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return {
    isDark,
    colors: {
      background: isDark ? '#000' : '#fff',
      text: isDark ? '#fff' : '#000',
      primary: '#0ea5e9',
      // ... more colors
    },
  };
}
```

## Testing

### Unit Tests

We use Jest with React Native Testing Library:

```bash
# Run all tests
pnpm --filter @aivo/mobile test

# Run with coverage
pnpm --filter @aivo/mobile test:coverage

# Run specific test
pnpm --filter @aivo/mobile test -- -t "Button"
```

### Example Test

```typescript
// __tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../components/common/Button';

describe('Button', () => {
  it('renders correctly', () => {
    const { getByText } = render(
      <Button title="Press me" onPress={() => {}} />
    );
    expect(getByText('Press me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = render(
      <Button title="Press me" onPress={onPress} />
    );
    fireEvent.press(getByText('Press me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

### E2E Tests

We use Detox for E2E tests (coming soon).

## Building

### Development Build

```bash
# Start Expo dev server
cd apps/mobile
pnpm exec expo start

# Options:
# - Press 'i' for iOS simulator
# - Press 'a' for Android emulator
# - Scan QR code with Expo Go app on physical device
```

### Production Build

```bash
# Build for iOS
cd apps/mobile
pnpm exec expo build:ios

# Build for Android
pnpm exec expo build:android

# Or use EAS Build for better performance:
pnpm exec eas build --platform ios
pnpm exec eas build --platform android
```

### Local Build

```bash
# Build iOS locally (requires Xcode)
cd apps/mobile
pnpm exec expo run:ios

# Build Android locally (requires Android Studio)
pnpm exec expo run:android
```

## Native Modules

If you need native functionality not covered by Expo, you can:

1. Use an existing Expo module (preferred)
2. Add a bare workflow module
3. Create a custom native module

### Adding a Native Module

```bash
cd apps/mobile
pnpm expo install expo-camera  # Example
```

Then use in code:

```typescript
import { Camera } from 'expo-camera';

const [hasPermission, setHasPermission] = useState(null);

useEffect(() => {
  (async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
  })();
}, []);
```

## Performance Optimization

### React Query Caching

Configure appropriate cache times to minimize API calls:

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});
```

### Image Optimization

- Use `expo-image` for optimized image loading
- Provide multiple sizes for different devices
- Cache images locally:

```typescript
import { Image } from 'expo-image';

<Image
  source={{ uri: imageUrl }}
  contentFit="cover"
  transition={200}
  cachePolicy="memory-disk"
/>
```

### Memoization

```typescript
import { useMemo, useCallback } from 'react';

const expensiveValue = useMemo(() => {
  return computeExpensiveValue(data);
}, [data]);

const handlePress = useCallback(() => {
  doSomething(id);
}, [id]);
```

## Deep Linking

Configure deep linking in `app.json`:

```json
{
  "expo": {
    "scheme": "aivomobile",
    "platforms": ["ios", "android"],
    "ios": {
      "bundleIdentifier": "com.aivo.app"
    },
    "android": {
      "package": "com.aivo.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "aivomobile"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

Handle deep links:

```typescript
import * as Linking from 'expo-linking';

const prefix = Linking.createURL('/');

useEffect(() => {
  const subscription = Linking.addEventListener('url', handleUrl);
  return () => subscription.remove();
}, []);

function handleUrl(event: { url: string }) {
  const { path, queryParams } = Linking.parse(event.url);
  // Handle navigation based on path
}
```

## Troubleshooting

### Common Issues

#### Metro bundler won't start

```bash
# Clear cache
pnpm exec expo start --clear

# Reset Metro
watchman watch-del-all
rm -rf $TMPDIR/react-*
rm -rf node_modules
pnpm install
```

#### iOS build fails

```bash
cd apps/mobile/ios
pod deintegrate
pod install --repo-update
cd ..
pnpm exec expo run:ios
```

#### Android emulator not detected

```bash
# Check if emulator is running
adb devices

# Start emulator manually
$ANDROID_HOME/emulator/emulator -avd "Pixel_6_API_33"
```

#### "Cannot find module" errors

```bash
# Reinstall and rebuild
rm -rf node_modules
pnpm install
cd ios && pod install && cd ..
pnpm exec expo start -c
```

#### OAuth redirect fails

Ensure:
1. `EXPO_PUBLIC_SCHEME` is set correctly in `.env`
2. Deep linking configured in `app.json`
3. OAuth provider redirect URI includes the scheme:
   - `aivomobile://auth` for development
   - For production: your custom scheme

#### Permission errors (camera, location)

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-camera",
        {
          "cameraPermission": "Allow AIVO to access your camera",
          "microphonePermission": "Allow AIVO to access your microphone",
          "recordAudioAndroid": true
        }
      ]
    ]
  }
}
```

Then rebuild the app.

## Next Steps

- Read [API_REFERENCE.md](./API_REFERENCE.md) to understand available endpoints
- Review [ENVIRONMENT_SETUP.md](./ENVIRONMENT_SETUP.md) for configuration
- See [ARCHITECTURE.md](./ARCHITECTURE.md) for system design
- Check [AUTHENTICATION.md](./AUTHENTICATION.md) for auth details

## Resources

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Router](https://expo.github.io/router/)
- [NativeWind](https://www.nativewind.dev/)
- [React Query](https://tanstack.com/query/latest)
- [React Native](https://reactnative.dev/)
