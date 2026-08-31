"use client";

/**
 * Settings Page - App preferences and configuration
 */

import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  Settings,
  Palette,
  Globe,
  Bell,
  Sparkles,
  Shield,
  Accessibility,
  Eye,
  Volume2,
  Vibrate,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Settings {
  theme: "light" | "dark" | "system";
  reducedMotion: boolean;
  largerText: boolean;
  highContrast: boolean;
  chartPatterns: boolean;
  language: string;
  units: "metric" | "imperial";
  notifications: {
    dailyPlan: boolean;
    readiness: boolean;
    nutrition: boolean;
    workout: boolean;
    reports: boolean;
    security: boolean;
    sound: boolean;
    haptics: boolean;
  };
  ai: {
    insights: boolean;
    mealAnalysis: boolean;
    planSuggestions: boolean;
    cameraCoachVoice: boolean;
    explanationDetail: "basic" | "detailed";
  };
  privacy: {
    analytics: boolean;
    crashReports: boolean;
    marketingEmails: boolean;
  };
}

// =============================================================================
// Sample Data
// =============================================================================

const DEFAULT_SETTINGS: Settings = {
  theme: "dark",
  reducedMotion: false,
  largerText: false,
  highContrast: false,
  chartPatterns: false,
  language: "en",
  units: "metric",
  notifications: {
    dailyPlan: true,
    readiness: true,
    nutrition: true,
    workout: true,
    reports: true,
    security: true,
    sound: true,
    haptics: true,
  },
  ai: {
    insights: true,
    mealAnalysis: true,
    planSuggestions: true,
    cameraCoachVoice: false,
    explanationDetail: "basic",
  },
  privacy: {
    analytics: true,
    crashReports: true,
    marketingEmails: false,
  },
};

// =============================================================================
// Components
// =============================================================================

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

function ToggleSwitch({ checked, onChange, disabled }: ToggleSwitchProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked
          ? "bg-[var(--color-primary)]"
          : "bg-[var(--color-muted)]"
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition-transform",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}

interface SettingsSectionProps {
  title: string;
  description?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}

function SettingsSection({ title, description, icon: Icon, children }: SettingsSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  );
}

interface SettingsRowProps {
  label: string;
  description?: string;
  children: React.ReactNode;
}

