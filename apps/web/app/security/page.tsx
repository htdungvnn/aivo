"use client";

/**
 * Security Page - Account security and sessions management
 */

import React, { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState, ErrorState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  Shield,
  Smartphone,
  Monitor,
  Globe,
  Clock,
  LogOut,
  Trash2,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ExternalLink,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Session {
  id: string;
  deviceName: string;
  platform: string | null;
  browser: string;
  location: string;
  ipAddress: string;
  lastActiveAt: number;
  createdAt: number;
  isCurrent: boolean;
}

interface OAuthProvider {
  provider: "google" | "facebook";
  connected: boolean;
  connectedAt?: number;
  email?: string;
}

// =============================================================================
// Sample Data
// =============================================================================

const SAMPLE_SESSIONS: Session[] = [
  {
    id: "session-1",
    deviceName: "MacBook Pro",
    platform: "macOS",
    browser: "Chrome 126",
    location: "New York, US",
    ipAddress: "192.168.1.xxx",
    lastActiveAt: Date.now() - 1000 * 60 * 5, // 5 mins ago
    createdAt: Date.now() - 86400000 * 30, // 30 days ago
    isCurrent: true,
  },
  {
    id: "session-2",
    deviceName: "iPhone 15 Pro",
    platform: "iOS",
    browser: "Safari",
    location: "New York, US",
    ipAddress: "192.168.1.xxx",
    lastActiveAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    createdAt: Date.now() - 86400000 * 14, // 14 days ago
    isCurrent: false,
  },
  {
    id: "session-3",
    deviceName: "Windows PC",
    platform: "Windows",
    browser: "Firefox 128",
    location: "San Francisco, US",
    ipAddress: "10.0.0.xxx",
    lastActiveAt: Date.now() - 86400000 * 3, // 3 days ago
    createdAt: Date.now() - 86400000 * 60, // 60 days ago
    isCurrent: false,
  },
];

const SAMPLE_PROVIDERS: OAuthProvider[] = [
  { provider: "google", connected: true, connectedAt: Date.now() - 86400000 * 90, email: "john@gmail.com" },
  { provider: "facebook", connected: false },
];

// =============================================================================
// Components
// =============================================================================

interface SessionCardProps {
  session: Session;
  onRevoke: (id: string) => void;
}

function SessionCard({ session, onRevoke }: SessionCardProps) {
  const formatLastActive = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `${mins} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  const DeviceIcon = session.platform === "iOS" || session.platform === "Android"
    ? Smartphone
    : Monitor;

  return (
    <Card className={cn(session.isCurrent && "border-[var(--color-success)]/30")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              session.isCurrent ? "bg-[var(--color-success-muted)]" : "bg-[var(--color-muted)]"
            )}>
              <DeviceIcon className={cn(
                "h-5 w-5",
                session.isCurrent ? "text-[var(--color-success)]" : "text-[var(--color-muted-foreground)]"
              )} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[var(--color-foreground)]">
                  {session.deviceName}
                </h3>
                {session.isCurrent && (
                  <Badge variant="success" size="sm">Current</Badge>
                )}
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                {session.browser} • {session.platform}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-[var(--color-tertiary)]">
                <span className="flex items-center gap-1">
                  <Globe className="h-3 w-3" />
                  {session.location}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatLastActive(session.lastActiveAt)}
                </span>
              </div>
            </div>
          </div>
          {!session.isCurrent && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRevoke(session.id)}
              className="text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-muted)]"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Revoke
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface ProviderCardProps {
  provider: OAuthProvider;
  onConnect: () => void;
  onDisconnect: () => void;
}

function ProviderCard({ provider, onConnect, onDisconnect }: ProviderCardProps) {
  const providerConfig = {
    google: { name: "Google", icon: "🔵" },
    facebook: { name: "Facebook", icon: "🔵" },
  };

  const config = providerConfig[provider.provider];

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{config.icon}</span>
            <div>
              <h3 className="font-medium text-[var(--color-foreground)]">
                {config.name}
              </h3>
              {provider.connected ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Connected as {provider.email}
                </p>
              ) : (
                <p className="text-sm text-[var(--color-tertiary)]">
                  Not connected
                </p>
              )}
            </div>
          </div>
          {provider.connected ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onDisconnect}
            >
              Disconnect
            </Button>
          ) : (
            <Button size="sm" onClick={onConnect}>
              Connect
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SecurityPage() {
  const { user, isLoading, isAuthenticated, logout, logoutAll } = useAuth();
  const [sessions, setSessions] = useState<Session[]>(SAMPLE_SESSIONS);
  const [providers] = useState<OAuthProvider[]>(SAMPLE_PROVIDERS);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRevoking, setIsRevoking] = useState<string | null>(null);

  const handleRevokeSession = useCallback(async (sessionId: string) => {
    setIsRevoking(sessionId);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setIsRevoking(null);
  }, []);

  const handleRevokeAllSessions = useCallback(async () => {
    await logoutAll();
    setSessions((prev) => prev.filter((s) => s.isCurrent));
  }, [logoutAll]);

  const handleDeleteAccount = useCallback(async () => {
    // Handle account deletion
    setShowDeleteConfirm(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading security settings..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const currentSession = sessions.find((s) => s.isCurrent);

  return (
    <AppShell
      user={
        user
          ? {
              name: user.displayName || user.email,
              email: user.email,
              avatar: user.avatarUrl || undefined,
            }
          : undefined
      }
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Security
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            Manage your account security and connected devices
          </p>
        </div>

        {/* Connected Devices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Active Sessions
              </CardTitle>
              <CardDescription>
                Manage devices that are logged into your account
              </CardDescription>
            </div>
            {sessions.length > 1 && (
              <Button variant="secondary" size="sm" onClick={handleRevokeAllSessions}>
                <LogOut className="h-4 w-4 mr-2" />
                Log out all
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onRevoke={handleRevokeSession}
              />
            ))}
          </CardContent>
        </Card>

        {/* Connected Accounts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Connected Accounts
            </CardTitle>
            <CardDescription>
              Link your social accounts for easier sign-in
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.provider}
                provider={provider}
                onConnect={() => console.log("Connect:", provider.provider)}
                onDisconnect={() => console.log("Disconnect:", provider.provider)}
              />
            ))}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-[var(--color-error)]/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-[var(--color-error)]">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-[var(--color-foreground)]">
                  Delete Account
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <Button
                variant="outline"
                className="border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error-muted)]"
                onClick={() => setShowDeleteConfirm(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-[var(--color-overlay-dark)]"
              onClick={() => setShowDeleteConfirm(false)}
            />
            <Card className="relative z-10 max-w-md w-full mx-4">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-[var(--color-error-muted)]">
                    <AlertTriangle className="h-6 w-6 text-[var(--color-error)]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                      Delete Account
                    </h3>
                    <p className="text-sm text-[var(--color-muted-foreground)]">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-muted-foreground)] mb-6">
                  Are you sure you want to delete your account? All your data, including
                  health records, meal history, and progress will be permanently removed.
                </p>
                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)}>
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleDeleteAccount}
                    className="bg-[var(--color-error)] hover:bg-[var(--color-error)]/90"
                  >
                    Delete Account
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Info Card */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <p className="font-medium text-[var(--color-foreground)] mb-1">
                  Account Security Tips
                </p>
                <p>
                  Keep your account secure by regularly reviewing active sessions and
                  using strong, unique passwords. Enable two-factor authentication when
                  available for an extra layer of protection.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
