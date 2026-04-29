import { Redirect } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Activity as ActivityIcon, Lock } from "lucide-react-native";
import { STORAGE_KEYS } from "@/config";
import { useGoogleLogin, useFacebookLogin, handleOAuthResponse } from "@/hooks/useOAuth";

const COLORS = {
  background: "#0f172a",
  cardBackground: "#1e293b",
  border: "#334155",
  primary: "#3b82f6",
  text: "#f8fafc",
  textSecondary: "#94a3b8",
  googleButtonBackground: "#4285f4",
  facebookButtonBackground: "#1877f2",
};

export default function LoginScreen() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.TOKEN);
      setIsAuthenticated(!!token);
    } catch {
      // Handle auth check errors silently
    } finally {
      setCheckingAuth(false);
    }
  };

  const handleLoginSuccess = async (userData: unknown, token: string) => {
    try {
      await SecureStore.setItemAsync(STORAGE_KEYS.TOKEN, token);
      // Extract user ID from userData (expected to be a User object with id)
      const user = userData as { id: string };
      await SecureStore.setItemAsync(STORAGE_KEYS.USER_ID, user.id);
      setIsAuthenticated(true);
      setErrorMessage(null);
    } catch {
      Alert.alert("Error", "Failed to save login session");
    }
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    Alert.alert("Authentication Error", message);
  };

  // Use OAuth hooks
  const { login: loginGoogle, response: googleResponse } = useGoogleLogin(handleLoginSuccess, handleError);
  const { login: loginFacebook, response: facebookResponse } = useFacebookLogin(handleLoginSuccess, handleError);

  // Handle OAuth responses - the hooks also handle internally, but we can add additional handling if needed
  useEffect(() => {
    if (googleResponse) {
      // Response is handled inside the hook, but we could add additional logic here
    }
  }, [googleResponse]);

  useEffect(() => {
    if (facebookResponse) {
      // Response is handled inside the hook
    }
  }, [facebookResponse]);

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
          onPress={loginGoogle}
        >
          <View style={styles.buttonIcon}>
            <Text style={styles.googleIcon}>G</Text>
          </View>
          <Text style={styles.buttonText}>Continue with Google</Text>
        </TouchableOpacity>

        {/* Facebook Button */}
        <TouchableOpacity
          style={[styles.button, styles.facebookButton]}
          onPress={loginFacebook}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.primary,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 24,
    width: "100%",
    marginBottom: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: COLORS.googleButtonBackground,
  },
  facebookButton: {
    backgroundColor: COLORS.facebookButtonBackground,
  },
  buttonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  googleIcon: {
    color: COLORS.text,
    fontWeight: "bold",
    fontSize: 14,
  },
  facebookIcon: {
    color: COLORS.text,
    fontWeight: "bold",
    fontSize: 14,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "500",
  },
  securityNotice: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    padding: 12,
    backgroundColor: COLORS.background,
    borderRadius: 8,
  },
  securityText: {
    marginLeft: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
  },
  terms: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: "80%",
  },
});
