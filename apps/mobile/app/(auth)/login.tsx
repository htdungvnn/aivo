import { Redirect } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useEffect, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Activity as ActivityIcon, Lock } from "lucide-react-native";
import colors from "@/theme/colors";

// Configure WebBrowser for OAuth
WebBrowser.maybeCompleteAuthSession();

const API_URL = "http://localhost:8787";

// Facebook OAuth Configuration
const FACEBOOK_CLIENT_ID = process.env.EXPO_PUBLIC_FACEBOOK_CLIENT_ID || "";

// Storage keys
const TOKEN_KEY = "aivo_token";
const USER_KEY = "aivo_user";

export default function LoginScreen() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      setIsAuthenticated(!!token);
    } catch {
      // Handle auth check errors silently
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLoginSuccess = (userData: unknown, token: string) => {
    (async () => {
      try {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
        setIsAuthenticated(true);
      } catch {
        Alert.alert("Error", "Failed to save login session");
      }
    })();
  };

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
          onPress={() => {
            void handleGoogleLogin(handleLoginSuccess);
          }}
        >
          <View style={styles.buttonIcon}>
            <Text style={styles.googleIcon}>G</Text>
          </View>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Facebook Button */}
        <TouchableOpacity
          style={[styles.button, styles.facebookButton]}
          onPress={() => {
            void handleFacebookLogin(handleLoginSuccess);
          }}
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
    const authUrl = `${API_URL}/api/auth/google`;

    // Open web browser for OAuth flow
    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      "aivo://auth/google/callback"
    );

    if (result.type === "success" && result.url) {
      // Parse the token from the callback URL
      const token = extractTokenFromCallback(result.url);
      if (token) {
        // Exchange token with backend
        const response = await fetch(`${API_URL}/api/auth/google`, {
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
      }
    }
  } catch {
    Alert.alert("Error", "Failed to initiate Google login");
  }
}

async function handleFacebookLogin(onSuccess: (user: unknown, token: string) => void) {
  try {
    // For Facebook, we need to open a web view with the OAuth flow
    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${FACEBOOK_CLIENT_ID}&redirect_uri=${encodeURIComponent("aivo://auth/facebook/callback")}&response_type=token&scope=${encodeURIComponent("email,public_profile")}`;

    const result = await WebBrowser.openAuthSessionAsync(
      authUrl,
      "aivo://auth/facebook/callback"
    );

    if (result.type === "success" && result.url) {
      // Parse access token from fragment
      const accessToken = extractFacebookToken(result.url);
      if (accessToken) {
        // Exchange token with backend
        const response = await fetch(`${API_URL}/api/auth/facebook`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: accessToken }),
        });
        const data = await response.json();

        if (data.success) {
          onSuccess(data.data.user, data.data.token);
        } else {
          Alert.alert("Error", data.error || "Facebook login failed");
        }
      }
    }
  } catch {
    Alert.alert("Error", "Failed to initiate Facebook login");
  }
}

function extractTokenFromCallback(url: string): string | null {
  try {
    const urlObj = new URL(url);
    // In production, backend would return token in query or fragment
    // This is simplified - actual flow may vary
    return urlObj.searchParams.get("token") || urlObj.hash.split("token=")[1]?.split("&")[0] || null;
  } catch {
    return null;
  }
}

function extractFacebookToken(url: string): string | null {
  try {
    // Facebook returns access_token in the fragment
    const hash = url.split("#")[1];
    if (!hash) {return null;}
    const params = new URLSearchParams(hash);
    return params.get("access_token");
  } catch {
    return null;
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
