/**
 * AIVO Mobile - Readiness Screen
 * Detailed readiness score and factor breakdown
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/ui';

import {
  ScrollScreen,
  BackHeader,
  Card,
  ScoreRing,
  SectionHeader,
  ConfidenceBadge,
  DataSourceBadge,
  FreshnessIndicator,
  TrendIndicator,
  ListHeader,
  LoadingState,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

type ReadinessLevel = 'low' | 'moderate' | 'good' | 'high';

interface ReadinessFactor {
  code: string;
  name: string;
  score: number;
  contribution: number;
  status: 'positive' | 'negative' | 'neutral';
  icon: keyof typeof Ionicons.glyphMap;
}

const FACTOR_CONFIG: Record<string, { name: string; icon: keyof typeof Ionicons.glyphMap }> = {
  sleep: { name: 'Sleep Quality', icon: 'moon' },
  training_load: { name: 'Training Load', icon: 'fitness' },
  workout_completion: { name: 'Workout', icon: 'checkmark-circle' },
  form_quality: { name: 'Form Quality', icon: 'star' },
  muscle_soreness: { name: 'Muscle Soreness', icon: 'alert-circle' },
  energy: { name: 'Energy Level', icon: 'flash' },
  stress: { name: 'Stress Level', icon: 'business' },
  resting_hr: { name: 'Resting Heart Rate', icon: 'heart' },
  hrv: { name: 'Heart Rate Variability', icon: 'pulse' },
  steps: { name: 'Daily Steps', icon: 'walk' },
  hydration: { name: 'Hydration', icon: 'water' },
  nutrition: { name: 'Nutrition', icon: 'restaurant' },
  recovery_days: { name: 'Recovery Days', icon: 'calendar' },
};

export default function ReadinessScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [factors, setFactors] = useState<ReadinessFactor[]>([]);
  const [selectedRange, setSelectedRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Mock data
    setFactors(getMockFactors());
    setLoading(false);
  }, []);

  // Mock readiness data
  const readiness = {
    score: 72,
    level: 'good' as ReadinessLevel,
    confidence: 0.85,
    dataCompleteness: 0.75,
    calculatedAt: Date.now(),
    trend: 'up' as const,
    trendValue: '+5',
  };

  const getLevelColor = (level: ReadinessLevel): string => {
    const colorMap: Record<ReadinessLevel, string> = {
      low: colors.danger,
      moderate: colors.warning,
      good: colors.success,
      high: colors.info,
    };
    return colorMap[level];
  };

  if (loading) {
    return (
      <ScrollScreen edges={['top']}>
        <View style={styles.headerSpacer} />
        <LoadingState message="Loading readiness data..." fullScreen />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen
      edges={['top']}
      contentStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSpacer} />

      {/* Header */}
      <BackHeader
        title="Readiness"
        subtitle="Your estimated wellness level"
      />

      {/* Sync indicator */}
      <FreshnessIndicator timestamp={readiness.calculatedAt} style={styles.syncIndicator} />

      {/* Main Score Card */}
      <Card variant="elevated" padding="xl" style={styles.scoreCard}>
        <View style={styles.scoreContent}>
          <ScoreRing
            score={readiness.score}
            size={160}
            strokeWidth={14}
            level={readiness.level}
            colorKey="readiness"
          />

          <View style={styles.scoreInfo}>
            <View style={styles.scoreMeta}>
              <ConfidenceBadge confidence={readiness.confidence} />
              <DataSourceBadge source="calculated" />
            </View>

            <View style={styles.scoreTrend}>
              <TrendIndicator trend={readiness.trend} value={readiness.trendValue} />
              <Text style={[styles.trendLabel, { color: colors.textMuted }]}>
                vs last week
              </Text>
            </View>

            <View style={styles.dataQuality}>
              <Text style={[styles.dataQualityLabel, { color: colors.textSecondary }]}>
                Data completeness
              </Text>
              <View style={styles.dataQualityBar}>
                <View
                  style={[
                    styles.dataQualityFill,
                    {
                      width: `${readiness.dataCompleteness * 100}%`,
                      backgroundColor: colors.info,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.dataQualityValue, { color: colors.textSecondary }]}>
                {Math.round(readiness.dataCompleteness * 100)}%
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Time Range Selector */}
      <View style={styles.rangeSelector}>
        {(['7d', '30d', '90d'] as const).map((range) => (
          <TouchableOpacity
            key={range}
            onPress={() => setSelectedRange(range)}
            style={[
              styles.rangeButton,
              selectedRange === range && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.rangeText,
                { color: selectedRange === range ? colors.primaryForeground : colors.textSecondary },
              ]}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Factor Breakdown */}
      <SectionHeader
        title="Factor Breakdown"
        subtitle="How each factor affects your score"
      />

      <Card padding="md" style={styles.factorsCard}>
        {factors.map((factor, index) => (
          <View
            key={factor.code}
            style={[
              styles.factorItem,
              index < factors.length - 1 && styles.factorItemBorder,
            ]}
          >
            <View style={styles.factorIcon}>
              <Ionicons
                name={factor.icon}
                size={20}
                color={
                  factor.status === 'positive'
                    ? colors.success
                    : factor.status === 'negative'
                    ? colors.warning
                    : colors.textMuted
                }
              />
            </View>

            <View style={styles.factorInfo}>
              <Text style={[styles.factorName, { color: colors.textPrimary }]}>
                {factor.name}
              </Text>
              <View style={styles.factorBar}>
                <View
                  style={[
                    styles.factorBarFill,
                    {
                      width: `${factor.score}%`,
                      backgroundColor:
                        factor.status === 'positive'
                          ? colors.success
                          : factor.status === 'negative'
                          ? colors.warning
                          : colors.textMuted,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.factorScore}>
              <Text
                style={[
                  styles.factorScoreText,
                  {
                    color:
                      factor.status === 'positive'
                        ? colors.success
                        : factor.status === 'negative'
                        ? colors.warning
                        : colors.textSecondary,
                  },
                ]}
              >
                {factor.score}
              </Text>
              <Text style={[styles.factorContribution, { color: colors.textMuted }]}>
                {factor.contribution > 0 ? '+' : ''}{factor.contribution.toFixed(1)}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Missing Data Section */}
      <SectionHeader title="Data Insights" />

      <Card padding="md" style={styles.insightsCard}>
        <View style={styles.insightItem}>
          <View style={[styles.insightIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
              Great sleep data
            </Text>
            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
              Your sleep tracking is consistent and accurate.
            </Text>
          </View>
        </View>

        <View style={[styles.insightItem, styles.insightItemBorder]}>
          <View style={[styles.insightIcon, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="information-circle" size={20} color={colors.warning} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
              HRV data unavailable
            </Text>
            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
              Connect a fitness device to get more accurate readiness scores.
            </Text>
          </View>
        </View>
      </Card>

      {/* Recommendation */}
      <Card variant="accent" padding="lg" style={styles.recommendationCard}>
        <View style={styles.recommendationHeader}>
          <Ionicons name="bulb" size={24} color={colors.accent} />
          <Text style={[styles.recommendationTitle, { color: colors.textPrimary }]}>
            Today's Recommendation
          </Text>
        </View>
        <Text style={[styles.recommendationText, { color: colors.textSecondary }]}>
          Your readiness is good. You're primed for your regular training session today.
          Focus on maintaining good form over pushing for personal records.
        </Text>
        <View style={styles.recommendationActions}>
          <TouchableOpacity
            style={[styles.recommendationButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/workouts/dashboard')}
          >
            <Text style={[styles.recommendationButtonText, { color: colors.primaryForeground }]}>
              Start Workout
            </Text>
          </TouchableOpacity>
        </View>
      </Card>

      {/* Disclaimer */}
      <View style={[styles.disclaimer, { backgroundColor: colors.info + '10' }]}>
        <Ionicons name="information-circle" size={16} color={colors.info} />
        <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
          AIVO Readiness is an estimated wellness indicator based on available data.
          It does not provide medical advice. Individual results may vary.
        </Text>
      </View>

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollScreen>
  );
}

// Mock data
function getMockFactors(): ReadinessFactor[] {
  return [
    { code: 'sleep', name: 'Sleep Quality', score: 85, contribution: 7, status: 'positive', icon: 'moon' },
    { code: 'training_load', name: 'Training Load', score: 70, contribution: 3, status: 'positive', icon: 'fitness' },
    { code: 'workout_completion', name: 'Workout', score: 90, contribution: 4, status: 'positive', icon: 'checkmark-circle' },
    { code: 'energy', name: 'Energy Level', score: 75, contribution: 2.5, status: 'positive', icon: 'flash' },
    { code: 'stress', name: 'Stress Level', score: 65, contribution: -1.2, status: 'negative', icon: 'business' },
    { code: 'resting_hr', name: 'Resting Heart Rate', score: 80, contribution: 1.8, status: 'positive', icon: 'heart' },
    { code: 'hrv', name: 'Heart Rate Variability', score: 72, contribution: 1.1, status: 'positive', icon: 'pulse' },
    { code: 'steps', name: 'Daily Steps', score: 60, contribution: 0.5, status: 'neutral', icon: 'walk' },
    { code: 'hydration', name: 'Hydration', score: 55, contribution: -0.5, status: 'negative', icon: 'water' },
    { code: 'nutrition', name: 'Nutrition', score: 70, contribution: 1, status: 'positive', icon: 'restaurant' },
  ];
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacingNamed.lg,
  },
  headerSpacer: {
    height: 20,
  },
  syncIndicator: {
    marginBottom: spacingNamed.lg,
  },
  scoreCard: {
    marginBottom: spacingNamed['2xl'],
  },
  scoreContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreInfo: {
    flex: 1,
    marginLeft: spacingNamed.lg,
  },
  scoreMeta: {
    flexDirection: 'row',
    gap: spacingNamed.sm,
    marginBottom: spacingNamed.md,
  },
  scoreTrend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
    marginBottom: spacingNamed.lg,
  },
  trendLabel: {
    fontSize: fontSize.xs,
  },
  dataQuality: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dataQualityLabel: {
    fontSize: fontSize.xs,
    width: 100,
  },
  dataQualityBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    marginHorizontal: spacingNamed.sm,
    overflow: 'hidden',
  },
  dataQualityFill: {
    height: '100%',
    borderRadius: 3,
  },
  dataQualityValue: {
    fontSize: fontSize.xs,
    width: 35,
    textAlign: 'right',
  },
  rangeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 4,
    marginBottom: spacingNamed['2xl'],
  },
  rangeButton: {
    flex: 1,
    paddingVertical: spacingNamed.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  rangeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  factorsCard: {
    marginBottom: spacingNamed['2xl'],
  },
  factorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNamed.md,
  },
  factorItemBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  factorIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  factorInfo: {
    flex: 1,
  },
  factorName: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginBottom: spacingNamed.xs,
  },
  factorBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  factorBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  factorScore: {
    alignItems: 'flex-end',
    marginLeft: spacingNamed.md,
  },
  factorScoreText: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  factorContribution: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  insightsCard: {
    marginBottom: spacingNamed['2xl'],
  },
  insightItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacingNamed.sm,
  },
  insightItemBorder: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.05)',
    marginTop: spacingNamed.sm,
    paddingTop: spacingNamed.lg,
  },
  insightIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    marginBottom: spacingNamed.xs,
  },
  insightText: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  recommendationCard: {
    marginBottom: spacingNamed['2xl'],
  },
  recommendationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
    marginBottom: spacingNamed.md,
  },
  recommendationTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  recommendationText: {
    fontSize: fontSize.sm,
    lineHeight: 20,
    marginBottom: spacingNamed.lg,
  },
  recommendationActions: {
    flexDirection: 'row',
  },
  recommendationButton: {
    paddingVertical: spacingNamed.sm,
    paddingHorizontal: spacingNamed.lg,
    borderRadius: 8,
  },
  recommendationButtonText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacingNamed.md,
    borderRadius: 8,
    gap: spacingNamed.sm,
  },
  disclaimerText: {
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
