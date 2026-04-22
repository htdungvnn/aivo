"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState, useCallback } from "react";
import type { User, AuthResponse } from "@aivo/shared-types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const verifySession = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify`, {
        method: "POST",
        credentials: "include", // Include cookies
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setUser(data.user);
          return true;
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Session verification failed:", error);
    }

    return false;
  }, []);

  useEffect(() => {
    // Check for existing session via httpOnly cookie
    const checkSession = async () => {
      const hasSession = await verifySession();
      if (!hasSession) {
        // Fallback: Check localStorage for dev mode (will be removed in production)
        const storedUser = localStorage.getItem("aivo_user");
        if (storedUser) {
          try {
            setUser(JSON.parse(storedUser));
          } catch {
            // Invalid stored data
          }
        }
      }
      setLoading(false);
    };

    checkSession();
  }, [verifySession]);

  const login = async (data: AuthResponse) => {
    // Store user data in state (not localStorage for security)
    setUser(data.user);

    // Set httpOnly cookie via server endpoint
    await fetch(`${API_URL}/api/auth/set-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: data.token }),
      credentials: "include",
    }).catch((err) => {
      // eslint-disable-next-line no-console
      console.error("Failed to set session cookie:", err);
    });
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Logout error:", err);
    }

    setUser(null);
    localStorage.removeItem("aivo_user");
    localStorage.removeItem("aivo_token");
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
