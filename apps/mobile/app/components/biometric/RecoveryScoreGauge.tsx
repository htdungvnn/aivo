import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface RecoveryScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const COLORS = {
  success: '#22c55e',
  primary: '#007AFF',
  warning: '#FF9500',
  error: '#EF4444',
  background: '#374151',
  text: '#ffffff',
  textSecondary: '#9ca3af',
} as const;

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundCircle: {
    borderRadius: 50,
  },
  progressCircle: {
    borderRadius: 50,
  },
  centerContent: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontWeight: "bold",
  },
  labelText: {
    textTransform: "uppercase" as const,
  },
});

export function RecoveryScoreGauge({ score, size = "md" }: RecoveryScoreGaugeProps) {
  const getCategory = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: COLORS.success };
    if (score >= 60) return { label: "Good", color: COLORS.primary };
    if (score >= 40) return { label: "Fair", color: COLORS.warning };
    return { label: "Poor", color: COLORS.error };
  };

  const category = getCategory(score);
  const sizes = useMemo(() => ({
    sm: { container: 80, strokeWidth: 8, text: 18, label: 10 },
    md: { container: 100, strokeWidth: 12, text: 24, label: 12 },
    lg: { container: 120, strokeWidth: 14, text: 32, label: 14 },
  }), []);

  const s = sizes[size];
  const radius = (s.container - s.strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  const center = s.container / 2;

  return (
    <View style={[styles.container, { width: s.container, height: s.container }]}>
      <Svg width={s.container} height={s.container}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={COLORS.background}
          strokeWidth={s.strokeWidth}
          fill="none"
        />
        {/* Progress arc */}
        {score > 0 && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={category.color}
            strokeWidth={s.strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90, ${center}, ${center})`}
          />
        )}
      </Svg>
      <View style={[styles.centerContent, { width: s.container, height: s.container }]}>
        <Text style={[styles.scoreText, { fontSize: s.text, color: COLORS.text }]}>
          {Math.round(score)}
        </Text>
        <Text style={[styles.labelText, { fontSize: s.label, color: COLORS.textSecondary }]}>
          {category.label}
        </Text>
      </View>
    </View>
  );
}

export default RecoveryScoreGauge;
