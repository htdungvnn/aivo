/**
 * AIVO Mobile - Badge and Indicator Components
 * Status badges, confidence indicators, data source badges, freshness indicators
 */

import React, { ReactNode } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';

import { Colors, spacingNamed, borderRadius, fontSize, fontWeight } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

// =============================================================================
// Status Badge
// =============================================================================

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'ai' | 
                    'sleep' | 'hydration' | 'nutrition' | 'workout' | 'readiness';

interface BadgeProps {
  children?: ReactNode;
  label?: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  default: { bg: 'rgba(255,255,255,0.1)', text: '#9CA3AF' },
  success: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' },
  warning: { bg: 'rgba(245,158,11,0.15)', text: '#F59E0B' },
  danger: { bg: 'rgba(239,68,68,0.15)', text: '#EF4444' },
  info: { bg: 'rgba(59,130,246,0.15)', text: '#3B82F6' },
  ai: { bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6' },
  sleep: { bg: 'rgba(56,189,248,0.15)', text: '#38BDF8' },
  hydration: { bg: 'rgba(34,211,238,0.15)', text: '#22D3EE' },
  nutrition: { bg: 'rgba(34,197,94,0.15)', text: '#22C55E' },
  workout: { bg: 'rgba(139,92,246,0.15)', text: '#8B5CF6' },
  readiness: { bg: 'rgba(16,185,129,0.15)', text: '#10B981' },
};

export function Badge({
  children,
  label,
  variant = 'default',
  size = 'md',
  style,
}: BadgeProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Use semantic colors if dark mode
  const useSemantic = colorScheme === 'dark';
  const variantStyle = variantColors[variant];
  const bgColor = useSemantic ? variantStyle.bg : variantStyle.bg;
  const textColor = variantStyle.text;

  const sizeStyles = {
    sm: { paddingH: 6, paddingV: 2, fontSize: fontSize.xs },
    md: { paddingH: 8, paddingV: 4, fontSize: fontSize.sm },
    lg: { paddingH: 12, paddingV: 6, fontSize: fontSize.base },
  };

  const sizeStyle = sizeStyles[size];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: bgColor,
          paddingHorizontal: sizeStyle.paddingH,
          paddingVertical: sizeStyle.paddingV,
          borderRadius: borderRadius.full,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: textColor, fontSize: sizeStyle.fontSize },
        ]}
      >
        {label || children}
      </Text>
    </View>
  );
}

// Pill badge with icon
interface PillBadgeProps {
  icon?: ReactNode;
  label: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
}

export function PillBadge({ icon, label, variant = 'default', style }: PillBadgeProps) {
  const variantStyle = variantColors[variant];

  return (
    <View
      style={[
        styles.pillBadge,
        { backgroundColor: variantStyle.bg },
        style,
      ]}
    >
      {icon && <View style={styles.pillIcon}>{icon}</View>}
      <Text style={[styles.pillText, { color: variantStyle.text }]}>{label}</Text>
    </View>
  );
}

// =============================================================================
// Confidence Badge
// =============================================================================

