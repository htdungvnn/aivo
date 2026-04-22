"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import { Activity, Lock, Shield, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { LoginRequest, AuthResponse } from "@aivo/shared-types";

interface LoginPageProps {
  onLogin?: (data: AuthResponse) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<"google" | "facebook" | null>(null);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

  const setSessionCookie = async (token: string): Promise<void> => {
    await fetch(`${API_URL}/api/auth/set-session`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
      },
      credentials: "include",
    });
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) {
      setError("No credential received from Google");
      return;
    }

    setLoading("google");
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential } as LoginRequest),
      });

      const data: { success: boolean; data?: AuthResponse; error?: string } = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Google login failed");
      }

      // Set httpOnly cookie for session
      await setSessionCookie(data.data!.token);

      onLogin?.(data.data!);
      router.push("/dashboard");
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : "Google login failed");
    } finally {
      setLoading(null);
    }
  };

  const handleGoogleError = () => {
    setError("Google login was cancelled");
  };

  const handleFacebookLogin = async () => {
    const clientId = process.env.NEXT_PUBLIC_FACEBOOK_CLIENT_ID || "";
    const redirectUri = `${window.location.origin}/auth/facebook/callback`;
    const scope = "email,public_profile";

    const authUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${encodeURIComponent(scope)}`;

    const width = 600;
    const height = 700;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      "facebook_login",
      `width=${width},height=${height},left=${left},top=${top},popup=true`
    );

    const checkClosed = setInterval(() => {
      if (popup?.closed) {
        clearInterval(checkClosed);
      }
    }, 500);
  };

  const handleFacebookSuccess = async (accessToken: string) => {
    setLoading("facebook");
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/auth/facebook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: accessToken } as LoginRequest),
      });

      const data: { success: boolean; data?: AuthResponse; error?: string } = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Facebook login failed");
      }

      // Set httpOnly cookie for session
      await setSessionCookie(data.data!.token);

      onLogin?.(data.data!);
      router.push("/dashboard");
    } catch (_err) {
      setError(_err instanceof Error ? _err.message : "Facebook login failed");
    } finally {
      setLoading(null);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("message", async (event) => {
      if (event.data.type === "facebook_callback" && event.data.accessToken) {
        await handleFacebookSuccess(event.data.accessToken);
      }
    });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          {[...Array(11)].map((_, i) => (
            <g key={i}>
              <line x1={`${i * 10}%`} y1="0" x2={`${i * 10}%`} y2="100%" stroke="#06b6d4" strokeWidth="0.1" />
              <line x1="0" y1={`${i * 10}%`} x2="100%" y2={`${i * 10}%`} stroke="#06b6d4" strokeWidth="0.1" />
            </g>
          ))}
        </svg>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-md"
      >
        {/* Logo & Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-3 mb-4"
          >
            <div className="relative">
              <div className="absolute -inset-2 bg-cyan-400/30 rounded-full blur-md" />
              <Activity className="w-10 h-10 text-cyan-400 relative z-10" />
            </div>
            <span className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
              AIVO
            </span>
          </motion.div>
          <p className="text-gray-400 text-sm">
            AI-Powered Fitness Intelligence Platform
          </p>
        </div>

        {/* Security Badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center justify-center gap-2 mb-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Shield className="w-3.5 h-3.5" />
            <span>Protected by Cloudflare Turnstile</span>
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="bg-gradient-to-br from-slate-900/90 to-slate-800/90 backdrop-blur-sm border-slate-700/50 shadow-2xl">
            <CardContent className="pt-6">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-gray-400 text-sm">Sign in to access your AI fitness dashboard</p>
              </div>

              {/* OAuth Buttons */}
              <div className="space-y-4">
                {/* Google Button */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex justify-center"
                >
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={handleGoogleError}
                    theme="filled_blue"
                    size="large"
                    text="continue_with"
                    shape="rectangular"
                    locale="en"
                    width={280}
                    useOneTap
                  />
                </motion.div>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-700/50" />
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-slate-900/90 text-gray-500">Or continue with</span>
                  </div>
                </div>

                {/* Facebook Button */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <Button
                    onClick={handleFacebookLogin}
                    disabled={loading === "facebook"}
                    className="w-full bg-[#1877F2] hover:bg-[#166FE5] disabled:bg-[#1877F2]/50 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30"
                    size="lg"
                  >
                    {loading === "facebook" ? (
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                        </svg>
                        <span>Continue with Facebook</span>
                      </>
                    )}
                  </Button>
                </motion.div>
              </div>

              {/* Error Display */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                </motion.div>
              )}

              {/* Security Notice */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-500"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>End-to-end encrypted connection</span>
              </motion.div>

              {/* Terms */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="text-xs text-gray-500 text-center mt-6"
              >
                By signing in, you agree to our{" "}
                <a href="#" className="text-cyan-400 hover:text-cyan-300 underline">Terms of Service</a>
                {" "}and{" "}
                <a href="#" className="text-cyan-400 hover:text-cyan-300 underline">Privacy Policy</a>
              </motion.p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Back to Landing */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="text-center mt-6"
        >
          <Button
            variant="ghost"
            onClick={() => router.push("/")}
            className="text-gray-400 hover:text-cyan-400 hover:bg-transparent"
          >
            <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
            <span>Back to home</span>
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
