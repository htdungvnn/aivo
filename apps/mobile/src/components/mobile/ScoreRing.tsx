/**
 * AIVO Mobile - Score Ring Component
 * Circular progress indicator for readiness, readiness, and other scores
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Colors, fontSize, fontWeight, spacingNamed } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ScoreLevel = 'low' | 'moderate' | 'good' | 'high';
type ScoreColor = 'readiness' | 'sleep' | 'hydration' | 'nutrition' | 'activity' | 'workout';

interface ScoreRingProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  level?: ScoreLevel;
  colorKey?: ScoreColor;
  showLabel?: boolean;
  label?: string;
  showPercent?: boolean;
  animated?: boolean;
  style?: ViewStyle;
}

const levelColors: Record<ScoreLevel, string> = {
  low: '#EF4444',
  moderate: '#F59E0B',
  good: '#10B981',
  high: '#3B82F6',
};

const colorKeys: Record<ScoreColor, keyof typeof Colors.dark> = {
  readiness: 'readiness',
  sleep: 'sleep',
  hydration: 'hydration',
  nutrition: 'nutrition',
  activity: 'activity',
  workout: 'workout',
};

export function ScoreRing({
  score,
  size = 120,
  strokeWidth = 10,
  level,
  colorKey = 'readiness',
  showLabel = true,
  label,
  showPercent = true,
  animated = true,
  style,
}: ScoreRingProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  // Get color based on level or colorKey
  const ringColor = level
    ? levelColors[level]
    : colors[colorKeys[colorKey] as keyof typeof colors] as string;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // Animation
  const progress = useSharedValue(0);

  useEffect(() => {
    if (animated) {
      progress.value = withTiming(score / 100, {
        duration: 1000,
        easing: Easing.out(Easing.cubic),
      });
    } else {
      progress.value = score / 100;
    }
  }, [score, animated]);

  const animatedProps = useAnimatedProps(() => {
    const strokeDashoffset = circumference * (1 - progress.value);
    return {
      strokeDashoffset,
    };
  });

  // Get label text
  const getLabel = (): string => {
    if (label) return label;
    if (!showLabel) return '';

    if (level) {
      return level.charAt(0).toUpperCase() + level.slice(1);
    }

    // Derive level from score
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Moderate';
    return 'Low';
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle */}
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={ringColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      
      {/* Center content */}
      <View style={[styles.centerContent, { width: size, height: size }]}>
        <Text
          style={[
            styles.scoreText,
            { color: ringColor, fontSize: size * 0.3 },
          ]}
          accessibilityLabel={`Score: ${score}`}
        >
          {score}
        </Text>
        {showLabel && (
          <Text
            style={[
              styles.labelText,
              { color: colors.textSecondary, fontSize: size * 0.1 },
            ]}
          >
            {getLabel()}
          </Text>
        )}
      </View>
    </View>
  );
}

// Compact variant for small spaces
export function ScoreRingCompact({
  score,
  size = 48,
  strokeWidth = 4,
  color = Colors.dark.primary,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const progress = score / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={Colors.dark.ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
    </View>
  );
}

// Progress ring variant
export function ProgressRing({
  progress,
  size = 48,
  strokeWidth = 4,
  color = Colors.dark.primary,
  showPercent = false,
}: {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  color?: string;
  showPercent?: boolean;
}) {
  const colors = useColorScheme() === 'dark' ? Colors.dark : Colors.light;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const strokeDashoffset = circumference * (1 - Math.min(progress, 100) / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={colors.ringTrack}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference}`}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(-90 ${center} ${center})`}
        />
      </Svg>
      {showPercent && (
        <View style={[styles.centerContent, { width: size, height: size }]}>
          <Text style={[styles.progressText, { fontSize: size * 0.25, color: colors.textPrimary }]}>
            {Math.round(progress)}%
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerContent: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreText: {
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  labelText: {
    fontWeight: fontWeight.medium,
    marginTop: spacingNamed.xs,
  },
  progressText: {
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
});

export default ScoreRing;
