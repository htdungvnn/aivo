/**
 * AIVO Mobile - Progress Tab Screen
 * Analytics and trends across all health metrics
 */

import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';

import {
  ScrollScreen,
  AppHeader,
  Card,
  SectionHeader,
  MetricCard,
  TabHeader,
  Badge,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - spacingNamed.lg * 4;
const CHART_HEIGHT = 160;

type TimeRange = '7d' | '30d' | '90d';
type MetricCategory = 'readiness' | 'sleep' | 'nutrition' | 'workouts' | 'activity';

export default function ProgressScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [activeCategory, setActiveCategory] = useState<MetricCategory>('readiness');

  const categories: { key: MetricCategory; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'readiness', label: 'Readiness', icon: 'pulse' },
    { key: 'sleep', label: 'Sleep', icon: 'moon' },
    { key: 'nutrition', label: 'Nutrition', icon: 'restaurant' },
    { key: 'workouts', label: 'Workouts', icon: 'fitness' },
    { key: 'activity', label: 'Activity', icon: 'walk' },
  ];

  // Generate mock chart data
  const generateChartData = (trend: 'up' | 'down' | 'stable') => {
    const points = [];
    let value = 50;
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

    for (let i = 0; i < days; i++) {
      if (trend === 'up') {
        value += Math.random() * 5;
      } else if (trend === 'down') {
        value -= Math.random() * 5;
      } else {
        value += (Math.random() - 0.5) * 10;
      }
      value = Math.max(20, Math.min(100, value));
      points.push({
        x: (i / (days - 1)) * CHART_WIDTH,
        y: CHART_HEIGHT - ((value - 20) / 80) * CHART_HEIGHT,
        value: Math.round(value),
      });
    }
    return points;
  };

  // Mock data
  const readinessData = generateChartData('up');
  const sleepData = generateChartData('stable');
  const nutritionData = generateChartData('down');
  const workoutData = generateChartData('up');
  const activityData = generateChartData('stable');

  const getChartData = () => {
    switch (activeCategory) {
      case 'readiness': return readinessData;
      case 'sleep': return sleepData;
      case 'nutrition': return nutritionData;
      case 'workouts': return workoutData;
      case 'activity': return activityData;
      default: return readinessData;
    }
  };

  const getChartColor = () => {
    const colorMap: Record<MetricCategory, string> = {
      readiness: colors.readiness,
      sleep: colors.sleep,
      nutrition: colors.nutrition,
      workouts: colors.workout,
      activity: colors.activity,
    };
    return colorMap[activeCategory];
  };

  // Simple line chart component
  const SimpleLineChart = ({ data, color, height = CHART_HEIGHT }: { data: { x: number; y: number; value: number }[]; color: string; height?: number }) => {
    if (data.length < 2) return null;

    const pathData = data.reduce((acc, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${acc} L ${point.x} ${point.y}`;
    }, '');

    return (
      <Svg width={CHART_WIDTH} height={height}>
        {/* Grid lines */}
        <Line x1={0} y1={height * 0.25} x2={CHART_WIDTH} y2={height * 0.25} stroke={colors.border} strokeWidth={0.5} />
        <Line x1={0} y1={height * 0.5} x2={CHART_WIDTH} y2={height * 0.5} stroke={colors.border} strokeWidth={0.5} />
        <Line x1={0} y1={height * 0.75} x2={CHART_WIDTH} y2={height * 0.75} stroke={colors.border} strokeWidth={0.5} />
        
        {/* Line */}
        <Path d={pathData} stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        
        {/* Data points */}
        {data.filter((_, i) => i % Math.ceil(data.length / 5) === 0 || i === data.length - 1).map((point, i) => (
          <Circle key={i} cx={point.x} cy={point.y} r={3} fill={color} />
        ))}
      </Svg>
    );
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
        title="Progress"
        subtitle="Your health trends"
        right={
          <TouchableOpacity
            onPress={() => router.push('/reports')}
            style={styles.reportsButton}
          >
            <Ionicons name="document-text-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        }
      />

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        {(['7d', '30d', '90d'] as TimeRange[]).map((range) => (
          <TouchableOpacity
            key={range}
            onPress={() => setTimeRange(range)}
            style={[
              styles.timeRangeButton,
              timeRange === range && { backgroundColor: colors.primary },
            ]}
          >
            <Text
              style={[
                styles.timeRangeText,
                { color: colors.textSecondary },
                timeRange === range && { color: colors.primaryForeground },
              ]}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Category Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <View style={styles.categoryTabs}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              onPress={() => setActiveCategory(cat.key)}
              style={[
                styles.categoryTab,
                activeCategory === cat.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
              ]}
            >
              <Ionicons
                name={activeCategory === cat.key ? cat.icon : `${cat.icon}-outline`}
                size={20}
                color={activeCategory === cat.key ? colors.primary : colors.textSecondary}
              />
              <Text
                style={[
                  styles.categoryLabel,
                  { color: activeCategory === cat.key ? colors.primary : colors.textSecondary },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Chart Card */}
      <Card variant="elevated" padding="lg" style={styles.chartCard}>
        <View style={styles.chartHeader}>
          <View>
            <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
              {categories.find(c => c.key === activeCategory)?.label} Trend
            </Text>
            <View style={styles.chartStats}>
              <Text style={[styles.chartValue, { color: getChartColor() }]}>
                {getChartData()[getChartData().length - 1]?.value || 0}
              </Text>
              <Badge
                label="+12%"
                variant="success"
                size="sm"
              />
            </View>
          </View>
          <View style={styles.chartLegend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getChartColor() }]} />
              <Text style={[styles.legendText, { color: colors.textSecondary }]}>
                {activeCategory === 'readiness' ? 'Score' : 'Hours / %'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <SimpleLineChart data={getChartData()} color={getChartColor()} />
        </View>

        <View style={styles.chartFooter}>
          <Text style={[styles.chartFooterText, { color: colors.textMuted }]}>
            {timeRange === '7d' ? 'Last 7 days' : timeRange === '30d' ? 'Last 30 days' : 'Last 90 days'}
          </Text>
        </View>
      </Card>

      {/* Summary Stats */}
      <SectionHeader title="Summary" />

      <View style={styles.statsGrid}>
        <MetricCard
          label="Average Score"
          value={Math.round(getChartData().reduce((a, b) => a + b.value, 0) / getChartData().length)}
          unit={activeCategory === 'readiness' ? '' : activeCategory === 'sleep' ? 'hrs' : '%'}
          trend="up"
          trendValue="+5"
          color={getChartColor()}
          onPress={() => router.push(`/health/${activeCategory}`)}
          compact
        />
        <MetricCard
          label="Best Day"
          value={Math.max(...getChartData().map(d => d.value))}
          unit={activeCategory === 'readiness' ? '' : activeCategory === 'sleep' ? 'hrs' : '%'}
          status="positive"
          color={colors.success}
          compact
        />
        <MetricCard
          label="Trend"
          value={activeCategory === 'readiness' || activeCategory === 'workouts' ? 'Improving' : 'Stable'}
          status="positive"
          color={colors.success}
          compact
        />
        <MetricCard
          label="Consistency"
          value={timeRange === '7d' ? '86' : timeRange === '30d' ? '78' : '82'}
          unit="%"
          trend="stable"
          color={colors.info}
          compact
        />
      </View>

      {/* Weekly Comparison */}
      <SectionHeader title="Weekly Comparison" />

      <Card padding="md">
        <View style={styles.comparisonRow}>
          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
              This Week
            </Text>
            <Text style={[styles.comparisonValue, { color: colors.textPrimary }]}>
              {Math.round(getChartData().slice(-7).reduce((a, b) => a + b.value, 0) / 7)}
            </Text>
          </View>
          <View style={styles.comparisonDivider} />
          <View style={styles.comparisonItem}>
            <Text style={[styles.comparisonLabel, { color: colors.textSecondary }]}>
              Last Week
            </Text>
            <Text style={[styles.comparisonValue, { color: colors.textMuted }]}>
              {Math.round(getChartData().slice(-14, -7).reduce((a, b) => a + b.value, 0) / 7)}
            </Text>
          </View>
          <View style={styles.comparisonChange}>
            <Badge label="+8%" variant="success" size="sm" />
          </View>
        </View>
      </Card>

      {/* Goals Progress */}
      <SectionHeader
        title="Goal Progress"
        action={{
          label: 'Edit goals',
          onPress: () => router.push('/profile'),
        }}
      />

      <Card padding="md">
        <View style={styles.goalItem}>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalLabel, { color: colors.textPrimary }]}>
              Weekly workouts
            </Text>
            <Text style={[styles.goalValue, { color: colors.textSecondary }]}>
              4/5
            </Text>
          </View>
          <View style={styles.goalBar}>
            <View style={[styles.goalFill, { width: '80%', backgroundColor: colors.primary }]} />
          </View>
        </View>

        <View style={styles.goalItem}>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalLabel, { color: colors.textPrimary }]}>
              Daily protein goal
            </Text>
            <Text style={[styles.goalValue, { color: colors.textSecondary }]}>
              142g/150g
            </Text>
          </View>
          <View style={styles.goalBar}>
            <View style={[styles.goalFill, { width: '95%', backgroundColor: colors.nutritionSecondary }]} />
          </View>
        </View>

        <View style={styles.goalItem}>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalLabel, { color: colors.textPrimary }]}>
              Sleep quality
            </Text>
            <Text style={[styles.goalValue, { color: colors.textSecondary }]}>
              82%
            </Text>
          </View>
          <View style={styles.goalBar}>
            <View style={[styles.goalFill, { width: '82%', backgroundColor: colors.sleep }]} />
          </View>
        </View>
      </Card>

      {/* Insights */}
      <SectionHeader title="Insights" />

      <Card variant="accent" padding="md">
        <View style={styles.insightRow}>
          <View style={[styles.insightIcon, { backgroundColor: colors.success + '20' }]}>
            <Ionicons name="trending-up" size={20} color={colors.success} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
              Great improvement!
            </Text>
            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
              Your readiness score is 12% higher than last month.
            </Text>
          </View>
        </View>
      </Card>

      <Card padding="md" style={styles.insightCard2}>
        <View style={styles.insightRow}>
          <View style={[styles.insightIcon, { backgroundColor: colors.warning + '20' }]}>
            <Ionicons name="alert-circle" size={20} color={colors.warning} />
          </View>
          <View style={styles.insightContent}>
            <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
              Sleep consistency
            </Text>
            <Text style={[styles.insightText, { color: colors.textSecondary }]}>
              Your bedtime varies by 45 minutes. Try to sleep at the same time.
            </Text>
          </View>
        </View>
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
  reportsButton: {
    padding: spacingNamed.sm,
  },
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 8,
    padding: 4,
    marginBottom: spacingNamed.lg,
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: spacingNamed.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  timeRangeText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  categoryScroll: {
    marginBottom: spacingNamed.lg,
    marginHorizontal: -spacingNamed.lg,
    paddingHorizontal: spacingNamed.lg,
  },
  categoryTabs: {
    flexDirection: 'row',
    gap: spacingNamed.lg,
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.xs,
    paddingVertical: spacingNamed.sm,
    paddingHorizontal: spacingNamed.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  categoryLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  chartCard: {
    marginBottom: spacingNamed['2xl'],
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacingNamed.lg,
  },
  chartTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.semibold,
  },
  chartStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
    marginTop: spacingNamed.xs,
  },
  chartValue: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  chartLegend: {},
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: fontSize.xs,
  },
  chartContainer: {
    alignItems: 'center',
    marginVertical: spacingNamed.md,
  },
  chartFooter: {
    alignItems: 'center',
  },
  chartFooterText: {
    fontSize: fontSize.xs,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingNamed.md,
    marginBottom: spacingNamed['2xl'],
  },
  comparisonRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  comparisonItem: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: fontSize.xs,
    marginBottom: spacingNamed.xs,
  },
  comparisonValue: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  comparisonDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: spacingNamed.lg,
  },
  comparisonChange: {
    marginLeft: spacingNamed.md,
  },
  goalItem: {
    marginBottom: spacingNamed.lg,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacingNamed.sm,
  },
  goalLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  goalValue: {
    fontSize: fontSize.sm,
  },
  goalBar: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: 4,
  },
  insightRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    marginBottom: spacingNamed.xs,
  },
  insightText: {
    fontSize: fontSize.sm,
    lineHeight: 18,
  },
  insightCard2: {
    marginTop: spacingNamed.md,
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
