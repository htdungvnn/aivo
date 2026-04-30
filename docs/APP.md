# Mobile (React Native + Expo)

Complete reference for AIVO's mobile application built with React Native and Expo.

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator
- Physical device for testing push notifications

### Setup

```bash
# Install dependencies
pnpm install

# Copy environment template
cp apps/mobile/.env.example apps/mobile/.env
# Edit .env with your values (see Environment Variables section)

# Start development server
cd apps/mobile
pnpm start
# or
npx expo start

# Run on simulator/device
# Press 'i' for iOS simulator, 'a' for Android emulator
# Or scan QR code with Expo Go app on physical device
```

### Verify Installation

1. **App loads**: Should see AIVO landing page
2. **Login test**: Tap "Sign in with Google" (requires OAuth credentials)
3. **Dashboard**: Should display user data from API

---

## Architecture

### Technology Stack

- **Framework**: React Native via Expo SDK 52+
- **Navigation**: Expo Router (file-based routing, React Navigation 6)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: React Context + Zustand (future)
- **API Client**: Fetch with custom wrapper
- **Authentication**: OAuth 2.0 (Google/Facebook) via `expo-auth-session`
- **Storage**: SecureStore (tokens), AsyncStorage (cache)
- **Push Notifications**: Expo Notifications
- **Build**: EAS Build (standalone binaries)

### Project Structure

```
apps/mobile/
├── app/
│   ├── (auth)/               # Auth routes
│   │   ├── login.tsx
│   │   └── callback.tsx
│   ├── (tabs)/               # Main tab navigation
│   │   ├── _layout.tsx
│   │   ├── index.tsx         # Dashboard
│   │   ├── workouts.tsx
│   │   ├── nutrition.tsx
│   │   ├── body.tsx
│   │   └── ai.tsx
│   ├── modal/                # Modals
│   ├── _layout.tsx           # Root layout
│   └── +html.tsx             # HTML head
├── components/
│   ├── common/               # Reusable UI (Button, Card, Input)
│   ├── auth/                 # Login, OAuth buttons
│   ├── dashboard/            # Dashboard widgets
│   ├── workouts/             # Workout components
│   ├── nutrition/            # Food logging UI
│   ├── body/                 # Metrics, photo upload
│   └── ui/                   # Primitives
├── lib/
│   ├── api/                  # API client
│   ├── auth/                 # Auth context, OAuth flows
│   ├── navigation/           # Navigation helpers
│   ├── notifications/        # Push notification handlers
│   └── utils/                # Helpers
├── assets/
│   ├── icons/
│   ├── images/
│   └── fonts/
├── app.json                  # Expo config
├── app.config.js             # Dynamic config
├── eas.json                  # EAS Build config
├── babel.config.js
├── tailwind.config.js        # NativeWind config
├── package.json
└── tsconfig.json
```

---

## Navigation (Expo Router)

### Route Groups

- `(auth)` - Authentication screens (unauthenticated only)
- `(tabs)` - Main app with bottom tab navigation (authenticated)
- `modal/` - Full-screen modals
- Public routes - Landing page (if any)

### Tab Navigation

`app/(tabs)/_layout.tsx`:

```typescript
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3b82f6',
        tabBarInactiveTintColor: '#6b7280',
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <MaterialIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{ title: 'Workouts', tabBarIcon: ... }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{ title: 'Nutrition', tabBarIcon: ... }}
      />
      <Tabs.Screen
        name="ai"
        options={{ title: 'AI Coach', tabBarIcon: ... }}
      />
      <Tabs.Screen
        name="body"
        options={{ title: 'Body', tabBarIcon: ... }}
      />
    </Tabs>
  );
}
```

---

## Authentication

### OAuth Implementation

#### Google OAuth

```typescript
// lib/auth/google.ts
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    expoClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    redirectUri: makeRedirectUri({
      scheme: process.env.EXPO_PUBLIC_SCHEME,
    }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      exchangeToken(id_token); // POST to /api/auth/google
    }
  }, [response]);

  return { request, promptAsync };
}
```

