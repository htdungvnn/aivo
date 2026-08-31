"use client";

/**
 * Notifications Page - Notification center and preferences
 */

import React, { useState, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  Heart,
  Utensils,
  Dumbbell,
  Moon,
  FileText,
  Shield,
  Settings,
  Clock,
  ArrowRight,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Notification {
  id: string;
  category: "readiness" | "nutrition" | "workout" | "sleep" | "reports" | "security" | "system";
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

interface NotificationFilter {
  id: string;
  label: string;
  icon: React.ElementType;
  count?: number;
}

// =============================================================================
// Sample Data
// =============================================================================

const SAMPLE_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    category: "readiness",
    title: "Your readiness is good today",
    message: "Score: 78/100. Great sleep and activity levels. You're ready for a productive day!",
    timestamp: Date.now() - 1000 * 60 * 30,
    read: false,
    actionUrl: "/health/readiness",
    actionLabel: "View Details",
  },
  {
    id: "2",
    category: "nutrition",
    title: "Protein goal progress",
    message: "You're at 95g of your 150g protein target. Add a protein-rich snack to reach your goal.",
    timestamp: Date.now() - 1000 * 60 * 60 * 2,
    read: false,
    actionUrl: "/health/nutrition",
    actionLabel: "Log Meal",
  },
  {
    id: "3",
    category: "workout",
    title: "Upper body workout completed",
    message: "Great job finishing your workout! Volume: 12,500 kg. Form score: 87%.",
    timestamp: Date.now() - 1000 * 60 * 60 * 5,
    read: true,
    actionUrl: "/health/workouts/session/1",
    actionLabel: "View Summary",
  },
  {
    id: "4",
    category: "reports",
    title: "Weekly wellness report ready",
    message: "Your weekly wellness report for Aug 24-30 is ready to view.",
    timestamp: Date.now() - 1000 * 60 * 60 * 24,
    read: true,
    actionUrl: "/reports",
    actionLabel: "View Report",
  },
  {
    id: "5",
    category: "sleep",
    title: "Sleep insight",
    message: "Your sleep consistency has improved by 15% this week. Keep it up!",
    timestamp: Date.now() - 1000 * 60 * 60 * 48,
    read: true,
    actionUrl: "/health/sleep",
    actionLabel: "View Sleep",
  },
  {
    id: "6",
    category: "security",
    title: "New login detected",
    message: "A new login to your account from iPhone 15 Pro, New York, US.",
    timestamp: Date.now() - 1000 * 60 * 60 * 72,
    read: true,
    actionUrl: "/security",
    actionLabel: "Review Sessions",
  },
  {
    id: "7",
    category: "system",
    title: "Data sync complete",
    message: "Your health data has been synchronized from all connected devices.",
    timestamp: Date.now() - 1000 * 60 * 60 * 96,
    read: true,
  },
];

const FILTERS: NotificationFilter[] = [
  { id: "all", label: "All", icon: Bell },
  { id: "readiness", label: "Readiness", icon: Heart },
  { id: "nutrition", label: "Nutrition", icon: Utensils },
  { id: "workout", label: "Workout", icon: Dumbbell },
  { id: "sleep", label: "Sleep", icon: Moon },
  { id: "reports", label: "Reports", icon: FileText },
  { id: "security", label: "Security", icon: Shield },
];

// =============================================================================
// Components
// =============================================================================

interface NotificationCardProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
}

function NotificationCard({ notification, onMarkRead, onDelete }: NotificationCardProps) {
  const formatTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const categoryConfig: Record<string, { icon: React.ElementType; color: string }> = {
    readiness: { icon: Heart, color: "text-readiness bg-readiness-muted" },
    nutrition: { icon: Utensils, color: "text-nutrition bg-nutrition-muted" },
    workout: { icon: Dumbbell, color: "text-workout bg-workout-muted" },
    sleep: { icon: Moon, color: "text-sleep bg-sleep-muted" },
    reports: { icon: FileText, color: "text-[var(--color-muted-foreground)] bg-[var(--color-muted)]" },
    security: { icon: Shield, color: "text-[var(--color-warning)] bg-[var(--color-warning-muted)]" },
    system: { icon: Settings, color: "text-[var(--color-muted-foreground)] bg-[var(--color-muted)]" },
  };

  const config = categoryConfig[notification.category];
  const Icon = config.icon;

  return (
    <Card className={cn(
      "transition-all",
      !notification.read && "border-[var(--color-primary)]/30 bg-[var(--color-primary)]/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("p-2 rounded-lg shrink-0", config.color)}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className={cn(
                  "font-medium text-[var(--color-foreground)]",
                  !notification.read && "font-semibold"
                )}>
                  {notification.title}
                </h3>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  {notification.message}
                </p>
                {notification.actionUrl && (
                  <a
                    href={notification.actionUrl}
                    className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline mt-2"
                  >
                    {notification.actionLabel}
                    <ArrowRight className="h-3 w-3" />
                  </a>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs text-[var(--color-tertiary)] whitespace-nowrap">
                  {formatTime(notification.timestamp)}
                </span>
                {!notification.read && (
                  <button
                    onClick={() => onMarkRead(notification.id)}
                    className="p-1 rounded hover:bg-[var(--color-elevated)]"
                    title="Mark as read"
                  >
                    <Check className="h-4 w-4 text-[var(--color-primary)]" />
                  </button>
                )}
                <button
                  onClick={() => onDelete(notification.id)}
                  className="p-1 rounded hover:bg-[var(--color-error-muted)]"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4 text-[var(--color-muted-foreground)] hover:text-[var(--color-error)]" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function NotificationsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>(SAMPLE_NOTIFICATIONS);
  const [activeFilter, setActiveFilter] = useState("all");

  const handleMarkRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const handleMarkAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const handleDelete = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const handleClearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading notifications..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const filteredNotifications = notifications.filter((n) =>
    activeFilter === "all" || n.category === activeFilter
  );

  const getFilterCount = (filterId: string) => {
    if (filterId === "all") return notifications.length;
    return notifications.filter((n) => n.category === filterId).length;
  };

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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
              Notifications
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              {unreadCount > 0
                ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
                : "All caught up!"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {FILTERS.map((filter) => {
            const Icon = filter.icon;
            const count = getFilterCount(filter.id);
            const isActive = activeFilter === filter.id;

            return (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-elevated)]"
                )}
              >
                <Icon className="h-4 w-4" />
                {filter.label}
                {count > 0 && (
                  <Badge
                    variant={isActive ? "primary" : "subtle"}
                    size="sm"
                    className="ml-1"
                  >
                    {count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Notifications List */}
        {filteredNotifications.length > 0 ? (
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                onMarkRead={handleMarkRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-12 w-12 mx-auto text-[var(--color-muted)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--color-foreground)] mb-2">
                No notifications
              </h3>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {activeFilter === "all"
                  ? "You're all caught up! Check back later."
                  : `No ${activeFilter} notifications.`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Bell className="h-5 w-5 text-[var(--color-muted-foreground)] shrink-0 mt-0.5" />
              <div className="text-sm text-[var(--color-muted-foreground)]">
                <p className="font-medium text-[var(--color-foreground)] mb-1">
                  Notification Settings
                </p>
                <p>
                  You can customize which notifications you receive in your
                  <a href="/settings" className="text-[var(--color-primary)] hover:underline mx-1">
                    Settings
                  </a>
                  page. We respect your preferences and won't spam you.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
