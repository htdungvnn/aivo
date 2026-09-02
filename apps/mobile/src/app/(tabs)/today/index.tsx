/**
 * AIVO Mobile - Today Dashboard
 * Primary Daily Intelligence screen showing readiness, metrics, and actions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import {
  ScrollScreen,
  GreetingHeader,
  Card,
  ScoreRing,
  MetricCard,
  SectionHeader,
  ConfidenceBadge,
  DataSourceBadge,
  FreshnessIndicator,
  TrendIndicator,
  InsightCard,
  Disclaimer,
  Badge,
  PillBadge,
  Button,
  LoadingState,
  ErrorState,
  OfflineBanner,
  ListHeader,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors, spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuthGuard } from '@/contexts/AuthGuardContext';
import { getHealthClient, type ReadinessData, type DailyAction } from '@/lib/health';
import type { HealthApiError } from '@/lib/health';

// Types
type ReadinessLevel = 'low' | 'moderate' | 'good' | 'high';

interface TodayData {
  readiness: ReadinessData | null;
  actions: DailyAction[];
  lastSync: number | null;
}

export default function TodayScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { user } = useAuthGuard();

  const [data, setData] = useState<TodayData>({
    readiness: null,
    actions: [],
    lastSync: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  const healthClient = getHealthClient();

  // Fetch today's data
  const fetchData = useCallback(async () => {
    try {
      setError(null);
      
      // Try to fetch from API
      const [intelligence, actions] = await Promise.all([
        healthClient.getTodayIntelligence().catch(() => null),
        healthClient.getTodayActions().catch(() => ({ actions: [] })),
      ]);

      if (intelligence) {
        setData({
          readiness: intelligence.readiness,
          actions: intelligence.actions || [],
          lastSync: Date.now(),
        });
        setIsOffline(false);
      } else {
        // Use mock data for development
        setData({
          readiness: getMockReadiness(),
          actions: getMockActions(),
          lastSync: Date.now(),
        });
      }
    } catch (err) {
      const apiError = err as HealthApiError;
      if (apiError.statusCode === 401) {
        // Redirect to login
        router.push('/(auth)/login');
        return;
      }
      setError(apiError.message || 'Failed to load data');
      
      // Use mock data on error
      setData({
        readiness: getMockReadiness(),
        actions: getMockActions(),
        lastSync: Date.now(),
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [healthClient]);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pull to refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Handle action press
  const handleActionPress = (action: DailyAction) => {
    switch (action.type) {
      case 'workout':
      case 'start_workout':
      case 'light_workout':
        router.push('/workouts/dashboard');
        break;
      case 'meal':
      case 'add_protein':
        router.push('/meals/nutrition');
        break;
      case 'drink_water':
      case 'hydration':
        router.push('/health/hydration');
        break;
      case 'complete_checkin':
        router.push('/health');
        break;
      case 'short_walk':
      case 'activity':
        router.push('/health/activity');
        break;
      case 'sleep':
      case 'prepare_sleep':
        router.push('/health/sleep');
        break;
      default:
        // Handle generic action
        console.log('Action pressed:', action.type);
    }
  };

  // Loading state
  if (loading) {
    return (
      <ScrollScreen edges={['top']}>
        <View style={styles.headerSpacer} />
        <LoadingState message="Loading your daily intelligence..." fullScreen />
      </ScrollScreen>
    );
  }

  // Error state (non-blocking)
  const readiness = data.readiness;
  const levelColor = getLevelColor(readiness?.level || 'moderate');

  return (
    <ScrollScreen
      edges={['top']}
      contentStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.headerSpacer} />
      
      {/* Offline Banner */}
      {isOffline && (
        <OfflineBanner onRetry={onRefresh} style={styles.offlineBanner} />
      )}

      {/* Greeting */}
      <GreetingHeader
        name={user?.displayName || 'there'}
        date={new Date()}
        right={
          <TouchableOpacity
            onPress={() => router.push('/notifications')}
            style={styles.notificationButton}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            <View style={[styles.notificationDot, { backgroundColor: colors.danger }]} />
          </TouchableOpacity>
        }
      />

      {/* Sync indicator */}
      {data.lastSync && (
        <FreshnessIndicator
          timestamp={data.lastSync}
          style={styles.syncIndicator}
        />
      )}

      {/* Readiness Score Card */}
      <Card variant="elevated" padding="lg" style={styles.readinessCard}>
        <View style={styles.readinessHeader}>
          <View>
            <Text style={[styles.readinessTitle, { color: colors.textPrimary }]}>
              Today's Readiness
            </Text>
            <Text style={[styles.readinessSubtitle, { color: colors.textSecondary }]}>
              Your estimated wellness level
            </Text>
          </View>
          <ConfidenceBadge confidence={readiness?.confidence || 0.8} />
        </View>

        <View style={styles.readinessContent}>
          <ScoreRing
            score={readiness?.score || 0}
            size={140}
            strokeWidth={12}
            level={readiness?.level as ReadinessLevel}
            colorKey="readiness"
            label={readiness?.level}
          />

          <View style={styles.readinessInfo}>
            {/* Recommendation badge */}
            <Badge
              label={getRecommendationLabel(readiness?.recommendation?.action)}
              variant={getRecommendationVariant(readiness?.recommendation?.action)}
              size="md"
            />

            {/* Recommendation text */}
            <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
              {getRecommendationText(readiness?.recommendation?.action)}
            </Text>

            {/* Data quality */}
            <View style={styles.dataQualityRow}>
              <Text style={[styles.dataQualityLabel, { color: colors.textMuted }]}>
                Data quality
              </Text>
              <View style={styles.dataQualityBar}>
                <View
                  style={[
                    styles.dataQualityFill,
                    {
                      width: `${(readiness?.dataCompleteness || 0) * 100}%`,
                      backgroundColor: colors.info,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dataQualityValue, { color: colors.textSecondary }]}>
                {Math.round((readiness?.dataCompleteness || 0) * 100)}%
              </Text>
            </View>
          </View>
        </View>

        {/* Top factors */}
        {readiness?.factors && readiness.factors.length > 0 && (
          <View style={styles.factorsSection}>
            <ListHeader title="Top Factors" />
            <View style={styles.factorsList}>
              {/* Top positive factor */}
              {getTopPositiveFactor(readiness.factors) && (
                <View style={styles.factorItem}>
                  <View style={[styles.factorDot, { backgroundColor: colors.success }]} />
                  <Text style={[styles.factorLabel, { color: colors.textSecondary }]}>
                    {getTopPositiveFactor(readiness.factors)?.code}
                  </Text>
                  <Text style={[styles.factorValue, { color: colors.success }]}>
                    +{getTopPositiveFactor(readiness.factors)?.contribution.toFixed(1)}
                  </Text>
                </View>
              )}
              
              {/* Top limiting factor */}
              {getTopLimitingFactor(readiness.factors) && (
                <View style={styles.factorItem}>
                  <View style={[styles.factorDot, { backgroundColor: colors.warning }]} />
                  <Text style={[styles.factorLabel, { color: colors.textSecondary }]}>
                    {getTopLimitingFactor(readiness.factors)?.code}
                  </Text>
                  <Text style={[styles.factorValue, { color: colors.warning }]}>
                    {getTopLimitingFactor(readiness.factors)?.contribution > 0 
                      ? `-${Math.abs(getTopLimitingFactor(readiness.factors)?.contribution || 0).toFixed(1)}`
                      : `${(getTopLimitingFactor(readiness.factors)?.contribution || 0).toFixed(1)}`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </Card>

      {/* Next Best Action */}
      {data.actions.length > 0 && (
        <>
          <SectionHeader
            title="Next Best Action"
            action={{
              label: 'See all',
              onPress: () => router.push('/(tabs)/plan'),
            }}
          />
          
          <Card
            padding="md"
            onPress={() => handleActionPress(data.actions[0])}
            style={styles.actionCard}
          >
            <View style={styles.actionContent}>
              <View style={styles.actionIconContainer}>
                <Ionicons
                  name={getActionIcon(data.actions[0]?.type)}
                  size={24}
                  color={getActionIconColor(data.actions[0]?.type)}
                />
              </View>
              <View style={styles.actionTextContainer}>
                <Text style={[styles.actionTitle, { color: colors.textPrimary }]}>
                  {data.actions[0]?.title || 'Get started'}
                </Text>
                <Text style={[styles.actionDescription, { color: colors.textSecondary }]}>
                  {data.actions[0]?.description || 'Complete your first action of the day'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </View>
          </Card>
        </>
      )}

      {/* Today's Summary Cards */}
      <SectionHeader title="Today's Summary" />
      
      <View style={styles.metricsGrid}>
        {/* Calories */}
        <MetricCard
          label="Calories"
          value={1650}
          unit="/ 2200"
          progress={75}
          color={colors.nutrition}
          trend="up"
          trendValue="+150"
          onPress={() => router.push('/meals/nutrition')}
          compact
        />

        {/* Hydration */}
        <MetricCard
          label="Hydration"
          value={1.8}
          unit="L / 2.5L"
          progress={72}
          color={colors.hydration}
          trend="up"
          onPress={() => router.push('/health/hydration')}
          compact
        />

        {/* Sleep */}
        <MetricCard
          label="Sleep"
          value={7.5}
          unit="hrs"
          color={colors.sleep}
          status="positive"
          trend="stable"
          onPress={() => router.push('/health/sleep')}
          compact
        />

        {/* Steps */}
        <MetricCard
          label="Steps"
          value={8420}
          unit="/ 10k"
          progress={84}
          color={colors.activity}
          trend="up"
          trendValue="+1.2k"
          onPress={() => router.push('/health/activity')}
          compact
        />
      </View>

      {/* Habits Summary */}
      <SectionHeader
        title="Today's Habits"
        action={{
          label: 'Manage',
          onPress: () => router.push('/health/habits'),
        }}
      />
      
      <Card padding="md">
        <View style={styles.habitsRow}>
          <View style={styles.habitItem}>
            <View style={[styles.habitDot, { backgroundColor: colors.success }]} />
            <Text style={[styles.habitLabel, { color: colors.textSecondary }]}>
              Morning stretch
            </Text>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
        </View>
        <View style={styles.habitsRow}>
          <View style={styles.habitItem}>
            <View style={[styles.habitDot, { backgroundColor: colors.warning }]} />
            <Text style={[styles.habitLabel, { color: colors.textSecondary }]}>
              Drink water
            </Text>
            <Text style={[styles.habitProgress, { color: colors.textMuted }]}>
              3/8 glasses
            </Text>
          </View>
        </View>
        <View style={styles.habitsRow}>
          <View style={styles.habitItem}>
            <View style={[styles.habitDot, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.habitLabel, { color: colors.textSecondary }]}>
              Evening walk
            </Text>
            <Text style={[styles.habitProgress, { color: colors.textMuted }]}>
              Pending
            </Text>
          </View>
        </View>
      </Card>

      {/* AI Insight */}
      <SectionHeader title="Today's Insight" />
      
      <InsightCard
        title="Great progress this week!"
        description="Your consistency has improved by 23%. Keep up the momentum with today's planned workout."
        type="positive"
        icon={<Ionicons name="sparkles" size={20} color={colors.ai} />}
      />

      {/* Disclaimer */}
      <Disclaimer type="info" style={styles.disclaimer} />

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollScreen>
  );
}

// Helper functions
function getLevelColor(level: ReadinessLevel): string {
  const colors = {
    low: '#EF4444',
    moderate: '#F59E0B',
    good: '#10B981',
    high: '#3B82F6',
  };
  return colors[level] || colors.moderate;
}

function getRecommendationLabel(action?: string): string {
  const labels: Record<string, string> = {
    rest: 'Rest Day',
    recovery: 'Recovery',
    light_training: 'Light Training',
    normal_training: 'Normal Training',
    high_intensity: 'High Intensity',
  };
  return labels[action || ''] || 'Normal Training';
}

function getRecommendationVariant(action?: string): 'success' | 'info' | 'warning' | 'default' {
  const variants: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
    rest: 'info',
    recovery: 'info',
    light_training: 'success',
    normal_training: 'success',
    high_intensity: 'warning',
  };
  return variants[action || ''] || 'success';
}

function getRecommendationText(action?: string): string {
  const texts: Record<string, string> = {
    rest: 'Your body needs recovery. Consider a rest day or very light activity.',
    recovery: 'Light movement can help recovery. Try stretching or a short walk.',
    light_training: "You're ready for a lighter workout today.",
    normal_training: "You're primed for your regular training session.",
    high_intensity: "You're feeling strong! Consider pushing yourself today.",
  };
  return texts[action || ''] || "You're ready for your regular training session.";
}

function getActionIcon(type?: string): keyof typeof Ionicons.glyphMap {
  const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
    workout: 'fitness',
    start_workout: 'play',
    light_workout: 'walk',
    meal: 'restaurant',
    add_protein: 'nutrition',
    drink_water: 'water',
    hydration: 'water',
    complete_checkin: 'clipboard',
    short_walk: 'walk',
    activity: 'footsteps',
    sleep: 'moon',
    prepare_sleep: 'bed',
  };
  return icons[type || ''] || 'checkmark-circle';
}

function getActionIconColor(type?: string, colors?: ReturnType<typeof Colors.light>): string {
  // Note: colors should be passed from component context, not hooks inside helper functions
  const defaultColors = { workout: '#34C759', primary: '#007AFF', activity: '#FF9500', nutrition: '#FF3B30', nutritionSecondary: '#FF9500', hydration: '#00C7BE', info: '#5856D6' };
  const resolvedColors = colors || defaultColors;
  
  const colorMap: Record<string, string> = {
    workout: resolvedColors.workout,
    start_workout: resolvedColors.primary,
    light_workout: resolvedColors.activity,
    meal: resolvedColors.nutrition,
    add_protein: resolvedColors.nutritionSecondary,
    drink_water: resolvedColors.hydration,
    complete_checkin: resolvedColors.info,
  };
  return colorMap[type || ''] || resolvedColors.primary;
}

function getTopPositiveFactor(factors: ReadinessData['factors']): ReadinessFactor | null {
  const positiveFactors = factors.filter(f => f.status === 'positive' && f.contribution > 0);
  if (positiveFactors.length === 0) return null;
  return positiveFactors.sort((a, b) => b.contribution - a.contribution)[0];
}

function getTopLimitingFactor(factors: ReadinessData['factors']): ReadinessFactor | null {
  const limitingFactors = factors.filter(f => f.contribution < 0);
  if (limitingFactors.length === 0) return null;
  return limitingFactors.sort((a, b) => a.contribution - b.contribution)[0];
}

// Mock data for development
function getMockReadiness(): ReadinessData {
  return {
    date: new Date().toISOString().split('T')[0],
    score: 72,
    level: 'good',
    confidence: 0.85,
    dataCompleteness: 0.75,
    factors: [
      { code: 'sleep', score: 85, weight: 0.20, contribution: 7, status: 'positive' },
      { code: 'training_load', score: 70, weight: 0.15, contribution: 3, status: 'positive' },
      { code: 'workout_completion', score: 90, weight: 0.10, contribution: 4, status: 'positive' },
      { code: 'energy', score: 75, weight: 0.10, contribution: 2.5, status: 'positive' },
      { code: 'stress', score: 65, weight: 0.08, contribution: -1.2, status: 'negative' },
      { code: 'resting_hr', score: 80, weight: 0.06, contribution: 1.8, status: 'positive' },
      { code: 'hrv', score: 72, weight: 0.05, contribution: 1.1, status: 'positive' },
      { code: 'steps', score: 60, weight: 0.05, contribution: 0.5, status: 'neutral' },
      { code: 'hydration', score: 55, weight: 0.05, contribution: -0.5, status: 'negative' },
      { code: 'nutrition', score: 70, weight: 0.05, contribution: 1, status: 'positive' },
    ],
    recommendation: {
      action: 'normal_training',
      intensityModifier: 0,
      volumeModifier: 0,
    },
    algorithmVersion: '1.0.0',
    calculatedAt: Date.now(),
  };
}

function getMockActions(): DailyAction[] {
  return [
    {
      id: '1',
      userId: 'user-1',
      date: new Date().toISOString().split('T')[0],
      type: 'start_workout',
      priority: 1,
      title: 'Start Workout',
      description: "You're ready for your regular training session.",
      status: 'pending',
      completedAt: null,
      skippedAt: null,
      skipReason: null,
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: '2',
      userId: 'user-1',
      date: new Date().toISOString().split('T')[0],
      type: 'drink_water',
      priority: 2,
      title: 'Stay Hydrated',
      description: 'Drink water throughout the day.',
      status: 'pending',
      completedAt: null,
      skippedAt: null,
      skipReason: null,
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    {
      id: '3',
      userId: 'user-1',
      date: new Date().toISOString().split('T')[0],
      type: 'complete_checkin',
      priority: 3,
      title: 'Daily Check-in',
      description: 'Log how you feel today.',
      status: 'pending',
      completedAt: null,
      skippedAt: null,
      skipReason: null,
      metadata: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
  ];
}

interface ReadinessFactor {
  code: string;
  score: number;
  weight: number;
  contribution: number;
  status: 'negative' | 'neutral' | 'positive';
  messageKey: string;
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacingNamed.lg,
  },
  headerSpacer: {
    height: 20,
  },
  offlineBanner: {
    marginBottom: spacingNamed.md,
    borderRadius: 8,
  },
  notificationButton: {
    position: 'relative',
    padding: spacingNamed.sm,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncIndicator: {
    marginBottom: spacingNamed.lg,
  },
  readinessCard: {
    marginBottom: spacingNamed['2xl'],
  },
  readinessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacingNamed.lg,
  },
  readinessTitle: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  readinessSubtitle: {
    fontSize: fontSize.sm,
    marginTop: spacingNamed.xs,
  },
  readinessContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readinessInfo: {
    flex: 1,
    marginLeft: spacingNamed.lg,
  },
  recommendationText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginTop: spacingNamed.sm,
    marginBottom: spacingNamed.md,
  },
  dataQualityRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataQualityLabel: {
    fontSize: fontSize.xs,
    width: 70,
  },
  dataQualityBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 2,
    marginHorizontal: spacingNamed.sm,
  },
  dataQualityFill: {
    height: '100%',
    borderRadius: 2,
  },
  dataQualityValue: {
    fontSize: fontSize.xs,
    width: 35,
    textAlign: 'right',
  },
  factorsSection: {
    marginTop: spacingNamed.lg,
    paddingTop: spacingNamed.lg,
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  factorsList: {
    gap: spacingNamed.sm,
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  factorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacingNamed.sm,
  },
  factorLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    textTransform: 'capitalize',
  },
  factorValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  actionCard: {
    marginBottom: spacingNamed['2xl'],
  },
  actionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(34,197,94,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  actionDescription: {
    fontSize: fontSize.sm,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingNamed.md,
    marginBottom: spacingNamed['2xl'],
  },
  habitsRow: {
    paddingVertical: spacingNamed.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  habitItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  habitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacingNamed.sm,
  },
  habitLabel: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  habitProgress: {
    fontSize: fontSize.sm,
  },
  disclaimer: {
    marginTop: spacingNamed['2xl'],
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
