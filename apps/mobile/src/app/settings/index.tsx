/**
 * AIVO Mobile - Settings Screen
 * App preferences, appearance, notifications, and accessibility
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/ui';

import {
  ScrollScreen,
  BackHeader,
  Card,
  SectionHeader,
  ListHeader,
  Badge,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthGuard } from '@/contexts/AuthGuardContext';

interface ToggleOption {
  id: string;
  label: string;
  description?: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { logout } = useAuthGuard();

  // Settings state
  const [settings, setSettings] = useState({
    // Appearance
    darkMode: colorScheme === 'dark',
    dynamicColors: true,
    
    // Notifications
    dailyReminder: true,
    workoutReminder: true,
    nutritionReminder: false,
    weeklyReport: true,
    marketingEmails: false,
    
    // AI Preferences
    aiInsights: true,
    aiMealAnalysis: true,
    aiPlanSuggestions: true,
    cameraCoachVoice: true,
    aiExplanations: 'detailed' as 'minimal' | 'detailed' | 'none',
    
    // Accessibility
    reducedMotion: false,
    largerText: false,
    highContrast: false,
    hapticFeedback: true,
    soundEffects: true,
    
    // Privacy
    analytics: true,
    crashReports: true,
  });

  const updateSetting = <K extends keyof typeof settings>(
    key: K,
    value: typeof settings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleLogout = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const ToggleRow = ({ option }: { option: ToggleOption }) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleInfo}>
        <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>
          {option.label}
        </Text>
        {option.description && (
          <Text style={[styles.toggleDescription, { color: colors.textMuted }]}>
            {option.description}
          </Text>
        )}
      </View>
      <Switch
        value={option.value}
        onValueChange={option.onToggle}
        trackColor={{ false: colors.surfaceMuted, true: colors.primary + '80' }}
        thumbColor={option.value ? colors.primary : colors.textMuted}
      />
    </View>
  );

  return (
    <ScrollScreen
      edges={['top']}
      contentStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSpacer} />

      <BackHeader
        title="Settings"
        subtitle="Customize your experience"
      />

      {/* Appearance */}
      <SectionHeader title="Appearance" />
      
      <Card padding="none">
        <ToggleRow
          option={{
            id: 'darkMode',
            label: 'Dark Mode',
            description: 'Use dark theme throughout the app',
            value: settings.darkMode,
            onToggle: (v) => updateSetting('darkMode', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'dynamicColors',
            label: 'Dynamic Colors',
            description: 'Match your device\'s color scheme',
            value: settings.dynamicColors,
            onToggle: (v) => updateSetting('dynamicColors', v),
          }}
        />
      </Card>

      {/* Notifications */}
      <SectionHeader title="Notifications" />
      
      <Card padding="none">
        <ToggleRow
          option={{
            id: 'dailyReminder',
            label: 'Daily Reminder',
            description: 'Get reminded to check in daily',
            value: settings.dailyReminder,
            onToggle: (v) => updateSetting('dailyReminder', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'workoutReminder',
            label: 'Workout Reminders',
            value: settings.workoutReminder,
            onToggle: (v) => updateSetting('workoutReminder', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'nutritionReminder',
            label: 'Meal Reminders',
            value: settings.nutritionReminder,
            onToggle: (v) => updateSetting('nutritionReminder', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'weeklyReport',
            label: 'Weekly Health Report',
            value: settings.weeklyReport,
            onToggle: (v) => updateSetting('weeklyReport', v),
          }}
        />
      </Card>

      {/* AI Preferences */}
      <SectionHeader title="AI Preferences" />
      
      <Card padding="none">
        <ToggleRow
          option={{
            id: 'aiInsights',
            label: 'AI Insights',
            description: 'Receive personalized health insights',
            value: settings.aiInsights,
            onToggle: (v) => updateSetting('aiInsights', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'aiMealAnalysis',
            label: 'AI Meal Analysis',
            description: 'Use AI to analyze your meals',
            value: settings.aiMealAnalysis,
            onToggle: (v) => updateSetting('aiMealAnalysis', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'aiPlanSuggestions',
            label: 'AI Plan Suggestions',
            value: settings.aiPlanSuggestions,
            onToggle: (v) => updateSetting('aiPlanSuggestions', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'cameraCoachVoice',
            label: 'Camera Coach Voice',
            description: 'Enable voice feedback during workouts',
            value: settings.cameraCoachVoice,
            onToggle: (v) => updateSetting('cameraCoachVoice', v),
          }}
        />
      </Card>

      {/* Accessibility */}
      <SectionHeader title="Accessibility" />
      
      <Card padding="none">
        <ToggleRow
          option={{
            id: 'reducedMotion',
            label: 'Reduced Motion',
            description: 'Minimize animations',
            value: settings.reducedMotion,
            onToggle: (v) => updateSetting('reducedMotion', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'largerText',
            label: 'Larger Text',
            value: settings.largerText,
            onToggle: (v) => updateSetting('largerText', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'highContrast',
            label: 'High Contrast',
            value: settings.highContrast,
            onToggle: (v) => updateSetting('highContrast', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'hapticFeedback',
            label: 'Haptic Feedback',
            value: settings.hapticFeedback,
            onToggle: (v) => updateSetting('hapticFeedback', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'soundEffects',
            label: 'Sound Effects',
            value: settings.soundEffects,
            onToggle: (v) => updateSetting('soundEffects', v),
          }}
        />
      </Card>

      {/* Privacy */}
      <SectionHeader title="Privacy & Data" />
      
      <Card padding="none">
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/privacy')}
        >
          <View style={styles.linkInfo}>
            <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>
              Privacy Policy
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/data')}
        >
          <View style={styles.linkInfo}>
            <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>
              Data & Export
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'analytics',
            label: 'Usage Analytics',
            value: settings.analytics,
            onToggle: (v) => updateSetting('analytics', v),
          }}
        />
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <ToggleRow
          option={{
            id: 'crashReports',
            label: 'Crash Reports',
            value: settings.crashReports,
            onToggle: (v) => updateSetting('crashReports', v),
          }}
        />
      </Card>

      {/* About */}
      <SectionHeader title="About" />
      
      <Card padding="none">
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => {}}
        >
          <View style={styles.linkInfo}>
            <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>
              Version
            </Text>
          </View>
          <Text style={[styles.linkValue, { color: colors.textMuted }]}>
            1.0.0 (1)
          </Text>
        </TouchableOpacity>
        <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => router.push('/licenses')}
        >
          <View style={styles.linkInfo}>
            <Text style={[styles.linkLabel, { color: colors.textPrimary }]}>
              Open Source Licenses
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </Card>

      {/* Sign Out */}
      <TouchableOpacity
        style={[styles.signOutButton, { backgroundColor: colors.danger + '15' }]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={20} color={colors.danger} />
        <Text style={[styles.signOutText, { color: colors.danger }]}>
          Sign Out
        </Text>
      </TouchableOpacity>

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
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed.lg,
  },
  toggleInfo: {
    flex: 1,
    marginRight: spacingNamed.md,
  },
  toggleLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  toggleDescription: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  rowDivider: {
    height: 0.5,
    marginLeft: spacingNamed.lg,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNamed.md,
    paddingHorizontal: spacingNamed.lg,
  },
  linkInfo: {
    flex: 1,
  },
  linkLabel: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  linkValue: {
    fontSize: fontSize.sm,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacingNamed.md,
    borderRadius: 12,
    marginTop: spacingNamed['2xl'],
    gap: spacingNamed.sm,
  },
  signOutText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
