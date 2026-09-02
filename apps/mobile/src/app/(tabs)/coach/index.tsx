/**
 * AIVO Mobile - Coach Tab Screen
 * AI-powered workout coaching and fitness guidance
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  ScrollScreen,
  AppHeader,
  Card,
  SectionHeader,
  Button,
  Badge,
  InsightCard,
  PillBadge,
  ListHeader,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface WorkoutSession {
  id: string;
  name: string;
  duration: number;
  exerciseCount: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: string;
  completed: boolean;
  lastPerformed?: string;
}

interface AICoachPrompt {
  id: string;
  prompt: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function CoachScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Mock data
  const todaysWorkout: WorkoutSession = {
    id: 'workout-1',
    name: 'Upper Body Strength',
    duration: 45,
    exerciseCount: 6,
    difficulty: 'intermediate',
    type: 'strength',
    completed: false,
  };

  const recentWorkouts: WorkoutSession[] = [
    {
      id: 'w1',
      name: 'Lower Body',
      duration: 40,
      exerciseCount: 5,
      difficulty: 'intermediate',
      type: 'strength',
      completed: true,
      lastPerformed: 'Yesterday',
    },
    {
      id: 'w2',
      name: 'HIIT Cardio',
      duration: 25,
      exerciseCount: 8,
      difficulty: 'advanced',
      type: 'cardio',
      completed: true,
      lastPerformed: '2 days ago',
    },
    {
      id: 'w3',
      name: 'Full Body',
      duration: 50,
      exerciseCount: 7,
      difficulty: 'intermediate',
      type: 'strength',
      completed: true,
      lastPerformed: '4 days ago',
    },
  ];

  const aiPrompts: AICoachPrompt[] = [
    { id: '1', prompt: 'What should I focus on today?', icon: 'bulb' },
    { id: '2', prompt: 'Why is my readiness lower?', icon: 'trending-down' },
    { id: '3', prompt: 'Help me plan tomorrow', icon: 'calendar' },
    { id: '4', prompt: 'Summarize my week', icon: 'stats-chart' },
    { id: '5', prompt: 'What should I eat for protein?', icon: 'restaurant' },
    { id: '6', prompt: 'Should today\'s workout change?', icon: 'swap-horizontal' },
  ];

  // Get difficulty color
  const getDifficultyColor = (difficulty: string): string => {
    const colorMap: Record<string, string> = {
      beginner: colors.success,
      intermediate: colors.warning,
      advanced: colors.danger,
    };
    return colorMap[difficulty] || colors.textMuted;
  };

  // Get workout type icon
  const getWorkoutIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      strength: 'fitness',
      cardio: 'heart',
      hiit: 'flame',
      flexibility: 'body',
      balance: 'accessibility',
    };
    return icons[type] || 'fitness';
  };

  return (
    <ScrollScreen
      edges={['top']}
      contentStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSpacer} />

      {/* Header */}
      <AppHeader
        title="Coach"
        subtitle="Your AI fitness assistant"
        right={
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/more')}
            style={styles.profileButton}
          >
            <Ionicons name="person-circle" size={32} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Today's Workout Card */}
      <Card variant="elevated" padding="lg" style={styles.workoutCard}>
        <View style={styles.workoutHeader}>
          <View>
            <Text style={[styles.workoutTitle, { color: colors.textPrimary }]}>
              Today's Workout
            </Text>
            <View style={styles.workoutMeta}>
              <Badge
                label={todaysWorkout.difficulty}
                variant={todaysWorkout.difficulty === 'beginner' ? 'success' : todaysWorkout.difficulty === 'intermediate' ? 'warning' : 'danger'}
                size="sm"
              />
              <Text style={[styles.workoutMetaText, { color: colors.textMuted }]}>
                {todaysWorkout.exerciseCount} exercises
              </Text>
              <Text style={[styles.workoutMetaText, { color: colors.textMuted }]}>
                • {todaysWorkout.duration} min
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.workoutInfo}>
          <View style={styles.workoutIconContainer}>
            <Ionicons
              name={getWorkoutIcon(todaysWorkout.type)}
              size={40}
              color={colors.workout}
            />
          </View>
          <View style={styles.workoutDetails}>
            <Text style={[styles.workoutName, { color: colors.textPrimary }]}>
              {todaysWorkout.name}
            </Text>
            <Text style={[styles.workoutDescription, { color: colors.textSecondary }]}>
              {getWorkoutDescription(todaysWorkout.type)}
            </Text>
          </View>
        </View>

        <View style={styles.workoutActions}>
          <Button
            title="Start Workout"
            onPress={() => router.push('/workouts/dashboard')}
            variant="primary"
            size="lg"
            fullWidth
            leftIcon={<Ionicons name="play" size={20} color={colors.primaryForeground} />}
          />
          <View style={styles.secondaryActions}>
            <Button
              title="Camera Coach"
              onPress={() => router.push('/workouts/camera-coach')}
              variant="ai"
              size="md"
              leftIcon={<Ionicons name="camera" size={18} color={colors.aiForeground} />}
            />
            <Button
              title="View Plan"
              onPress={() => router.push('/(tabs)/plan')}
              variant="ghost"
              size="md"
            />
          </View>
        </View>
      </Card>

      {/* AI Coach Prompts */}
      <SectionHeader
        title="Ask AI Coach"
        subtitle="Get personalized guidance"
        icon={<Ionicons name="sparkles" size={20} color={colors.ai} />}
      />

      <View style={styles.promptsGrid}>
        {aiPrompts.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[styles.promptCard, { backgroundColor: colors.surface }]}
            onPress={() => router.push('/coach-modal')}
            activeOpacity={0.7}
          >
            <Ionicons name={item.icon} size={20} color={colors.ai} />
            <Text style={[styles.promptText, { color: colors.textPrimary }]}>
              {item.prompt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Workouts */}
      <SectionHeader
        title="Recent Workouts"
        action={{
          label: 'View all',
          onPress: () => router.push('/workouts/dashboard'),
        }}
      />

      {recentWorkouts.map((workout) => (
        <Card
          key={workout.id}
          padding="md"
          onPress={() => router.push(`/workouts/${workout.id}`)}
          style={styles.recentCard}
        >
          <View style={styles.recentContent}>
            <View
              style={[
                styles.recentIcon,
                { backgroundColor: colors.workout + '20' },
              ]}
            >
              <Ionicons
                name={getWorkoutIcon(workout.type)}
                size={20}
                color={colors.workout}
              />
            </View>
            <View style={styles.recentInfo}>
              <Text style={[styles.recentName, { color: colors.textPrimary }]}>
                {workout.name}
              </Text>
              <Text style={[styles.recentMeta, { color: colors.textSecondary }]}>
                {workout.exerciseCount} exercises • {workout.duration} min
              </Text>
            </View>
            <View style={styles.recentRight}>
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
              <Text style={[styles.recentTime, { color: colors.textMuted }]}>
                {workout.lastPerformed}
              </Text>
            </View>
          </View>
        </Card>
      ))}

      {/* Weekly Summary */}
      <Card variant="elevated" padding="lg" style={styles.summaryCard}>
        <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
          This Week
        </Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              4
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Workouts
            </Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.nutritionSecondary }]}>
              3.5h
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Total Time
            </Text>
          </View>
          <View style={styles.summaryStat}>
            <Text style={[styles.summaryValue, { color: colors.workout }]}>
              85%
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              Completion
            </Text>
          </View>
        </View>
        <View style={styles.streakRow}>
          <Ionicons name="flame" size={20} color={colors.warning} />
          <Text style={[styles.streakText, { color: colors.textPrimary }]}>
            5 day streak! Keep it up!
          </Text>
        </View>
      </Card>

      {/* AI Insight */}
      <InsightCard
        title="Form tip for shoulder press"
        description="Keep your core engaged and avoid arching your back during the press. Focus on controlled movement."
        type="ai"
        icon={<Ionicons name="fitness" size={20} color={colors.workout} />}
      />

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollScreen>
  );
}