**Component**:
```tsx
// components/auth/GoogleButton.tsx
import { useGoogleAuth } from '@/lib/auth/google';

export function GoogleButton() {
  const { request, promptAsync } = useGoogleAuth();

  return (
    <Button
      title="Sign in with Google"
      onPress={() => promptAsync()}
      disabled={!request}
    />
  );
}
```

---

#### Facebook OAuth

```typescript
// lib/auth/facebook.ts
import * as Facebook from 'expo-auth-session/providers/facebook';

export function useFacebookAuth() {
  const [request, response, promptAsync] = Facebook.useAuthRequest({
    clientId: process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID,
    redirectUri: makeRedirectUri({
      scheme: process.env.EXPO_PUBLIC_SCHEME,
    }),
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCode(code); // POST to /api/auth/facebook
    }
  }, [response]);

  return { request, promptAsync };
}
```

---

#### Token Exchange

After OAuth provider returns token/code:

```typescript
async function exchangeToken(idToken: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: idToken }),
  });

  const { data } = await response.json();
  await SecureStore.setItemAsync('auth_token', data.token);
  router.replace('/(tabs)');
}
```

---

#### Auth Context

```typescript
// lib/auth/AuthContext.tsx
import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      const { data } = await apiFetch('/api/auth/verify', { token });
      setUser(data.user);
    }
    setLoading(false);
  };

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be within AuthProvider');
  return ctx;
};
```

---

## Components

### NativeWind (Tailwind for React Native)

`tailwind.config.js`:

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        background: {
          light: '#ffffff',
          dark: '#030712',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrainsMono', 'monospace'],
      },
    },
  },
  plugins: [],
};
```

---

#### Button Component

```typescript
// components/common/Button.tsx
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { cn } from '@/lib/utils/cn';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  onPress,
  children,
}: ButtonProps) {
  const variants = {
    primary: 'bg-primary-600',
    secondary: 'bg-gray-700',
    outline: 'border border-gray-600 bg-transparent',
    ghost: 'bg-transparent',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <TouchableOpacity
      className={cn(
        'flex-row items-center justify-center font-medium rounded-lg',
        variants[variant],
        sizes[size],
        disabled && 'opacity-50'
      )}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
    >
      {loading && <ActivityIndicator size="small" color="#ffffff" />}
      <Text className={cn(
        'text-center',
        variant === 'outline' || variant === 'ghost' ? 'text-white' : 'text-white'
      )}>
        {children}
      </Text>
    </TouchableOpacity>
  );
}
```

---

#### Card Component

```typescript
// components/common/Card.tsx
import { View } from 'react-native';
import { cn } from '@/lib/utils/cn';

interface CardProps {
  variant?: 'elevated' | 'outlined' | 'filled';
  children: React.ReactNode;
  className?: string;
}

export function Card({ variant = 'elevated', children, className }: CardProps) {
  const variants = {
    elevated: 'bg-surface shadow-lg',
    outlined: 'bg-background border border-gray-700',
    filled: 'bg-gray-800',
  };

  return (
    <View className={cn('rounded-lg p-4', variants[variant], className)}>
      {children}
    </View>
  );
}
```

---

## API Integration

### API Client

```typescript
// lib/api/client.ts
const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await SecureStore.getItemAsync('auth_token');

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

---

### SWR for Data Fetching

```typescript
import useSWR from 'swr';

export function useWorkouts(userId: string) {
  const { data, error, mutate } = useSWR<Workout[]>(
    [`/api/workouts?userId=${userId}`, userId],
    () => apiFetch(`/api/workouts?userId=${userId}`).then(r => r.data!),
    {
      refreshInterval: 30000, // Poll every 30s
      revalidateOnFocus: true,
    }
  );

  return { data, error, mutate };
}
```

---

## State Management

### React Context (Auth)

See `lib/auth/AuthContext.tsx` above.

### Local State (useState)

For component-level state:
```typescript
const [workoutName, setWorkoutName] = useState('');
const [exercises, setExercises] = useState<Exercise[]>([]);
```

---

## Key Features

### Dashboard

**Route**: `app/(tabs)/index.tsx`

Components:
- `DashboardStats` - Weekly summary cards
- `UpcomingWorkout` - Next scheduled workout
- `RecentActivity` - Latest achievements
- `AiQuickPrompt` - Quick chat input

