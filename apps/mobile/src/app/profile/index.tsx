/**
 * AIVO Mobile - Profile Screen
 * User profile, goals, and preferences
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/ui';

import {
  ScrollScreen,
  BackHeader,
  Card,
  SectionHeader,
  ListHeader,
  Badge,
  Button,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthGuard } from '@/contexts/AuthGuardContext';

const GOALS = [
  { id: 'fat_loss', label: 'Fat Loss', icon: 'flame' },
  { id: 'muscle_gain', label: 'Muscle Gain', icon: 'fitness' },
  { id: 'general_fitness', label: 'General Fitness', icon: 'walk' },
  { id: 'mobility', label: 'Mobility', icon: 'accessibility' },
  { id: 'healthy_lifestyle', label: 'Healthy Lifestyle', icon: 'heart' },
];

const EXPERIENCE_LEVELS = [
  { id: 'beginner', label: 'Beginner', description: 'Less than 1 year' },
  { id: 'intermediate', label: 'Intermediate', description: '1-3 years' },
  { id: 'advanced', label: 'Advanced', description: '3+ years' },
];

export default function ProfileScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuthGuard();

  const [profile, setProfile] = useState({
    displayName: user?.displayName || 'User',
    email: user?.email || 'user@example.com',
    goal: 'general_fitness',
    experience: 'intermediate',
    timezone: 'America/New_York',
    language: 'en',
    units: 'metric',
  });

  const [editing, setEditing] = useState(false);

  const getGoalIcon = (goalId: string): keyof typeof Ionicons.glyphMap => {
    const goal = GOALS.find(g => g.id === goalId);
    return (goal?.icon as keyof typeof Ionicons.glyphMap) || 'help-circle';
  };

  return (
    <ScrollScreen
      edges={['top']}
      contentStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSpacer} />

      <BackHeader
        title="Profile"
        subtitle="Manage your information"
        right={
          <TouchableOpacity onPress={() => setEditing(!editing)}>
            <Text style={[styles.editButton, { color: colors.primary }]}>
              {editing ? 'Done' : 'Edit'}
            </Text>
          </TouchableOpacity>
        }
      />

      {/* Avatar Section */}
      <Card variant="elevated" padding="lg" style={styles.avatarCard}>
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>
              {profile.displayName[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={[styles.displayName, { color: colors.textPrimary }]}>
              {profile.displayName}
            </Text>
            <Text style={[styles.email, { color: colors.textSecondary }]}>
              {profile.email}
            </Text>
            <Badge label="Pro Member" variant="success" size="sm" />
          </View>
        </View>
      </Card>

      {/* Personal Information */}
      <SectionHeader title="Personal Information" />
      
      <Card padding="none">
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            Display Name
          </Text>
          {editing ? (
            <TextInput
              style={[styles.infoInput, { color: colors.textPrimary, borderColor: colors.border }]}
              value={profile.displayName}
              onChangeText={(v) => setProfile(p => ({ ...p, displayName: v }))}
            />
          ) : (
            <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
              {profile.displayName}
            </Text>
          )}
        </View>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
            Email
          </Text>
          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
            {profile.email}
          </Text>
        </View>
      </Card>

      {/* Fitness Goal */}
      <SectionHeader title="Fitness Goal" />
      
      <Card padding="md">
        <View style={styles.goalsGrid}>
          {GOALS.map((goal) => (
            <TouchableOpacity
              key={goal.id}
              style={[
                styles.goalCard,
                { backgroundColor: colors.surface },
                profile.goal === goal.id && { backgroundColor: colors.primary + '20', borderColor: colors.primary },
              ]}
              onPress={() => setProfile(p => ({ ...p, goal: goal.id }))}
            >
              <Ionicons
                name={getGoalIcon(goal.id)}
                size={24}
                color={profile.goal === goal.id ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.goalLabel,
                  { color: profile.goal === goal.id ? colors.primary : colors.textSecondary },
                ]}
              >
                {goal.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      {/* Experience Level */}
      <SectionHeader title="Fitness Experience" />
      
      <Card padding="none">
        {EXPERIENCE_LEVELS.map((level, index) => (
          <React.Fragment key={level.id}>
            <TouchableOpacity
              style={styles.experienceRow}
              onPress={() => setProfile(p => ({ ...p, experience: level.id }))}
            >
              <View style={styles.experienceInfo}>
                <Text style={[styles.experienceLabel, { color: colors.textPrimary }]}>
                  {level.label}
                </Text>
                <Text style={[styles.experienceDesc, { color: colors.textMuted }]}>
                  {level.description}
                </Text>
              </View>
              {profile.experience === level.id && (
                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
              )}
            </TouchableOpacity>
            {index < EXPERIENCE_LEVELS.length - 1 && (
              <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
            )}
          </React.Fragment>
        ))}
      </Card>

      {/* Preferences */}
      <SectionHeader title="Preferences" />
      
      <Card padding="none">
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.linkInfo}>
            <Ionicons name="globe-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>
              Language
            </Text>
          </View>
          <View style={styles.linkValue}>
            <Text style={[styles.linkValueText, { color: colors.textMuted }]}>
              English
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.linkInfo}>
            <Ionicons name="speedometer-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>
              Units
            </Text>
          </View>
          <View style={styles.linkValue}>
            <Text style={[styles.linkValueText, { color: colors.textMuted }]}>
              Metric
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.linkInfo}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>
              Timezone
            </Text>
          </View>
          <View style={styles.linkValue}>
            <Text style={[styles.linkValueText, { color: colors.textMuted }]}>
              {profile.timezone}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Account Actions */}
      <SectionHeader title="Account" />
      
      <Card padding="none">
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/security')}
        >
          <View style={styles.linkInfo}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>
              Security & Privacy
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/integrations')}
        >
          <View style={styles.linkInfo}>
            <Ionicons name="link-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>
              Connected Accounts
            </Text>
          </View>
          <View style={styles.linkValue}>
            <Badge label="3" variant="info" size="sm" />
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacingNamed.lg,
  },
  headerSpacer: {
    height: 20,
  },
  editButton: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  avatarCard: {
    marginBottom: spacingNamed['2xl'],
  },
  avatarSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.lg,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: fontWeight.bold,
    color: '#FFFFFF',
  },
  avatarInfo: {
    flex: 1,
    gap: spacingNamed.xs,
  },
  displayName: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  email: {
    fontSize: fontSize.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed.lg,
  },
  infoLabel: {
    fontSize: fontSize.sm,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  infoInput: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: spacingNamed.sm,
    paddingVertical: spacingNamed.xs,
    minWidth: 150,
    textAlign: 'right',
  },
  rowDivider: {
    height: 0.5,
    marginLeft: spacingNamed.lg,
  },
  goalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingNamed.md,
  },
  goalCard: {
    width: '30%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacingNamed.sm,
  },
  goalLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed.lg,
  },
  experienceInfo: {
    flex: 1,
  },
  experienceLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  experienceDesc: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed.lg,
  },
  linkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.md,
    flex: 1,
  },
  linkLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  linkValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
  },
  linkValueText: {
    fontSize: fontSize.sm,
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