function getWorkoutDescription(type: string): string {
  const descriptions: Record<string, string> = {
    strength: 'Build muscle with targeted upper body exercises',
    cardio: 'Improve cardiovascular endurance',
    hiit: 'High-intensity intervals for maximum calorie burn',
    flexibility: 'Improve mobility and prevent injury',
    balance: 'Enhance stability and coordination',
  };
  return descriptions[type] || 'A balanced workout routine';
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacingNamed.lg,
  },
  headerSpacer: {
    height: 20,
  },
  profileButton: {
    padding: spacingNamed.sm,
  },
  workoutCard: {
    marginBottom: spacingNamed['2xl'],
  },
  workoutHeader: {
    marginBottom: spacingNamed.lg,
  },
  workoutTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  workoutMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
    marginTop: spacingNamed.sm,
  },
  workoutMetaText: {
    fontSize: fontSize.sm,
  },
  workoutInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingNamed.lg,
  },
  workoutIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(139,92,246,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.lg,
  },
  workoutDetails: {
    flex: 1,
  },
  workoutName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  workoutDescription: {
    fontSize: fontSize.sm,
    marginTop: spacingNamed.xs,
  },
  workoutActions: {},
  secondaryActions: {
    flexDirection: 'row',
    gap: spacingNamed.md,
    marginTop: spacingNamed.md,
  },
  promptsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingNamed.md,
    marginBottom: spacingNamed['2xl'],
  },
  promptCard: {
    width: '48%',
    padding: spacingNamed.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
  },
  promptText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  recentCard: {
    marginBottom: spacingNamed.md,
  },
  recentContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  recentInfo: {
    flex: 1,
  },
  recentName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
  },
  recentMeta: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentTime: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  summaryCard: {
    marginBottom: spacingNamed['2xl'],
  },
  summaryTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacingNamed.lg,
  },
  summaryStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacingNamed.lg,
  },
  summaryStat: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  summaryLabel: {
    fontSize: fontSize.sm,
    marginTop: spacingNamed.xs,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacingNamed.sm,
    paddingTop: spacingNamed.md,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  streakText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
