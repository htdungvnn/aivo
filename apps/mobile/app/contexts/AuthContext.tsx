import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import type { User, AuthResponse } from "@aivo/shared-types";
import { ApiErrorHandler, useNetworkStatus } from "@/utils/error-handler";
import { Alert } from "react-native";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

const TOKEN_KEY = "aivo_token";
const USER_KEY = "aivo_user_id";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { isConnected } = useNetworkStatus();
  const router = useRouter();

  const clearError = useCallback(() => setError(null), []);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await SecureStore.getItemAsync(TOKEN_KEY);
        const userId = await SecureStore.getItemAsync(USER_KEY);

        if (token && userId) {
          // Verify token with backend if online
          if (isConnected) {
            try {
              const response = await fetch(`${API_URL}/api/auth/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token }),
              });
              const data = await response.json();

              if (data.success) {
                setUser(data.data.user);
              } else {
                // Invalid token, clear storage
                await SecureStore.deleteItemAsync(TOKEN_KEY);
                await SecureStore.deleteItemAsync(USER_KEY);
                setUser(null);
              }
            } catch {
              // If verification fails but we have token, assume valid for offline
              setUser({
                id: userId,
                email: "",
                name: "",
                createdAt: new Date(),
                updatedAt: new Date(),
              });
            }
          } else {
            // Offline mode - use cached user
            setUser({
              id: userId,
              email: "",
              name: "",
              createdAt: new Date(),
              updatedAt: new Date(),
            });
          }
        }
      } catch {
        // Handle auth check errors silently
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [isConnected]);

  const login = useCallback(async (data: AuthResponse) => {
    try {
      await SecureStore.setItemAsync(TOKEN_KEY, data.token);
      await SecureStore.setItemAsync(USER_KEY, data.user.id);
      setUser(data.user);
      setError(null);
      router.replace("/(tabs)");
    } catch (err) {
      const message = ApiErrorHandler.handle(err, "Login failed");
      setError(message);
      throw err;
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token && isConnected) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch {
      // Silently ignore logout errors
    } finally {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
      await SecureStore.deleteItemAsync(USER_KEY);
      setUser(null);
      setError(null);
      router.replace("/(auth)/login");
    }
  }, [isConnected, router]);

  // Show error alert if error exists
  useEffect(() => {
    if (error) {
      Alert.alert("Authentication Error", error);
    }
  }, [error]);

  const value: AuthContextType = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    error,
    clearError,
  }), [user, loading, login, logout, error, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
