/**
 * AIVO Mobile - Daily Plan Screen
 * Shows today's plan items grouped by time of day
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  ScrollScreen,
  AppHeader,
  Card,
  SectionHeader,
  Badge,
  Button,
  LoadingState,
  EmptyState,
  FreshnessIndicator,
  ListHeader,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getHealthClient } from '@/lib/health';

// Types
type PlanItemType = 'meal' | 'workout' | 'hydration' | 'walk' | 'sleep' | 'habit' | 'checkin' | 'custom';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';
type PlanStatus = 'pending' | 'completed' | 'skipped' | 'locked';

interface PlanItem {
  id: string;
  type: PlanItemType;
  title: string;
  description: string;
  timeOfDay: TimeOfDay;
  status: PlanStatus;
  priority: number;
  locked?: boolean;
  skipReason?: string;
  scheduledTime?: string;
  metadata?: Record<string, unknown>;
}

interface PlanGroup {
  title: string;
  timeOfDay: TimeOfDay;
  items: PlanItem[];
}

export default function PlanScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [planGroups, setPlanGroups] = useState<PlanGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Mock data - in production this would come from the API
  useEffect(() => {
    setPlanGroups(getMockPlanGroups());
    setLastSync(Date.now());
    setLoading(false);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => {
      setPlanGroups(getMockPlanGroups());
      setLastSync(Date.now());
      setRefreshing(false);
    }, 1000);
  }, []);

  // Handle item completion
  const handleItemPress = (item: PlanItem) => {
    if (item.locked) return;

    // Toggle completion status
    const newStatus = item.status === 'completed' ? 'pending' : 'completed';
    
    setPlanGroups(prev => prev.map(group => ({
      ...group,
      items: group.items.map(i => 
        i.id === item.id ? { ...i, status: newStatus } : i
      ),
    })));
  };

  // Handle skip with reason
  const handleSkip = (item: PlanItem) => {
    // Show skip reason modal (simplified for now)
    const reason = 'Not feeling it today';
    
    setPlanGroups(prev => prev.map(group => ({
      ...group,
      items: group.items.map(i => 
        i.id === item.id ? { ...i, status: 'skipped', skipReason: reason } : i
      ),
    })));
  };

  // Get icon for item type
  const getItemIcon = (type: PlanItemType): keyof typeof Ionicons.glyphMap => {
    const icons: Record<PlanItemType, keyof typeof Ionicons.glyphMap> = {
      meal: 'restaurant',
      workout: 'fitness',
      hydration: 'water',
      walk: 'walk',
      sleep: 'moon',
      habit: 'checkbox',
      checkin: 'clipboard',
      custom: 'ellipsis-horizontal',
    };
    return icons[type] || 'ellipsis-horizontal';
  };

  // Get color for item type
  const getItemColor = (type: PlanItemType): string => {
    const colorMap: Record<PlanItemType, string> = {
      meal: colors.nutrition,
      workout: colors.workout,
      hydration: colors.hydration,
      walk: colors.activity,
      sleep: colors.sleep,
      habit: colors.primary,
      checkin: colors.info,
      custom: colors.textMuted,
    };
    return colorMap[type] || colors.primary;
  };

  // Get status badge variant
  const getStatusVariant = (status: PlanStatus): 'success' | 'warning' | 'danger' | 'default' => {
    const variants: Record<PlanStatus, 'success' | 'warning' | 'danger' | 'default'> = {
      completed: 'success',
      pending: 'default',
      skipped: 'warning',
      locked: 'default',
    };
    return variants[status] || 'default';
  };

  // Loading state
  if (loading) {
    return (
      <ScrollScreen edges={['top']}>
        <View style={styles.headerSpacer} />
        <LoadingState message="Loading your plan..." fullScreen />
      </ScrollScreen>
    );
  }

  // Calculate summary
  const totalItems = planGroups.reduce((sum, g) => sum + g.items.length, 0);
  const completedItems = planGroups.reduce(
    (sum, g) => sum + g.items.filter(i => i.status === 'completed').length,
    0
  );
  const progress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <ScrollScreen
      edges={['top']}
      contentStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSpacer} />

      {/* Header */}
      <AppHeader
        title="Today's Plan"
        subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        right={
          <TouchableOpacity
            onPress={() => router.push('/settings')}
            style={styles.settingsButton}
          >
            <Ionicons name="settings-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      {/* Sync indicator */}
      {lastSync && (
        <FreshnessIndicator timestamp={lastSync} style={styles.syncIndicator} />
      )}

      {/* Progress Summary */}
      <Card variant="elevated" padding="lg" style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <View>
            <Text style={[styles.progressTitle, { color: colors.textPrimary }]}>
              Daily Progress
            </Text>
            <Text style={[styles.progressSubtitle, { color: colors.textSecondary }]}>
              {completedItems} of {totalItems} tasks completed
            </Text>
          </View>
          <View style={styles.progressCircle}>
            <Text style={[styles.progressPercent, { color: colors.primary }]}>
              {progress}%
            </Text>
          </View>
        </View>
        
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${progress}%`, backgroundColor: colors.primary },
            ]}
          />
        </View>

        <View style={styles.progressActions}>
          <Button
            title="Start Workout"
            onPress={() => router.push('/workouts/dashboard')}
            variant="primary"
            size="md"
            leftIcon={<Ionicons name="play" size={18} color={colors.primaryForeground} />}
          />
          <Button
            title="Log Meal"
            onPress={() => router.push('/meals/meal-camera')}
            variant="secondary"
            size="md"
            leftIcon={<Ionicons name="camera" size={18} color={colors.textPrimary} />}
          />
        </View>
      </Card>

      {/* Plan Items by Time of Day */}
      {planGroups.map((group) => (
        <View key={group.timeOfDay} style={styles.planGroup}>
          <SectionHeader
            title={group.title}
            subtitle={`${group.items.filter(i => i.status === 'completed').length}/${group.items.length}`}
            icon={
              <Ionicons
                name={getTimeOfDayIcon(group.timeOfDay)}
                size={20}
                color={colors.textSecondary}
              />
            }
          />

          {group.items.map((item) => (
            <Card
              key={item.id}
              padding="md"
              onPress={() => handleItemPress(item)}
              disabled={item.locked}
              style={[
                styles.planItem,
                item.status === 'completed' && styles.planItemCompleted,
                item.status === 'skipped' && styles.planItemSkipped,
              ]}
            >
              <View style={styles.planItemContent}>
                {/* Icon */}
                <View
                  style={[
                    styles.planItemIcon,
                    { backgroundColor: getItemColor(item.type) + '20' },
                  ]}
                >
                  <Ionicons
                    name={item.status === 'completed' ? 'checkmark' : getItemIcon(item.type)}
                    size={20}
                    color={getItemColor(item.type)}
                  />
                </View>

                {/* Text */}
                <View style={styles.planItemText}>
                  <View style={styles.planItemTitleRow}>
                    <Text
                      style={[
                        styles.planItemTitle,
                        { color: colors.textPrimary },
                        item.status === 'completed' && styles.completedText,
                        item.status === 'skipped' && styles.skippedText,
                      ]}
                    >
                      {item.title}
                    </Text>
                    {item.status !== 'pending' && (
                      <Badge
                        label={item.status === 'completed' ? 'Done' : 'Skipped'}
                        variant={getStatusVariant(item.status)}
                        size="sm"
                      />
                    )}
                    {item.locked && (
                      <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.planItemDescription,
                      { color: colors.textSecondary },
                      item.status === 'completed' && styles.completedText,
                    ]}
                  >
                    {item.description}
                  </Text>
                  {item.scheduledTime && (
                    <Text style={[styles.planItemTime, { color: colors.textMuted }]}>
                      <Ionicons name="time-outline" size={12} /> {item.scheduledTime}
                    </Text>
                  )}
                </View>

                {/* Action */}
                {!item.locked && item.status === 'pending' && (
                  <View style={styles.planItemActions}>
                    <TouchableOpacity
                      onPress={() => handleSkip(item)}
                      style={styles.skipButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={20} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleItemPress(item)}
                      style={styles.completeButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="checkmark" size={20} color={colors.success} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </Card>
          ))}
        </View>
      ))}

      {/* Empty state */}
      {planGroups.length === 0 && (
        <EmptyState
          icon="calendar-outline"
          title="No tasks for today"
          description="Enjoy your rest day or check your plan settings."
          action={{
            label: 'View Plan Settings',
            onPress: () => router.push('/settings'),
          }}
        />
      )}

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollScreen>
  );
}

function getTimeOfDayIcon(timeOfDay: TimeOfDay): keyof typeof Ionicons.glyphMap {
  const icons: Record<TimeOfDay, keyof typeof Ionicons.glyphMap> = {
    morning: 'sunny',
    afternoon: 'partly-sunny',
    evening: 'moon',
    anytime: 'time',
  };
  return icons[timeOfDay] || 'time';
}

// Mock data
function getMockPlanGroups(): PlanGroup[] {
  return [
    {
      title: 'Morning',
      timeOfDay: 'morning',
      items: [
        {
          id: '1',
          type: 'habit',
          title: 'Morning stretches',
          description: '10-minute stretching routine',
          timeOfDay: 'morning',
          status: 'completed',
          priority: 1,
          scheduledTime: '7:00 AM',
        },
        {
          id: '2',
          type: 'meal',
          title: 'Breakfast',
          description: 'High protein breakfast',
          timeOfDay: 'morning',
          status: 'completed',
          priority: 2,
          scheduledTime: '7:30 AM',
        },
        {
          id: '3',
          type: 'hydration',
          title: 'Morning hydration',
          description: 'Drink 2 glasses of water',
          timeOfDay: 'morning',
          status: 'pending',
          priority: 3,
          scheduledTime: '8:00 AM',
        },
      ],
    },
    {
      title: 'Afternoon',
      timeOfDay: 'afternoon',
      items: [
        {
          id: '4',
          type: 'workout',
          title: 'Strength Training',
          description: 'Upper body workout • 45 min',
          timeOfDay: 'afternoon',
          status: 'pending',
          priority: 1,
          scheduledTime: '12:00 PM',
          metadata: { exerciseCount: 5, estimatedDuration: 45 },
        },
        {
          id: '5',
          type: 'meal',
          title: 'Lunch',
          description: 'Balanced meal with protein',
          timeOfDay: 'afternoon',
          status: 'pending',
          priority: 2,
          scheduledTime: '1:00 PM',
        },
        {
          id: '6',
          type: 'walk',
          title: 'Post-lunch walk',
          description: '15-minute walk after lunch',
          timeOfDay: 'afternoon',
          status: 'pending',
          priority: 3,
          scheduledTime: '2:00 PM',
        },
      ],
    },
    {
      title: 'Evening',
      timeOfDay: 'evening',
      items: [
        {
          id: '7',
          type: 'meal',
          title: 'Dinner',
          description: 'Light dinner before 7 PM',
          timeOfDay: 'evening',
          status: 'pending',
          priority: 1,
          scheduledTime: '6:30 PM',
        },
        {
          id: '8',
          type: 'sleep',
          title: 'Prepare for sleep',
          description: 'Start winding down routine',
          timeOfDay: 'evening',
          status: 'pending',
          priority: 2,
          scheduledTime: '9:00 PM',
        },
      ],
    },
    {
      title: 'Anytime',
      timeOfDay: 'anytime',
      items: [
        {
          id: '9',
          type: 'checkin',
          title: 'Daily check-in',
          description: 'Log how you feel today',
          timeOfDay: 'anytime',
          status: 'pending',
          priority: 1,
        },
        {
          id: '10',
          type: 'hydration',
          title: 'Stay hydrated',
          description: 'Drink 8 glasses of water',
          timeOfDay: 'anytime',
          status: 'pending',
          priority: 2,
        },
      ],
    },
  ];
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacingNamed.lg,
  },
  headerSpacer: {
    height: 20,
  },
  settingsButton: {
    padding: spacingNamed.sm,
  },
  syncIndicator: {
    marginBottom: spacingNamed.lg,
  },
  progressCard: {
    marginBottom: spacingNamed['2xl'],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacingNamed.lg,
  },
  progressTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  progressSubtitle: {
    fontSize: fontSize.sm,
    marginTop: spacingNamed.xs,
  },
  progressCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressPercent: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
  },
  progressBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    marginBottom: spacingNamed.lg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressActions: {
    flexDirection: 'row',
    gap: spacingNamed.md,
  },
  planGroup: {
    marginBottom: spacingNamed['2xl'],
  },
  planItem: {
    marginBottom: spacingNamed.md,
  },
  planItemCompleted: {
    opacity: 0.7,
  },
  planItemSkipped: {
    opacity: 0.5,
  },
  planItemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  planItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  planItemText: {
    flex: 1,
  },
  planItemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
    marginBottom: spacingNamed.xs,
  },
  planItemTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    flex: 1,
  },
  planItemDescription: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  planItemTime: {
    fontSize: fontSize.xs,
    marginTop: spacingNamed.xs,
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  skippedText: {
    textDecorationLine: 'line-through',
  },
  planItemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
    marginLeft: spacingNamed.sm,
  },
  skipButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
