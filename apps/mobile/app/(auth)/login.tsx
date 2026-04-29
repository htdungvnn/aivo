import { Redirect } from "expo-router";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Activity as ActivityIcon, Lock } from "lucide-react-native";
import { STORAGE_KEYS } from "@/config";
import { useGoogleLogin, useFacebookLogin, handleOAuthResponse } from "@/hooks/useOAuth";
import colors from "@/theme/colors";

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
