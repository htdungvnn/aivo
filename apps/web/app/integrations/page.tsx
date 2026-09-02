"use client";

/**
 * Integrations Page - Connected devices and apps
 */

import React, { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";

// Force dynamic rendering for pages that require authentication
export const dynamic = "force-dynamic";
import { AppShell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  Link2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Trash2,
  Clock,
  ChevronRight,
  Watch,
  Smartphone,
  Scale,
  Utensils,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Integration {
  id: string;
  name: string;
  provider: string;
  category: "wearable" | "scale" | "nutrition" | "other";
  icon: string;
  status: "connected" | "disconnected" | "error";
  lastSyncAt: number | null;
  syncedData: string[];
  connectedAt?: number;
  errorMessage?: string;
}

// =============================================================================
// Sample Data
// =============================================================================

const SAMPLE_INTEGRATIONS: Integration[] = [
  {
    id: "apple-watch",
    name: "Apple Watch",
    provider: "Apple",
    category: "wearable",
    icon: "⌚",
    status: "connected",
    lastSyncAt: Date.now() - 1000 * 60 * 5,
    syncedData: ["heart_rate", "sleep", "activity", "steps", "calories"],
    connectedAt: Date.now() - 86400000 * 30,
  },
  {
    id: "fitbit",
    name: "Fitbit",
    provider: "Fitbit",
    category: "wearable",
    icon: "🔵",
    status: "disconnected",
    lastSyncAt: null,
    syncedData: [],
  },
  {
    id: "garmin",
    name: "Garmin Connect",
    provider: "Garmin",
    category: "wearable",
    icon: "🟢",
    status: "disconnected",
    lastSyncAt: null,
    syncedData: [],
  },
  {
    id: "withings",
    name: "Withings Smart Scale",
    provider: "Withings",
    category: "scale",
    icon: "⚖️",
    status: "connected",
    lastSyncAt: Date.now() - 1000 * 60 * 60 * 2,
    syncedData: ["weight", "body_fat", "muscle_mass"],
    connectedAt: Date.now() - 86400000 * 14,
  },
  {
    id: "myfitnesspal",
    name: "MyFitnessPal",
    provider: "MyFitnessPal",
    category: "nutrition",
    icon: "🍏",
    status: "error",
    lastSyncAt: Date.now() - 86400000 * 3,
    syncedData: [],
    errorMessage: "Authentication expired. Please reconnect.",
    connectedAt: Date.now() - 86400000 * 60,
  },
  {
    id: "samsung-health",
    name: "Samsung Health",
    provider: "Samsung",
    category: "wearable",
    icon: "📱",
    status: "disconnected",
    lastSyncAt: null,
    syncedData: [],
  },
];

// =============================================================================
// Components
// =============================================================================

interface IntegrationCardProps {
  integration: Integration;
  onConnect: (id: string) => void;
  onDisconnect: (id: string) => void;
  onSync: (id: string) => void;
}

function IntegrationCard({
  integration,
  onConnect,
  onDisconnect,
  onSync,
}: IntegrationCardProps) {
  const formatLastSync = (timestamp: number | null) => {
    if (!timestamp) return "Never synced";
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `${mins} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    return `${days} days ago`;
  };

  const statusConfig = {
    connected: {
      label: "Connected",
      color: "text-[var(--color-success)]",
      bg: "bg-[var(--color-success-muted)]",
      icon: CheckCircle,
    },
    disconnected: {
      label: "Not connected",
      color: "text-[var(--color-muted-foreground)]",
      bg: "bg-[var(--color-muted)]",
      icon: XCircle,
    },
    error: {
      label: "Error",
      color: "text-[var(--color-error)]",
      bg: "bg-[var(--color-error-muted)]",
      icon: AlertCircle,
    },
  };

  const config = statusConfig[integration.status];
  const StatusIcon = config.icon;

  const categoryIcons: Record<string, React.ElementType> = {
    wearable: Watch,
    scale: Scale,
    nutrition: Utensils,
    other: Smartphone,
  };

  const CategoryIcon = categoryIcons[integration.category];

  return (
    <Card className={cn(
      "transition-all",
      integration.status === "error" && "border-[var(--color-error)]/30"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">{integration.icon}</span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-medium text-[var(--color-foreground)]">
                  {integration.name}
                </h3>
                <Badge
                  variant={integration.status === "connected" ? "success" : integration.status === "error" ? "error" : "subtle"}
                  size="sm"
                >
                  {config.label}
                </Badge>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)] mt-0.5">
                {integration.provider}
              </p>

              {/* Status Info */}
              <div className="flex items-center gap-2 mt-2 text-xs text-[var(--color-tertiary)]">
                <StatusIcon className={cn("h-4 w-4", config.color)} />
                <span>{formatLastSync(integration.lastSyncAt)}</span>
              </div>

              {/* Synced Data */}
              {integration.status === "connected" && integration.syncedData.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {integration.syncedData.map((data) => (
                    <Badge key={data} variant="subtle" size="sm">
                      {data.replace("_", " ")}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Error Message */}
              {integration.status === "error" && integration.errorMessage && (
                <p className="text-sm text-[var(--color-error)] mt-2">
                  {integration.errorMessage}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {integration.status === "connected" && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onSync(integration.id)}
                  title="Sync now"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDisconnect(integration.id)}
                  className="text-[var(--color-error)] hover:text-[var(--color-error)] hover:bg-[var(--color-error-muted)]"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Disconnect
                </Button>
              </>
            )}
            {integration.status === "disconnected" && (
              <Button size="sm" onClick={() => onConnect(integration.id)}>
                <Plus className="h-4 w-4 mr-2" />
                Connect
              </Button>
            )}
            {integration.status === "error" && (
              <Button size="sm" onClick={() => onConnect(integration.id)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reconnect
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function IntegrationsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [integrations, setIntegrations] = useState<Integration[]>(SAMPLE_INTEGRATIONS);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);

  const handleConnect = useCallback((id: string) => {
    console.log("Connect integration:", id);
    // Open OAuth flow
  }, []);

  const handleDisconnect = useCallback((id: string) => {
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id
          ? { ...int, status: "disconnected" as const, lastSyncAt: null, syncedData: [] }
          : int
      )
    );
  }, []);

  const handleSync = useCallback(async (id: string) => {
    setIsSyncing(id);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIntegrations((prev) =>
      prev.map((int) =>
        int.id === id ? { ...int, lastSyncAt: Date.now(), status: "connected" as const, errorMessage: undefined } : int
      )
    );
    setIsSyncing(null);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading integrations..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const connectedCount = integrations.filter((i) => i.status === "connected").length;
  const errorCount = integrations.filter((i) => i.status === "error").length;

  const wearables = integrations.filter((i) => i.category === "wearable");
  const scales = integrations.filter((i) => i.category === "scale");
  const nutrition = integrations.filter((i) => i.category === "nutrition");

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
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Integrations
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Connect your devices and apps to sync health data
            </p>
          </div>
          <Badge variant="primary" className="w-fit gap-1">
            <CheckCircle className="h-4 w-4" />
            {connectedCount} connected
            {errorCount > 0 && (
              <span className="text-[var(--color-error)]">
                , {errorCount} need attention
              </span>
            )}
          </Badge>
        </div>

        {/* Wearables */}
        <div>
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Watch className="h-5 w-5" />
            Wearables
          </h2>
          <div className="space-y-3">
            {wearables.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onSync={handleSync}
              />
            ))}
          </div>
        </div>

        {/* Body Scales */}
        <div>
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Body Scales
          </h2>
          <div className="space-y-3">
            {scales.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onSync={handleSync}
              />
            ))}
          </div>
        </div>

        {/* Nutrition Apps */}
        <div>
          <h2 className="section-title mb-4 flex items-center gap-2">
            <Utensils className="h-5 w-5" />
            Nutrition Apps
          </h2>
          <div className="space-y-3">
            {nutrition.map((integration) => (
              <IntegrationCard
                key={integration.id}
                integration={integration}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onSync={handleSync}
              />
            ))}
          </div>
        </div>

        {/* Info Card */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Link2 className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <p className="font-medium text-[var(--color-foreground)] mb-1">
                  About Integrations
                </p>
                <p>
                  Connect your health devices and apps to automatically import data into AIVO.
                  Your data is encrypted and stored securely. We only request the permissions
                  necessary to provide you with accurate health insights.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Disclaimer */}
        <div className="text-center py-4">
          <p className="text-xs text-[var(--color-tertiary)]">
            AIVO provides general wellness guidance. Data from connected devices provides
            estimates and may not be accurate for all individuals. Consult healthcare
            professionals for medical-grade measurements.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
