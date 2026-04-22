import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import type { User, AuthResponse } from "@aivo/shared-types";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

const TOKEN_KEY = "aivo_token";
const USER_KEY = "aivo_user_id";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userId = await SecureStore.getItemAsync(USER_KEY);

      if (token && userId) {
        // In a real app, you'd verify the token with the backend
        // For now, we'll just set a basic user object
        setUser({
          id: userId,
          email: "",
          name: "",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    } catch {
      // Silently fail - user will be redirected to login
    } finally {
      setLoading(false);
    }
  };

  const login = async (data: AuthResponse) => {
    await SecureStore.setItemAsync(TOKEN_KEY, data.token);
    await SecureStore.setItemAsync(USER_KEY, data.user.id);
    setUser(data.user);
    router.replace("/(tabs)");
  };

  const logout = async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
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
      router.replace("/(auth)/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
