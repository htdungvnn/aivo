/**
 * AIVO Mobile - Workouts Dashboard
 * Workout planning and management
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  Card,
  Button,
  Badge,
  ScrollScreen,
  BackHeader,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function WorkoutsDashboardScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [loading, setLoading] = useState(false);

  const workoutPrograms = [
    {
      id: '1',
      name: 'Strength Training',
      description: 'Build muscle and increase strength',
      sessions: 12,
      duration: '45 min',
      intensity: 'high',
      icon: 'barbell',
      color: '#8B5CF6',
    },
    {
      id: '2',
      name: 'HIIT Cardio',
      description: 'Burn calories with high-intensity intervals',
      sessions: 8,
      duration: '25 min',
      intensity: 'very_high',
      icon: 'flash',
      color: '#EF4444',
    },
    {
      id: '3',
      name: 'Yoga Flow',
      description: 'Improve flexibility and mindfulness',
      sessions: 10,
      duration: '30 min',
      intensity: 'low',
      icon: 'leaf',
      color: '#10B981',
    },
    {
      id: '4',
      name: 'Core Strength',
      description: 'Strengthen your abs and back',
      sessions: 15,
      duration: '20 min',
      intensity: 'medium',
      icon: 'fitness',
      color: '#3B82F6',
    },
  ];

  const recentWorkouts = [
    {
      id: '1',
      name: 'Upper Body Strength',
      date: 'Today',
      duration: '45 min',
      calories: 320,
      completed: true,
    },
    {
      id: '2',
      name: 'Morning Cardio',
      date: 'Yesterday',
      duration: '30 min',
      calories: 280,
      completed: true,
    },
  ];

  return (
    <ScrollScreen edges={['top']}>
      <View style={styles.headerSpacer} />

      <BackHeader
        title="Workouts"
        subtitle="Your training programs"
        right={
          <TouchableOpacity
            onPress={() => router.push('/coach-modal')}
            style={styles.aiButton}
          >
            <Ionicons name="sparkles" size={20} color={colors.ai} />
          </TouchableOpacity>
        }
      />

      {/* Quick Start */}
      <Card variant="elevated" padding="lg" style={styles.quickStartCard}>
        <View style={styles.quickStartContent}>
          <View style={[styles.quickStartIcon, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="play" size={32} color={colors.primary} />
          </View>
          <View style={styles.quickStartText}>
            <Text style={[styles.quickStartTitle, { color: colors.textPrimary }]}>
              Ready to train?
            </Text>
            <Text style={[styles.quickStartSubtitle, { color: colors.textSecondary }]}>
              Start an AI-powered workout session
            </Text>
          </View>
        </View>
        <Button
          title="Start Workout"
          onPress={() => router.push('/coach-modal')}
          variant="primary"
          size="lg"
          fullWidth
          leftIcon={<Ionicons name="fitness" size={20} color={colors.primaryForeground} />}
        />
      </Card>

      {/* Recent Workouts */}
      {recentWorkouts.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Recent Workouts
          </Text>
          <Card padding="md" style={styles.recentCard}>
            {recentWorkouts.map((workout, index) => (
              <View key={workout.id}>
                <View style={styles.recentItem}>
                  <View style={[styles.recentIcon, { backgroundColor: colors.success + '20' }]}>
                    <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  </View>
                  <View style={styles.recentInfo}>
                    <Text style={[styles.recentName, { color: colors.textPrimary }]}>
                      {workout.name}
                    </Text>
                    <Text style={[styles.recentMeta, { color: colors.textMuted }]}>
                      {workout.date} • {workout.duration} • {workout.calories} cal
                    </Text>
                  </View>
                  <TouchableOpacity>
                    <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                </View>
                {index < recentWorkouts.length - 1 && (
                  <View style={[styles.divider, { backgroundColor: colors.border }]} />
                )}
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Workout Programs */}
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        Training Programs
      </Text>

      {workoutPrograms.map((program) => (
        <Card
          key={program.id}
          padding="lg"
          style={styles.programCard}
          onPress={() => {
            // Navigate to program details
          }}
        >
          <View style={styles.programHeader}>
            <View style={[styles.programIcon, { backgroundColor: program.color + '20' }]}>
              <Ionicons
                name={program.icon as keyof typeof Ionicons.glyphMap}
                size={24}
                color={program.color}
              />
            </View>
            <View style={styles.programInfo}>
              <Text style={[styles.programName, { color: colors.textPrimary }]}>
                {program.name}
              </Text>
              <Text style={[styles.programDescription, { color: colors.textSecondary }]}>
                {program.description}
              </Text>
            </View>
          </View>

          <View style={styles.programMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {program.sessions} sessions
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={[styles.metaText, { color: colors.textMuted }]}>
                {program.duration}
              </Text>
            </View>
            <Badge
              label={program.intensity.replace('_', ' ')}
              variant={program.intensity === 'low' ? 'success' : program.intensity === 'high' || program.intensity === 'very_high' ? 'warning' : 'default'}
              size="sm"
            />
          </View>
        </Card>
      ))}

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  headerSpacer: {
    height: 20,
  },
  aiButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartCard: {
    marginBottom: spacingNamed['2xl'],
  },
  quickStartContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingNamed.lg,
  },
  quickStartIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  quickStartText: {
    flex: 1,
  },
  quickStartTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.semibold,
  },
  quickStartSubtitle: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
    marginBottom: spacingNamed.md,
    marginTop: spacingNamed.lg,
  },
  recentCard: {
    marginBottom: spacingNamed.lg,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNamed.sm,
  },
  recentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  divider: {
    height: 0.5,
    marginVertical: spacingNamed.sm,
  },
  programCard: {
    marginBottom: spacingNamed.md,
  },
  programHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingNamed.md,
  },
  programIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  programInfo: {
    flex: 1,
  },
  programName: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  programDescription: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  programMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.xs,
  },
  metaText: {
    fontSize: fontSize.sm,
  },
  bottomPadding: {
    height: 100,
  },
});
