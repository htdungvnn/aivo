import { useAuthRequest } from 'expo-auth-session';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { STORAGE_KEYS, API_CONFIG, OAUTH_CONFIG } from '@/config';

/**
 * Google OAuth hook using expo-auth-session
 * This uses the backend OAuth endpoint which handles the full OAuth flow
 *
 * Flow:
 * 1. User presses "Login with Google"
 * 2. App opens backend /api/auth/google?redirect_uri=...
 * 3. Backend redirects to Google OAuth page
 * 4. User signs in with Google
 * 5. Google redirects back to backend with ID token
 * 6. Backend verifies token, creates session, redirects to app with JWT
 * 7. App receives JWT in redirect URI and completes login
 */
export function useGoogleOAuth() {
  // Note: We're using the backend as the authorization endpoint
  // The backend will handle the OAuth discovery and token exchange with Google
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: OAUTH_CONFIG.GOOGLE_CLIENT_ID,
      redirectUri: OAUTH_CONFIG.REDIRECT_URI,
      scopes: ['openid', 'profile', 'email'],
    },
    {
      // We use the backend endpoint, not Google's directly
      // This keeps the Google OAuth client secret on the server
      authorizationEndpoint: `${API_CONFIG.BASE_URL}${OAUTH_CONFIG.GOOGLE_AUTH_ENDPOINT}?redirect_uri=${encodeURIComponent(OAUTH_CONFIG.REDIRECT_URI)}`,
    }
  );

  return {
    request,
    response,
    promptAsync,
  };
}

/**
 * Facebook OAuth hook using expo-auth-session
 * Similar flow as Google, but through backend
 */
export function useFacebookOAuth() {
  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: OAUTH_CONFIG.FACEBOOK_CLIENT_ID,
      redirectUri: OAUTH_CONFIG.REDIRECT_URI,
      scopes: ['email', 'public_profile'],
    },
    {
      authorizationEndpoint: `${API_CONFIG.BASE_URL}${OAUTH_CONFIG.FACEBOOK_AUTH_ENDPOINT}?redirect_uri=${encodeURIComponent(OAUTH_CONFIG.REDIRECT_URI)}`,
    }
  );

  return {
    request,
    response,
    promptAsync,
  };
}

/**
 * Handle OAuth response and extract token
 * Called when response from useAuthRequest changes
 */
export async function handleOAuthResponse(
  response: { type: string; url?: string } | null,
  onSuccess: (user: unknown, token: string) => void,
  onError: (message: string) => void
): Promise<void> {
  if (!response || response.type !== 'success' || !response.url) {
    if (response?.type === 'cancel') {
      // User cancelled - no error needed
      return;
    }
    onError('Authentication failed or was cancelled');
    return;
  }

  try {
    const url = new URL(response.url);

    // Backend should redirect with token in query params
    const token = url.searchParams.get('token');

    if (token) {
      // Verify token and get user data from backend
      const verifyResponse = await fetch(`${API_CONFIG.BASE_URL}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await verifyResponse.json();

      if (data.success) {
        onSuccess(data.data.user, data.data.token);
      } else {
        onError(data.error || 'Authentication verification failed');
      }
    } else {
      onError('No token received from authentication');
    }
  } catch (error) {
    console.error('OAuth response error:', error);
    onError('Failed to process authentication response');
  }
}

/**
 * Convenience hook that combines Google OAuth with auto-response handling
 * Returns ready-to-use login function
 */
export function useGoogleLogin(onSuccess: (user: unknown, token: string) => void, onError?: (message: string) => void) {
  const { response, promptAsync } = useGoogleOAuth();

  useEffect(() => {
    if (response) {
      handleOAuthResponse(response, onSuccess, onError || defaultError);
    }
  }, [response]);

  const login = () => {
    if (OAUTH_CONFIG.GOOGLE_CLIENT_ID) {
      promptAsync();
    } else {
      onError?.('Google OAuth is not configured');
    }
  };

  return { login, response };
}

/**
 * Convenience hook for Facebook login
 */
export function useFacebookLogin(onSuccess: (user: unknown, token: string) => void, onError?: (message: string) => void) {
  const { response, promptAsync } = useFacebookOAuth();

  useEffect(() => {
    if (response) {
      handleOAuthResponse(response, onSuccess, onError || defaultError);
    }
  }, [response]);

  const login = () => {
    if (OAUTH_CONFIG.FACEBOOK_CLIENT_ID) {
      promptAsync();
    } else {
      onError?.('Facebook OAuth is not configured');
    }
  };

  return { login, response };
}

function defaultError(message: string) {
  Alert.alert('Authentication Error', message);
}

// Import Alert for defaultError - but Alert is only available in React Native
// We need to import it, so add at top: import { Alert } from 'react-native';
// However to avoid circular dependency or issues, we can make defaultError optional
// Let's adjust: The convenience hooks will not include default alert, caller must provide error handler
