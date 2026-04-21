"use client";

import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";
import type { User, AuthResponse } from "@aivo/shared-types";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (data: AuthResponse) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored session on mount
    const storedUser = localStorage.getItem("aivo_user");
    const token = localStorage.getItem("aivo_token");

    if (storedUser && token) {
      try {
        setUser(JSON.parse(storedUser));
        // Optionally verify token with backend
        fetch(`${API_URL}/api/auth/verify`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {
          // Token invalid, clear session
          localStorage.removeItem("aivo_user");
          localStorage.removeItem("aivo_token");
          setUser(null);
        });
      } catch {
        localStorage.removeItem("aivo_user");
        localStorage.removeItem("aivo_token");
      }
    }
    setLoading(false);
  }, []);

  const login = (data: AuthResponse) => {
    localStorage.setItem("aivo_token", data.token);
    localStorage.setItem("aivo_user", JSON.stringify(data.user));
    setUser(data.user);
  };

  const logout = async () => {
    const token = localStorage.getItem("aivo_token");
    if (token) {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    localStorage.removeItem("aivo_token");
    localStorage.removeItem("aivo_user");
    setUser(null);
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
