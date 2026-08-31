/**
 * AIVO Mobile - Metric Card Component
 * Displays individual health metrics with trend indicators
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';

import { Colors, spacingNamed, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Card } from './Card';
import { ProgressRing } from './ScoreRing';

type MetricTrend = 'up' | 'down' | 'stable' | 'neutral';
type MetricStatus = 'positive' | 'negative' | 'warning' | 'info' | 'neutral';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: MetricTrend;
  trendValue?: string;
  status?: MetricStatus;
  color?: string;
  icon?: ReactNode;
  progress?: number; // 0-100 for progress ring
  onPress?: () => void;
  style?: ViewStyle;
  compact?: boolean;
}

const trendColors: Record<MetricTrend, string> = {
  up: '#22C55E',
  down: '#EF4444',
  stable: '#6B7280',
  neutral: '#9CA3AF',
};

const statusColors: Record<MetricStatus, string> = {
  positive: '#22C55E',
  negative: '#EF4444',
  warning: '#F59E0B',
  info: '#3B82F6',
  neutral: '#6B7280',
};

export function MetricCard({
  label,
  value,
  unit,
  trend,
  trendValue,
  status = 'neutral',
  color,
  icon,
  progress,
  onPress,
  style,
  compact = false,
}: MetricCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const metricColor = color || statusColors[status];
  const trendColor = trend ? trendColors[trend] : undefined;

  const renderTrendIcon = () => {
    if (!trend || trend === 'neutral' || trend === 'stable') return null;

    const iconName = trend === 'up' ? 'arrow-up' : 'arrow-down';
    return (
      <View style={styles.trendContainer}>
        <Text style={[styles.trendIcon, { color: trendColor }]}>
          {trend === 'up' ? '↑' : '↓'}
        </Text>
        {trendValue && (
          <Text style={[styles.trendValue, { color: trendColor }]}>{trendValue}</Text>
        )}
      </View>
    );
  };

  const renderProgressRing = () => {
    if (progress === undefined) return null;

    return (
      <ProgressRing
        progress={progress}
        size={compact ? 40 : 48}
        strokeWidth={compact ? 3 : 4}
        color={metricColor}
        showPercent={!compact}
      />
    );
  };

  const cardContent = (
    <View style={[compact && styles.compactContainer]}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.labelRow}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text
            style={[
              styles.label,
              { color: colors.textSecondary },
              compact && styles.labelCompact,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
        {renderTrendIcon()}
      </View>

      {/* Value row */}
      <View style={styles.valueRow}>
        <View style={styles.valueContainer}>
          <Text
            style={[
              styles.value,
              { color: colors.textPrimary },
              compact && styles.valueCompact,
            ]}
            accessibilityLabel={`${value} ${unit || ''}`}
          >
            {value}
          </Text>
          {unit && (
            <Text
              style={[
                styles.unit,
                { color: colors.textMuted },
                compact && styles.unitCompact,
              ]}
            >
              {unit}
            </Text>
          )}
        </View>

        {/* Progress ring or status indicator */}
        {progress !== undefined ? (
          renderProgressRing()
        ) : (
          <View
            style={[
              styles.statusDot,
              { backgroundColor: metricColor },
            ]}
          />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.7}
        style={style}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value} ${unit || ''}`}
      >
        <Card padding={compact ? 'sm' : 'md'} style={compact && styles.cardCompact}>
          {cardContent}
        </Card>
      </TouchableOpacity>
    );
  }

  return (
    <Card padding={compact ? 'sm' : 'md'} style={[compact && styles.cardCompact, style]}>
      {cardContent}
    </Card>
  );
}

// Compact horizontal metric row
interface MetricRowProps {
  label: string;
  value: string | number;
  unit?: string;
  color?: string;
  style?: ViewStyle;
}

export function MetricRow({
  label,
  value,
  unit,
  color = Colors.dark.primary,
  style,
}: MetricRowProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.metricRow, style]}>
      <View style={[styles.metricDot, { backgroundColor: color }]} />
      <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>
        {label}
      </Text>
      <View style={styles.metricValueContainer}>
        <Text style={[styles.metricValue, { color: colors.textPrimary }]}>
          {value}
        </Text>
        {unit && (
          <Text style={[styles.metricUnit, { color: colors.textMuted }]}>
            {unit}
          </Text>
        )}
      </View>
    </View>
  );
}

// Stacked metrics for comparison
interface MetricStackProps {
  metrics: Array<{
    label: string;
    value: string | number;
    unit?: string;
    color?: string;
  }>;
  style?: ViewStyle;
}

export function MetricStack({ metrics, style }: MetricStackProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.metricStack, style]}>
      {metrics.map((metric, index) => (
        <View key={index} style={styles.metricStackItem}>
          <Text style={[styles.metricStackLabel, { color: colors.textSecondary }]}>
            {metric.label}
          </Text>
          <View style={styles.metricStackValue}>
            <Text style={[styles.metricStackValueText, { color: metric.color || colors.textPrimary }]}>
              {metric.value}
            </Text>
            {metric.unit && (
              <Text style={[styles.metricStackUnit, { color: colors.textMuted }]}>
                {metric.unit}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacingNamed.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  icon: {
    marginRight: spacingNamed.sm,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  labelCompact: {
    fontSize: fontSize.xs,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacingNamed.sm,
  },
  trendIcon: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
  },
  trendValue: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginLeft: 2,
  },
  valueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  value: {
    fontSize: 28,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  valueCompact: {
    fontSize: 20,
  },
  unit: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    marginLeft: spacingNamed.xs,
  },
  unitCompact: {
    fontSize: fontSize.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  compactContainer: {
    minWidth: 100,
  },
  cardCompact: {
    minWidth: 120,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacingNamed.sm,
  },
  metricDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacingNamed.sm,
  },
  metricLabel: {
    flex: 1,
    fontSize: fontSize.sm,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricValue: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  metricUnit: {
    fontSize: fontSize.xs,
    marginLeft: spacingNamed.xs,
  },
  metricStack: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacingNamed.md,
  },
  metricStackItem: {
    flex: 1,
    minWidth: 80,
  },
  metricStackLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
    marginBottom: spacingNamed.xs,
  },
  metricStackValue: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  metricStackValueText: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  metricStackUnit: {
    fontSize: fontSize.xs,
    marginLeft: 2,
  },
});

export default MetricCard;