---

### Workout Tracking

**Routes**:
- `app/(tabs)/workouts.tsx` - List
- `app/(tabs)/workouts/new.tsx` - Create
- `app/(tabs)/workouts/[id].tsx` - View/Edit
- `app/(tabs)/workouts/complete/[id].tsx` - Log completion

**Features**:
- Create custom routines
- Log sets/reps/RPE
- Voice input for hands-free logging
- Real-time timer

---

### AI Coaching

**Route**: `app/(tabs)/ai.tsx`

Chat interface:
- Streaming responses via SSE
- Voice input/output (experimental)
- Memory-based personalization

**Streaming implementation**:
```typescript
const [messages, setMessages] = useState<Message[]>([]);

const sendMessage = async (text: string) => {
  const userMsg: Message = { role: 'user', content: text };
  setMessages(prev => [...prev, userMsg]);

  const response = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    body: JSON.stringify({
      message: text,
      includeMemory: true,
    }),
  });

  const reader = response.body?.getReader();
  let assistantMsg = '';

  while (true) {
    const { done, value } = await reader!.read();
    if (done) break;
    const chunk = new TextDecoder().decode(value);
    assistantMsg += chunk;
    setMessages(prev => {
      const last = prev[prev.length - 1];
      if (last.role === 'assistant') {
        return [...prev.slice(0, -1), { ...last, content: assistantMsg }];
      }
      return [...prev, { role: 'assistant', content: assistantMsg }];
    });
  }
};
```

---

### Nutrition Tracking

**Routes**:
- `app/(tabs)/nutrition.tsx` - Daily log
- `app/(tabs)/nutrition/log.tsx` - Quick add
- `app/(tabs)/nutrition/search.tsx` - Food search

**Features**:
- Barcode scanner (expo-camera)
- Image analysis (upload to R2, vision AI)
- Voice logging
- Macro progress bars

---

### Body Metrics

**Routes**:
- `app/(tabs)/body.tsx` - Dashboard
- `app/(tabs)/body/upload.tsx` - Photo upload
- `app/(tabs)/body/history.tsx` - Metrics chart

**Charts**: Use `react-native-chart-kit` or `victory-native`

---

## Push Notifications

### Setup

```bash
npx expo install expo-notifications
```

**Configuration** (`app.json`):
```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#3b82f6",
          "sounds": [],
          "mode": "production"
        }
      ]
    ]
  }
}
```

### Request Permissions

```typescript
import * as Notifications from 'expo-notifications';

const { status } = await Notifications.requestPermissionsAsync();
if (status !== 'granted') {
  alert('Permission required for reminders');
}

// Get push token
const token = await Notifications.getExpoPushTokenAsync();
await apiFetch('/api/users/me/push-token', {
  method: 'POST',
  body: JSON.stringify({ token: token.data }),
});
```

### Schedule Notifications

```typescript
await Notifications.scheduleNotificationAsync({
  content: {
    title: "Don't forget your workout!",
    body: 'You have a leg day scheduled for today.',
    sound: 'default',
  },
  trigger: { hour: 17, minute: 0, repeats: true }, // Daily at 5pm
});
```

---

## Storage

### SecureStore (Tokens)

```typescript
import * as SecureStore from 'expo-secure-store';

// Save JWT
await SecureStore.setItemAsync('auth_token', token);

// Retrieve
const token = await SecureStore.getItemAsync('auth_token');

// Delete (logout)
await SecureStore.deleteItemAsync('auth_token');
```

**iOS**: Keychain | **Android**: Keystore

---

### AsyncStorage (Cache)

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache user profile
await AsyncStorage.setItem('user_profile', JSON.stringify(user));

