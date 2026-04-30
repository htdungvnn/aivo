# Mobile App Development Plan - AIVO React Native

## Context

The AIVO mobile app is partially developed with:
- Basic structure (AuthContext, navigation, several screens)
- OAuth login screen with Google/Facebook buttons (but incomplete implementation)
- Several API service files (inconsistent patterns)
- The `@aivo/api-client` package with comprehensive API coverage
- Backend OAuth endpoints already implemented in Hono API

**Goal:** Complete the mobile app with proper OAuth implementation using `expo-auth-session`, standardized API client usage, consistent token management, and all necessary screens/navigation.

## Current State Analysis

### ✅ What's Working
1. **Project Setup**: Expo 54, React Native 0.81, TypeScript, NativeWind configured
2. **AuthContext**: Basic authentication context with login/logout
3. **Login Screen**: UI with Google/Facebook buttons
4. **API Client**: Comprehensive `@aivo/api-client` package exists with all endpoints
5. **Services**: Several API services (biometric, metrics, live-workout, wearable, etc.)
6. **Deep Linking**: app.json configured with scheme "aivo"
7. **Environment**: Required env vars set (API URL, OAuth client IDs)

### ❌ Critical Issues
1. **Token Storage Inconsistency**:
   - `AuthContext`: `'aivo_token'`, `'aivo_user_id'`
   - `biometric-api.ts`: `'aivo_token'`, `'aivo_user_id'` ✅
   - `metrics-api.ts`: `'aivo.auth.token'` ❌
   - `macro-adjustment-api.ts`: `'aivo.auth.token'` ❌
   - `live-workout-api.ts`: `'aivo.auth.token'`, `'aivo.user.id'` ❌
   - `form-analysis-api.ts`: `'aivo_token'`, `'aivo_user_id'` ✅

2. **API URL Inconsistency**:
   - Some services: `__DEV__ ? "http://localhost:8787" : "https://api.aivo.app"` (hardcoded)
   - env var: `EXPO_PUBLIC_API_URL=https://api.aivo.website`
   - Should use `EXPO_PUBLIC_API_URL` consistently

3. **OAuth Implementation Incomplete**:
   - `login.tsx` uses `WebBrowser.openAuthSessionAsync` directly
   - Missing proper `expo-auth-session` integration with `useAuthRequest` hook
   - No proper token exchange handling
   - Google OAuth requires ID token, Facebook requires access token - need proper flow

4. **AuthResponse Type Mismatch**:
   - Shared types: `AuthResponse { user, token, isNewUser }`
   - Backend returns: `{ success: true, data: { token, user } }` (no `isNewUser`)
   - Mobile code manually extracts token and user - works but inconsistent

5. **Services Don't Use ApiClient**:
   - Multiple services have duplicate `getToken()`, `fetchApi()` logic
   - Should use `@aivo/api-client` for consistency
   - ApiClient already has most methods needed

## Proposed Approach

### 1. Standardize Token Storage & API Configuration

**Create a central config module:**
```typescript
// app/config/index.ts
export const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8787';
export const TOKEN_KEY = 'aivo_token';
export const USER_ID_KEY = 'aivo_user_id';
```

**Update all services to:**
- Use `API_URL` from config
- Use `TOKEN_KEY` and `USER_ID_KEY` from config
- Prefer using `@aivo/api-client` instead of custom fetch wrappers

### 2. Fix OAuth with expo-auth-session

**Implement proper OAuth flows:**

- Use `expo-auth-session`'s `useAuthRequest` hook for discovery
- Google: Use `google-auth-library` style but from mobile - need to get ID token from Google Sign-In
- Actually for React Native, the recommended pattern:
  - Use `Google.authRequest` from `expo-auth-session` with Google's OAuth2 config
  - Facebook: Use `Facebook.authRequest` similarly
  - Both return access tokens that can be sent to backend

**Update login.tsx:**
- Replace manual WebBrowser calls with proper `useAuthRequest` hooks
- Handle token exchange through backend as already implemented
- Maintain the redirect URI flow

### 3. Consolidate API Services

**Refactor services to use ApiClient:**
- Replace custom fetch logic in `biometric-api.ts`, `metrics-api.ts`, `macro-adjustment-api.ts`, `live-workout-api.ts`, `wearable-service.ts`, `form-analysis-api.ts`
- The `@aivo/api-client` already has most endpoints needed
- For endpoints not in ApiClient, add them to ApiClient (like form analysis, macro adjustment, live workout)

