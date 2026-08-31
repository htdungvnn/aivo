"use client";

/**
 * Profile Page - User profile management
 */

import React, { useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { LoadingState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  User,
  Mail,
  Calendar,
  Target,
  Dumbbell,
  Globe,
  Clock,
  Camera,
  Save,
  Edit,
} from "lucide-react";

// =============================================================================
// Sample Data
// =============================================================================

const SAMPLE_PROFILE = {
  displayName: "John Doe",
  email: "john.doe@example.com",
  avatar: null,
  goal: "fat_loss",
  units: "metric",
  timezone: "America/New_York",
  language: "en",
  birthYear: 1990,
  height: 175,
  weight: 78.5,
  fitnessExperience: "intermediate",
  equipment: ["Dumbbells", "Pull-up bar", "Resistance bands"],
  workoutDays: 4,
  dietaryRestrictions: ["No restrictions"],
  createdAt: "2026-01-15",
};

const GOALS = [
  { id: "fat_loss", label: "Fat Loss", icon: "🔥" },
  { id: "muscle_gain", label: "Muscle Gain", icon: "💪" },
  { id: "general_fitness", label: "General Fitness", icon: "🌟" },
  { id: "mobility", label: "Mobility", icon: "🧘" },
  { id: "healthy_lifestyle", label: "Healthy Lifestyle", icon: "🌿" },
];

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Australia/Sydney",
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "vi", label: "Tiếng Việt" },
];

// =============================================================================
// Main Component
// =============================================================================

export default function ProfilePage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState(SAMPLE_PROFILE);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsEditing(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading profile..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  const selectedGoal = GOALS.find((g) => g.id === profile.goal);

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
              Profile
            </h1>
            <p className="text-[var(--color-muted-foreground)]">
              Manage your account information
            </p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Avatar Section */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <div className="relative">
                <Avatar
                  src={profile.avatar || undefined}
                  fallback={profile.displayName}
                  size="xl"
                />
                {isEditing && (
                  <button className="absolute bottom-0 right-0 p-2 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-lg">
                    <Camera className="h-4 w-4" />
                  </button>
                )}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[var(--color-foreground)]">
                  {profile.displayName}
                </h2>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {profile.email}
                </p>
                <Badge variant="primary" className="mt-2">
                  {selectedGoal?.icon} {selectedGoal?.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Display Name
                </label>
                {isEditing ? (
                  <Input
                    value={profile.displayName}
                    onChange={(e) => setProfile({ ...profile, displayName: e.target.value })}
                    placeholder="Your name"
                  />
                ) : (
                  <p className="text-[var(--color-muted-foreground)]">{profile.displayName}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Email
                </label>
                <p className="text-[var(--color-muted-foreground)]">{profile.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Primary Goal
                </label>
                {isEditing ? (
                  <select
                    value={profile.goal}
                    onChange={(e) => setProfile({ ...profile, goal: e.target.value })}
                    className="w-full h-11 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    {GOALS.map((goal) => (
                      <option key={goal.id} value={goal.id}>
                        {goal.icon} {goal.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[var(--color-muted-foreground)]">
                    {selectedGoal?.icon} {selectedGoal?.label}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Units
                </label>
                {isEditing ? (
                  <select
                    value={profile.units}
                    onChange={(e) => setProfile({ ...profile, units: e.target.value })}
                    className="w-full h-11 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    <option value="metric">Metric (kg, cm)</option>
                    <option value="imperial">Imperial (lb, in)</option>
                  </select>
                ) : (
                  <p className="text-[var(--color-muted-foreground)]">
                    {profile.units === "metric" ? "Metric (kg, cm)" : "Imperial (lb, in)"}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location & Preferences */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Location & Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Timezone
                </label>
                {isEditing ? (
                  <select
                    value={profile.timezone}
                    onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                    className="w-full h-11 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[var(--color-muted-foreground)]">{profile.timezone}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Language
                </label>
                {isEditing ? (
                  <select
                    value={profile.language}
                    onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                    className="w-full h-11 px-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang.code} value={lang.code}>{lang.label}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-[var(--color-muted-foreground)]">
                    {LANGUAGES.find((l) => l.code === profile.language)?.label}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fitness Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Dumbbell className="h-5 w-5" />
              Fitness Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Experience Level
                </label>
                <p className="text-[var(--color-muted-foreground)] capitalize">
                  {profile.fitnessExperience}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Workout Days/Week
                </label>
                <p className="text-[var(--color-muted-foreground)]">{profile.workoutDays} days</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--color-foreground)] mb-2">
                  Available Equipment
                </label>
                <p className="text-[var(--color-muted-foreground)]">
                  {profile.equipment.length} items
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card className="bg-[var(--color-muted)]">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
              <Calendar className="h-4 w-4" />
              <span>Member since {new Date(profile.createdAt).toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