// Get with TTL
const cached = await AsyncStorage.getItem('workouts_cache');
if (cached) {
  const { data, timestamp } = JSON.parse(cached);
  if (Date.now() - timestamp < 5 * 60 * 1000) {
    // Use cache (5min TTL)
  }
}
```

---

## Environment Variables

**.env** (required):

```
EXPO_PUBLIC_API_URL=http://localhost:8787
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-google-android-client-id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-google-ios-client-id
EXPO_PUBLIC_FACEBOOK_CLIENT_ID=your-fb-app-id
EXPO_PUBLIC_FACEBOOK_SCHEME=fbYOUR_APP_ID
EXPO_PUBLIC_SCHEME=aivo  # Deep link scheme
EXPO_PUBLIC_R2_PUBLIC_URL=https://pub-...r2.dev
```

See `ENV_VARIABLES_REFERENCE.md` for complete list.

---

## Deployment

### EAS Build

#### Configuration

`eas.json`:

```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "production": {
      "ios": {
        "workflow": "managed",
        "buildConfiguration": "Release"
      },
      "android": {
        "workflow": "managed",
        "gradleCommand": ":app:assembleRelease"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

#### Build Commands

```bash
# Login to EAS
eas login

# Configure project
eas build:configure

# Build iOS
eas build --platform ios --profile production

# Build Android
eas build --platform android --profile production

# Build both
eas build --platform all --profile production
```

Build artifacts:
- iOS: `.ipa` file for App Store Connect
- Android: `.aab` file for Google Play Console

---

#### Submit to Stores

```bash
# iOS App Store
eas submit --platform ios --latest

# Android Play Store
eas submit --platform android --latest
```

---

### OTA Updates

Expo OTA (Over-The-Air) updates for JS bundle updates:

```bash
eas update --branch production --message "Bug fixes"
```

**Note**: Native changes (new native modules) require full rebuild.

---

## Deep Linking

### Configuration

`app.json`:

```json
{
  "expo": {
    "scheme": "aivo",
    "ios": {
      "bundleIdentifier": "com.aivo.app",
      "associatedDomains": ["applinks:aivo.app"]
    },
    "android": {
      "package": "com.aivo.app",
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "aivo.app",
              "pathPrefix": "/auth/callback"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

---

### Handling Deep Links

```typescript
// app/_layout.tsx
import * as Linking from 'expo-linking';

const linking = {
  prefixes: ['aivo://', 'https://aivo.app'],
  config: {
    screens: {
      '(auth)': {
        screens: {
          callback: 'auth/callback',
        },
      },
      '(tabs)': {
        screens: {
          workouts: 'workouts',
          'workouts/[id]': 'workouts/:id',
        },
      },
    },
  },
};

export default function RootLayout() {
  return (
    <NavigationContainer linking={linking}>
      {/* ... */}
    </NavigationContainer>
  );
}
```

---

## Performance Optimization

### Image Optimization

Use `react-native-fast-image` for caching:

```typescript
import FastImage from 'react-native-fast-image';

<FastImage
  source={{
    uri: imageUrl,
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable,
  }}
  style={{ width: 200, height: 200 }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

---

### Bundle Size

Analyze bundle:

```bash
npx expo install react-native-bundle-visualizer
npx expo run:ios  # then open debugger → Memory → Bundle size
```

Reduce size by:
- Tree-shaking unused code
- Dynamic imports for heavy screens
- Removing unused fonts/assets
- Using `expo-modules` instead of large libraries

---

### Memory Management

- Unsubscribe from event listeners in `useEffect` cleanup
- Clear image caches when navigating away
- Use `FlatList` (virtualization) instead of `ScrollView` for long lists
- Avoid anonymous functions in `useEffect` dependencies

---

## Testing

### Unit Tests (Jest)

```bash
pnpm test
```

Configured in `jest.config.js`:
- Preset: `jest-expo`
- Setup files after env: `<rootDir>/jest.setup.js`

Example:
```typescript
// components/common/__tests__/Button.test.tsx
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../Button';

test('calls onPress when tapped', () => {
  const onPress = jest.fn();
  const { getByText } = render(
    <Button onPress={onPress}>Tap me</Button>
  );
  fireEvent.press(getByText('Tap me'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
```

---

### E2E Tests (Detox)

```bash
npx expo install detox detox-cli
npx expo install --fix
```

Configure `package.json`:
```json
{
  "detox": {
    "testRunner": {
      "args": {
        "detox": {
          "runnerConfig": "e2e/config.json"
        }
      },
      "jest": {}
    },
    "configurations": {
      "ios.sim.debug": {
        "binaryPath": ".expo/app-ios/sim",
        "type": "ios.simulator",
        "device": { "type": "iPhone 15" }
      },
      "android.emu.debug": {
        "binaryPath": ".expo/android/app-debug.apk",
        "type": "android.emulator",
        "device": { "avdName": "Pixel_6_API_33" }
      }
    }
  }
}
```

Run:
```bash
detox test -c ios.sim.debug
detox test -c android.emu.debug
```

---

## Troubleshooting

### "Module not found: expo-auth-session"

**Fix**:
```bash
npx expo install expo-auth-session
expo prebuild  # If using bare workflow
```

---

### OAuth redirect not working

**Cause**: Deep linking scheme misconfigured.

**Debug**:
```bash
# Check scheme in app.json
npx expo config --type public | grep scheme

# Test deep link
xcrun simctl openurl booted "aivo://auth/callback?code=..."
```

**Fix**: Ensure `EXPO_PUBLIC_SCHEME` matches app config and OAuth provider redirect URIs.

---

### "Cannot use import statement outside a module"

**Cause**: Using ES modules syntax in CommonJS environment (Node).

**Fix**: Ensure `"type": "module"` in package.json or use `require()`.

---

### Build fails on EAS: "Duplicate resources"

**Cause**: Icon/ splash screen images duplicated in assets.

**Fix**: Remove duplicate files, ensure only one version per size/density.

---

### App crashes on startup (iOS)

**Debug**: Check Xcode logs:
```bash
npx expo run:ios
# Or open .expo/app-ios/xxx.xcworkspace in Xcode
```

Common issues:
- Missing `expo-modules` pod install: `cd ios && pod install`
- Invalid `app.json` configuration
- Code signing issues

---

### Android build fails: "Execution failed for task ':app:signReleaseBundle'"

**Cause**: Keystore misconfigured.

**Fix**:
1. Generate keystore: `keytool -genkey -v -keystore my-release-key.keystore`
2. Configure in `eas.json`:
```json
{
  "build": {
    "production": {
      "android": {
        "keystore": {
          "keystorePath": "./my-release-key.keystore",
          "keystorePassword": "password",
          "keyAlias": "my-key-alias",
          "keyPassword": "password"
        }
      }
    }
  }
}
```

---

## Security Considerations

**Implemented**:
- ✅ SecureStore for token storage
- ✅ HTTPS enforced for API calls
- ✅ Certificate pinning (future)
- ✅ Deep link scheme validation

**Needs Improvement** (see `OAUTH_SECURITY_REVIEW.md`):
- ⚠️ Implement PKCE for OAuth (currently using implicit flow)
- ⚠️ Add root/jailbreak detection
- ⚠️ Biometric authentication option
- ⚠️ Code obfuscation (ProGuard for Android)

---

## Development Workflow

### Add New Screen

```typescript
// app/(tabs)/settings.tsx
import { View, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  return (
    <SafeAreaView>
      <Text>Settings</Text>
    </SafeAreaView>
  );
}
```

Add to tab navigator in `app/(tabs)/_layout.tsx`.

---

### Add New Component

```typescript
// components/workouts/WorkoutCard.tsx
import { View, Text } from 'react-native';
import { Card } from '@/components/common/Card';

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
}

export function WorkoutCard({ workout, onPress }: WorkoutCardProps) {
  return (
    <Card variant="outlined" onPress={onPress}>
      <Text className="text-lg font-semibold">{workout.name}</Text>
      <Text className="text-gray-400">{workout.date}</Text>
    </Card>
  );
}
```

---

## References

- **Expo Docs**: https://docs.expo.dev/
- **Expo Router**: https://expo.github.io/router/
- **NativeWind**: https://www.nativewind.dev/
- **React Native**: https://reactnative.dev/
- **OAuth Security Review**: `OAUTH_SECURITY_REVIEW.md`
- **API Reference**: `API.md`
- **Design System**: `DESIGN_SYSTEM.md`

---

**Last Updated**: 2025-04-27  
**Framework**: React Native 0.74 (via Expo SDK 52)  
**Navigation**: Expo Router 3  
**Styling**: NativeWind 2.x  
**Target**: iOS 14+, Android 8+