**OR** Keep services but standardize their token/URL handling to be consistent

Given the existing structure, it's better to:
- Update the services to use the centralized config (token keys, API URL)
- Optionally migrate to ApiClient over time
- At minimum fix inconsistencies

### 4. Update AuthContext

- Use consistent token keys from config
- Use `@aivo/api-client` for token verification
- Better error handling
- Support for offline mode (already there)

### 5. Add Missing API Methods to ApiClient (Optional)

Check if mobile needs endpoints not in ApiClient:
- Form analysis: `/api/form/*` - NOT in ApiClient
- Macro adjustment: `/api/macro-adjustment/*` - NOT in ApiClient
- Live workout: `/api/live-workout/*` - NOT in ApiClient
- Biometric readings batch: `/biometric/readings/batch` - Already in ApiClient ✅

Decision: Either add these to ApiClient OR keep separate service files. Since they're specialized and already exist as separate services, we can keep them but standardize them.

## Implementation Steps (Prioritized)

### Phase 1: Foundation (Fix Inconsistencies)
1. Create `app/config/index.ts` with centralized constants
2. Update `AuthContext.tsx` to use config constants
3. Update all service files to use config:
   - `biometric-api.ts` (already correct but can use config)
   - `metrics-api.ts` (fix token keys & API_URL)
   - `macro-adjustment-api.ts` (fix token keys & API_URL)
   - `live-workout-api.ts` (fix token keys & API_URL)
   - `form-analysis-api.ts` (already correct but can use config)
   - `wearable-service.ts` (already uses ApiClient partially, fix token key)

### Phase 2: OAuth Implementation
4. Research proper `expo-auth-session` setup for Google/Facebook
5. Update `login.tsx` to use `useAuthRequest` hook with proper discovery
6. Test OAuth flow with backend

### Phase 3: Polish & Verification
7. Update environment variable documentation
8. Test all API calls work with consistent auth
9. Verify deep linking works
10. Run type checks and lint

## Files to Modify

### Core Configuration
- `app/config/index.ts` (NEW)

### Authentication
- `app/contexts/AuthContext.tsx` (update token keys)
- `app/(auth)/login.tsx` (implement proper OAuth)

### API Services (standardize)
- `app/services/metrics-api.ts`
- `app/services/macro-adjustment-api.ts`
- `app/services/live-workout-api.ts`
- `app/services/wearable-service.ts` (already uses ApiClient well)
- `app/services/biometric-api.ts` (minor: use config)
- `app/services/form-analysis-api.ts` (minor: use config)

### Optional: ApiClient Enhancements
- `packages/api-client/src/index.ts` (add form, macro, live-workout methods if desired)

## Verification Plan

1. **Token Consistency**: Verify all services use same storage keys
2. **API URL**: Confirm all services read from `EXPO_PUBLIC_API_URL`
3. **OAuth Flow**: 
   - Start app, see login screen
   - Click Google, complete Google Sign-In
   - Receive token from backend, stored in SecureStore
   - Redirect to main app
   - Can logout and login again
4. **API Calls**: After login, navigate to tabs and verify data loads (body metrics, workouts, etc.)
5. **Type Check**: `pnpm run type-check` passes in mobile app
6. **Lint**: `pnpm run lint` passes

## Trade-offs Considered

### Option 1: Full ApiClient Migration
- **Pros**: Single source of truth, less duplication
- **Cons**: Large refactor, ApiClient needs many missing endpoints, changes many files

### Option 2: Standardize Existing Services (Chosen)
- **Pros**: Minimal changes, fix inconsistencies, keep specialized services
- **Cons**: Some duplication remains, but acceptable for now

### OAuth Implementation Options
- **Option A**: Pure `expo-auth-session` with Google/Facebook SDKs
- **Option B**: Keep backend-mediated OAuth (current) but use proper hooks
- **Chosen**: Option B - Use `expo-auth-session` properly but still route through backend `/api/auth/google` and `/api/auth/facebook` as designed. This keeps Google/Facebook app secret handling on backend.

## Notes

- The backend OAuth endpoints already handle token verification and user creation - mobile just needs to obtain Google/Facebook tokens and POST them to backend
- `expo-auth-session` provides `Google.useAuthRequest()` and `Facebook.useAuthRequest()` for proper OAuth flow
- The redirect URI scheme is already configured: `aivo://auth/callback`
- Need to ensure OAuth client IDs are correct and OAuth consent screens are configured
