import { Redirect } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import * as SecureStore from "expo-secure-store";
import { Activity as ActivityIcon, Lock } from "lucide-react-native";
import colors from "@/theme/colors";

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

// Storage keys
const TOKEN_KEY = "aivo_token";
const USER_KEY = "aivo_user";

// OAuth configuration
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || "";
const FACEBOOK_CLIENT_ID = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID || "";

// Deep link scheme (must match app.json)
const SCHEME = "aivo";
const REDIRECT_URI = `${SCHEME}://auth/callback`;

export default function LoginScreen() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      setIsAuthenticated(!!token);
    } catch {
      // Handle auth check errors silently
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLoginSuccess = async (userData: unknown, token: string) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(userData));
      setIsAuthenticated(true);
    } catch {
      Alert.alert("Error", "Failed to save login session");
    }
  };

  // Remove onGoogleLogin/onFacebookLogin constants and inline

  // Redirect if already authenticated
  if (checkingAuth) {
    return (
      <View style={styles.container}>
        <ActivityIcon size={48} color="#3b82f6" />
        <Text style={styles.loadingText}>Checking authentication...</Text>
      </View>
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.header}>
        <ActivityIcon size={64} color="#3b82f6" />
        <Text style={styles.title}>AIVO</Text>
        <Text style={styles.subtitle}>Your AI-powered fitness companion</Text>
      </View>

      {/* Login Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Sign In</Text>
        <Text style={styles.cardSubtitle}>Choose your preferred login method</Text>

        {/* Google Button */}
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onPress={() => void handleGoogleLogin(handleLoginSuccess)}
        >
          <View style={styles.buttonIcon}>
            <Text style={styles.googleIcon}>G</Text>
          </View>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Facebook Button */}
        <TouchableOpacity
          style={[styles.button, styles.facebookButton]}
          // eslint-disable-next-line @typescript-eslint/no-misused-promises
          onPress={() => void handleFacebookLogin(handleLoginSuccess)}
        >
          <View style={styles.buttonIcon}>
            <Text style={styles.facebookIcon}>f</Text>
          </View>
          <Text style={styles.buttonText}>Continue with Facebook</Text>
        </TouchableOpacity>

        {/* Security Notice */}
        <View style={styles.securityNotice}>
          <Lock size={16} color="#6b7280" />
          <Text style={styles.securityText}>
            Your data is secure. We only use OAuth for authentication.
          </Text>
        </View>
      </View>

      <Text style={styles.terms}>
        By signing in, you agree to our Terms of Service and Privacy Policy.
      </Text>
    </View>
  );
}

async function handleGoogleLogin(onSuccess: (user: unknown, token: string) => void) {
  try {
    if (!GOOGLE_CLIENT_ID) {
      Alert.alert("Configuration Error", "Google OAuth is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID");
      return;
    }

    // Use backend OAuth endpoint which handles the Google OAuth flow
    const authUrl = `${API_URL}/api/auth/google?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      REDIRECT_URI
    );

    if (result.type === "success" && result.url) {
      // Backend should redirect with token in query params
      const url = new URL(result.url);
      const token = url.searchParams.get("token") || url.hash.split("token=")[1]?.split("&")[0];

      if (token) {
        // Verify token and get user data
        const response = await fetch(`${API_URL}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (data.success) {
          onSuccess(data.data.user, data.data.token);
        } else {
          Alert.alert("Error", data.error || "Google login failed");
        }
      } else {
        Alert.alert("Error", "No token received from authentication");
      }
    } else if (result.type === "cancel") {
      // User cancelled - no error needed
    } else {
      Alert.alert("Error", "Google authentication failed");
    }
  } catch {
    Alert.alert("Error", "Failed to initiate Google login");
  }
}

async function handleFacebookLogin(onSuccess: (user: unknown, token: string) => void) {
  try {
    if (!FACEBOOK_CLIENT_ID) {
      Alert.alert("Configuration Error", "Facebook OAuth is not configured. Please set EXPO_PUBLIC_FACEBOOK_CLIENT_ID");
      return;
    }

    // Use backend OAuth endpoint which handles Facebook OAuth
    const authUrl = `${API_URL}/api/auth/facebook?redirect_uri=${encodeURIComponent(REDIRECT_URI)}`;

    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      REDIRECT_URI
    );

    if (result.type === "success" && result.url) {
      const url = new URL(result.url);
      const token = url.searchParams.get("token") || url.hash.split("token=")[1]?.split("&")[0];

      if (token) {
        const response = await fetch(`${API_URL}/api/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();

        if (data.success) {
          onSuccess(data.data.user, data.data.token);
        } else {
          Alert.alert("Error", data.error || "Facebook login failed");
        }
      } else {
        Alert.alert("Error", "No token received from authentication");
      }
    } else if (result.type === "cancel") {
      // User cancelled - no error needed
    } else {
      Alert.alert("Error", "Facebook authentication failed");
    }
  } catch {
    Alert.alert("Error", "Failed to initiate Facebook login");
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: colors.text.primary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 8,
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: 16,
    fontSize: 16,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.background.secondary,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border.primary,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: colors.text.primary,
    textAlign: "center",
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    gap: 12,
  },
  googleButton: {
    backgroundColor: colors.text.primary,
  },
  facebookButton: {
    backgroundColor: colors.brand.facebook,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.border.light,
    justifyContent: "center",
    alignItems: "center",
  },
  googleIcon: {
    color: colors.brand.google,
    fontWeight: "bold",
    fontSize: 14,
  },
  facebookIcon: {
    color: colors.text.primary,
    fontWeight: "bold",
    fontSize: 18,
  },
  buttonText: {
    color: colors.background.tertiary,
    fontSize: 16,
    fontWeight: "600",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    padding: 12,
    backgroundColor: colors.border.medium,
    borderRadius: 8,
  },
  securityText: {
    color: colors.text.tertiary,
    fontSize: 12,
    flex: 1,
  },
  terms: {
    color: colors.text.tertiary,
    fontSize: 12,
    textAlign: "center",
    marginTop: 24,
    paddingHorizontal: 32,
  },
});