interface ConfidenceBadgeProps {
  confidence: number; // 0-1
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function ConfidenceBadge({
  confidence,
  size = 'md',
  style,
}: ConfidenceBadgeProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const percent = Math.round(confidence * 100);
  let variant: BadgeVariant = 'default';
  let label = 'Low';

  if (percent >= 90) {
    variant = 'success';
    label = 'High';
  } else if (percent >= 70) {
    variant = 'info';
    label = 'Medium';
  } else if (percent >= 50) {
    variant = 'warning';
    label = 'Low';
  } else {
    variant = 'danger';
    label = 'Very Low';
  }

  return (
    <View style={[styles.confidenceBadge, style]}>
      <Text style={[styles.confidenceLabel, { color: colors.textSecondary }]}>
        Confidence
      </Text>
      <Badge label={`${percent}%`} variant={variant} size={size} />
    </View>
  );
}

// =============================================================================
// Data Source Badge
// =============================================================================

type DataSource = 'measured' | 'estimated' | 'confirmed' | 'calculated' | 'manual';

interface DataSourceBadgeProps {
  source: DataSource;
  style?: ViewStyle;
}

const sourceConfig: Record<DataSource, { label: string; variant: BadgeVariant; icon: string }> = {
  measured: { label: 'Measured', variant: 'success', icon: '📊' },
  estimated: { label: 'Estimated', variant: 'info', icon: '📱' },
  confirmed: { label: 'Confirmed', variant: 'success', icon: '✓' },
  calculated: { label: 'Calculated', variant: 'default', icon: '🧮' },
  manual: { label: 'Manual', variant: 'default', icon: '✏️' },
};

export function DataSourceBadge({ source, style }: DataSourceBadgeProps) {
  const config = sourceConfig[source];

  return (
    <View style={[styles.dataSourceBadge, style]}>
      <Text style={styles.dataSourceIcon}>{config.icon}</Text>
      <Badge label={config.label} variant={config.variant} size="sm" />
    </View>
  );
}

// =============================================================================
// Freshness Indicator
// =============================================================================

interface FreshnessIndicatorProps {
  timestamp?: number | null; // Unix timestamp
  freshness?: 'fresh' | 'recent' | 'stale' | 'unknown';
  label?: string;
  style?: ViewStyle;
}

export function FreshnessIndicator({
  timestamp,
  freshness = 'unknown',
  label,
  style,
}: FreshnessIndicatorProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const freshnessColors = {
    fresh: '#22C55E',
    recent: '#F59E0B',
    stale: '#EF4444',
    unknown: '#6B7280',
  };

  const freshnessLabels = {
    fresh: 'Up to date',
    recent: 'Updated recently',
    stale: 'Data may be outdated',
    unknown: 'Unknown',
  };

  const getFreshness = (): 'fresh' | 'recent' | 'stale' | 'unknown' => {
    if (freshness !== 'unknown') return freshness;
    if (!timestamp) return 'unknown';

    const now = Date.now();
    const diff = now - timestamp;
    const hours = diff / (1000 * 60 * 60);

    if (hours < 1) return 'fresh';
    if (hours < 24) return 'recent';
    return 'stale';
  };

  const currentFreshness = getFreshness();
  const color = freshnessColors[currentFreshness];

  // Format time ago
  const formatTimeAgo = (ts: number): string => {
    const diff = Date.now() - ts;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <View style={[styles.freshnessContainer, style]}>
      <View style={[styles.freshnessDot, { backgroundColor: color }]} />
      <Text style={[styles.freshnessText, { color: colors.textSecondary }]}>
        {label || freshnessLabels[currentFreshness]}
        {timestamp && ` • ${formatTimeAgo(timestamp)}`}
      </Text>
    </View>
  );
}

// =============================================================================
// Trend Indicator
// =============================================================================

interface TrendIndicatorProps {
  trend: 'up' | 'down' | 'stable';
  value?: string;
  inverse?: boolean; // For metrics where down is good (e.g., weight)
  size?: 'sm' | 'md';
  style?: ViewStyle;
}

export function TrendIndicator({
  trend,
  value,
  inverse = false,
  size = 'md',
  style,
}: TrendIndicatorProps) {
  const getTrendColor = () => {
    if (trend === 'stable') return '#6B7280';
    
    // For inverse metrics (like resting heart rate), up is good
    const isPositive = inverse ? trend === 'down' : trend === 'up';
    return isPositive ? '#22C55E' : '#EF4444';
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  const color = getTrendColor();
  const fontSizeValue = size === 'sm' ? fontSize.xs : fontSize.sm;

  return (
    <View style={[styles.trendContainer, style]}>
      <Text style={[styles.trendIcon, { color, fontSize: fontSizeValue + 2 }]}>
        {getTrendIcon()}
      </Text>
      {value && (
        <Text style={[styles.trendValue, { color, fontSize: fontSizeValue }]}>
          {value}
        </Text>
      )}
    </View>
  );
}

// =============================================================================
// Insight Card
// =============================================================================

interface InsightCardProps {
  title: string;
  description: string;
  type?: 'positive' | 'negative' | 'neutral' | 'ai';
  icon?: ReactNode;
  style?: ViewStyle;
}

export function InsightCard({
  title,
  description,
  type = 'neutral',
  icon,
  style,
}: InsightCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const typeConfig = {
    positive: { color: '#22C55E', bg: 'rgba(34,197,94,0.1)' },
    negative: { color: '#EF4444', bg: 'rgba(239,68,68,0.1)' },
    neutral: { color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    ai: { color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  };

  const config = typeConfig[type];

  return (
    <View style={[styles.insightCard, { backgroundColor: config.bg }, style]}>
      <View style={styles.insightHeader}>
        {icon && <View style={styles.insightIcon}>{icon}</View>}
        <Text style={[styles.insightTitle, { color: colors.textPrimary }]}>
          {title}
        </Text>
      </View>
      <Text style={[styles.insightDescription, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </View>
  );
}

// =============================================================================
// Disclaimer Banner
// =============================================================================

interface DisclaimerProps {
  type?: 'info' | 'warning' | 'privacy';
  style?: ViewStyle;
}

export function Disclaimer({
  type = 'info',
  style,
}: DisclaimerProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const config = {
    info: { icon: 'ℹ️', color: '#3B82F6', bg: 'rgba(59,130,246,0.1)' },
    warning: { icon: '⚠️', color: '#F59E0B', bg: 'rgba(245,158,11,0.1)' },
    privacy: { icon: '🔒', color: '#8B5CF6', bg: 'rgba(139,92,246,0.1)' },
  };

  const disclaimerConfig = config[type];

  const defaultText = type === 'privacy'
    ? 'AIVO provides general wellness guidance only. This app does not provide medical advice, diagnosis, or treatment.'
    : 'AIVO Readiness is an estimated wellness indicator based on available data. Individual results may vary.';

  return (
    <View style={[styles.disclaimer, { backgroundColor: disclaimerConfig.bg }, style]}>
      <Text style={styles.disclaimerIcon}>{disclaimerConfig.icon}</Text>
      <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
        {defaultText}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeText: {
    fontWeight: fontWeight.medium,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
  },
  pillIcon: {
    marginRight: spacingNamed.xs,
  },
  pillText: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },

  // Confidence Badge
  confidenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.sm,
  },
  confidenceLabel: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },

  // Data Source Badge
  dataSourceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacingNamed.xs,
  },
  dataSourceIcon: {
    fontSize: fontSize.xs,
  },

  // Freshness Indicator
  freshnessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  freshnessDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: spacingNamed.sm,
  },
  freshnessText: {
    fontSize: fontSize.xs,
  },

  // Trend Indicator
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendIcon: {
    fontWeight: fontWeight.bold,
  },
  trendValue: {
    fontWeight: fontWeight.medium,
    marginLeft: 2,
  },

  // Insight Card
  insightCard: {
    padding: spacingNamed.lg,
    borderRadius: borderRadius.cards,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingNamed.sm,
  },
  insightIcon: {
    marginRight: spacingNamed.sm,
  },
  insightTitle: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  insightDescription: {
    fontSize: fontSize.sm,
    lineHeight: 20,
  },

  // Disclaimer
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacingNamed.md,
    borderRadius: borderRadius.md,
    gap: spacingNamed.sm,
  },
  disclaimerIcon: {
    fontSize: fontSize.base,
  },
  disclaimerText: {
    flex: 1,
    fontSize: fontSize.xs,
    lineHeight: 18,
  },
});

export default Badge;