function SettingsRow({ label, description, children }: SettingsRowProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="font-medium text-[var(--color-foreground)]">{label}</p>
        {description && (
          <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function SettingsPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [activeSection, setActiveSection] = useState("appearance");

  const handleUpdateSetting = <K extends keyof Settings>(
    key: K,
    value: Settings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateNotification = (
    key: keyof Settings["notifications"],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      notifications: { ...prev.notifications, [key]: value },
    }));
  };

  const handleUpdateAI = (key: keyof Settings["ai"], value: boolean | string) => {
    setSettings((prev) => ({
      ...prev,
      ai: { ...prev.ai, [key]: value },
    }));
  };

  const handleUpdatePrivacy = (
    key: keyof Settings["privacy"],
    value: boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      privacy: { ...prev.privacy, [key]: value },
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading settings..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const sections = [
    { id: "appearance", label: "Appearance", icon: Palette },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "ai", label: "AI Preferences", icon: Sparkles },
    { id: "accessibility", label: "Accessibility", icon: Accessibility },
    { id: "privacy", label: "Privacy", icon: Shield },
  ];

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
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-foreground)]">
            Settings
          </h1>
          <p className="text-[var(--color-muted-foreground)]">
            Customize your AIVO experience
          </p>
        </div>

        {/* Section Navigation */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                  activeSection === section.id
                    ? "bg-[var(--color-primary)]/10 text-[var(--color-primary)]"
                    : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:bg-[var(--color-elevated)]"
                )}
              >
                <Icon className="h-4 w-4" />
                {section.label}
              </button>
            );
          })}
        </div>

        {/* Appearance Settings */}
        {activeSection === "appearance" && (
          <>
            <SettingsSection
              title="Theme"
              description="Choose your preferred color scheme"
              icon={Palette}
            >
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "light", label: "Light", icon: Sun },
                  { id: "dark", label: "Dark", icon: Moon },
                  { id: "system", label: "System", icon: Monitor },
                ].map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.id}
                      onClick={() => handleUpdateSetting("theme", option.id as Settings["theme"])}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                        settings.theme === option.id
                          ? "border-[var(--color-primary)] bg-[var(--color-primary)]/10"
                          : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                      )}
                    >
                      <Icon className={cn(
                        "h-6 w-6",
                        settings.theme === option.id
                          ? "text-[var(--color-primary)]"
                          : "text-[var(--color-muted-foreground)]"
                      )} />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  );
                })}
              </div>
            </SettingsSection>

            <SettingsSection
              title="Language & Region"
              description="Set your preferred language and units"
              icon={Globe}
            >
              <SettingsRow label="Language">
                <select
                  value={settings.language}
                  onChange={(e) => handleUpdateSetting("language", e.target.value)}
                  className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="vi">Tiếng Việt</option>
                </select>
              </SettingsRow>
              <SettingsRow label="Units">
                <select
                  value={settings.units}
                  onChange={(e) => handleUpdateSetting("units", e.target.value as Settings["units"])}
                  className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                >
                  <option value="metric">Metric (kg, cm)</option>
                  <option value="imperial">Imperial (lb, in)</option>
                </select>
              </SettingsRow>
            </SettingsSection>
          </>
        )}

        {/* Notification Settings */}
        {activeSection === "notifications" && (
          <SettingsSection
            title="Push Notifications"
            description="Choose what notifications you receive"
            icon={Bell}
          >
            <SettingsRow label="Daily Plan Reminders">
              <ToggleSwitch
                checked={settings.notifications.dailyPlan}
                onChange={(v) => handleUpdateNotification("dailyPlan", v)}
              />
            </SettingsRow>
            <SettingsRow label="Readiness Alerts">
              <ToggleSwitch
                checked={settings.notifications.readiness}
                onChange={(v) => handleUpdateNotification("readiness", v)}
              />
            </SettingsRow>
            <SettingsRow label="Nutrition Reminders">
              <ToggleSwitch
                checked={settings.notifications.nutrition}
                onChange={(v) => handleUpdateNotification("nutrition", v)}
              />
            </SettingsRow>
            <SettingsRow label="Workout Reminders">
              <ToggleSwitch
                checked={settings.notifications.workout}
                onChange={(v) => handleUpdateNotification("workout", v)}
              />
            </SettingsRow>
            <SettingsRow label="Report Notifications">
              <ToggleSwitch
                checked={settings.notifications.reports}
                onChange={(v) => handleUpdateNotification("reports", v)}
              />
            </SettingsRow>
            <SettingsRow label="Security Alerts">
              <ToggleSwitch
                checked={settings.notifications.security}
                onChange={(v) => handleUpdateNotification("security", v)}
              />
            </SettingsRow>

            <div className="border-t border-[var(--color-border)] pt-4">
              <h4 className="text-sm font-medium text-[var(--color-foreground)] mb-4">
                Feedback
              </h4>
              <SettingsRow label="Sound">
                <ToggleSwitch
                  checked={settings.notifications.sound}
                  onChange={(v) => handleUpdateNotification("sound", v)}
                />
              </SettingsRow>
              <SettingsRow label="Haptic Feedback">
                <ToggleSwitch
                  checked={settings.notifications.haptics}
                  onChange={(v) => handleUpdateNotification("haptics", v)}
                />
              </SettingsRow>
            </div>
          </SettingsSection>
        )}

        {/* AI Settings */}
        {activeSection === "ai" && (
          <SettingsSection
            title="AI Preferences"
            description="Control how AI features work for you"
            icon={Sparkles}
          >
            <SettingsRow
              label="AI Insights"
              description="Receive personalized health insights"
            >
              <ToggleSwitch
                checked={settings.ai.insights}
                onChange={(v) => handleUpdateAI("insights", v)}
              />
            </SettingsRow>
            <SettingsRow
              label="Meal Analysis"
              description="Use AI to analyze meal photos"
            >
              <ToggleSwitch
                checked={settings.ai.mealAnalysis}
                onChange={(v) => handleUpdateAI("mealAnalysis", v)}
              />
            </SettingsRow>
            <SettingsRow
              label="Plan Suggestions"
              description="Let AI suggest workout and meal adjustments"
            >
              <ToggleSwitch
                checked={settings.ai.planSuggestions}
                onChange={(v) => handleUpdateAI("planSuggestions", v)}
              />
            </SettingsRow>
            <SettingsRow
              label="Camera Coach Voice"
              description="Enable voice feedback during workouts"
            >
              <ToggleSwitch
                checked={settings.ai.cameraCoachVoice}
                onChange={(v) => handleUpdateAI("cameraCoachVoice", v)}
              />
            </SettingsRow>
            <SettingsRow
              label="Explanation Detail"
              description="How much detail in AI explanations"
            >
              <select
                value={settings.ai.explanationDetail}
                onChange={(e) => handleUpdateAI("explanationDetail", e.target.value)}
                className="h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
              >
                <option value="basic">Basic</option>
                <option value="detailed">Detailed</option>
              </select>
            </SettingsRow>
          </SettingsSection>
        )}

        {/* Accessibility Settings */}
        {activeSection === "accessibility" && (
          <SettingsSection
            title="Accessibility"
            description="Customize accessibility features"
            icon={Accessibility}
          >
            <SettingsRow
              label="Reduced Motion"
              description="Minimize animations throughout the app"
            >
              <ToggleSwitch
                checked={settings.reducedMotion}
                onChange={(v) => handleUpdateSetting("reducedMotion", v)}
              />
            </SettingsRow>
            <SettingsRow
              label="Larger Text"
              description="Increase text size for better readability"
            >
              <ToggleSwitch
                checked={settings.largerText}
                onChange={(v) => handleUpdateSetting("largerText", v)}
              />
            </SettingsRow>
            <SettingsRow
              label="High Contrast"
              description="Increase contrast for better visibility"
            >
              <ToggleSwitch
                checked={settings.highContrast}
                onChange={(v) => handleUpdateSetting("highContrast", v)}
              />
            </SettingsRow>
            <SettingsRow
              label="Chart Patterns"
              description="Use patterns in charts alongside colors"
            >
              <ToggleSwitch
                checked={settings.chartPatterns}
                onChange={(v) => handleUpdateSetting("chartPatterns", v)}
              />
            </SettingsRow>
          </SettingsSection>
        )}

        {/* Privacy Settings */}
        {activeSection === "privacy" && (
          <SettingsSection
            title="Privacy"
            description="Control your data and privacy settings"
            icon={Shield}
          >
            <SettingsRow
              label="Usage Analytics"
              description="Help improve AIVO by sharing anonymous usage data"
            >
              <ToggleSwitch
                checked={settings.privacy.analytics}
                onChange={(v) => handleUpdatePrivacy("analytics", v)}
              />
            </SettingsRow>
            <SettingsRow
              label="Crash Reports"
              description="Automatically send crash reports to help fix issues"
            >
              <ToggleSwitch
                checked={settings.privacy.crashReports}
                onChange={(v) => handleUpdatePrivacy("crashReports", v)}
              />
            </SettingsRow>
            <SettingsRow
              label="Marketing Emails"
              description="Receive updates about new features and promotions"
            >
              <ToggleSwitch
                checked={settings.privacy.marketingEmails}
                onChange={(v) => handleUpdatePrivacy("marketingEmails", v)}
              />
            </SettingsRow>
          </SettingsSection>
        )}

        {/* App Info */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4 text-center">
            <p className="text-sm text-[var(--color-tertiary)]">
              AIVO v1.0.0 • Built with care for your wellness
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
