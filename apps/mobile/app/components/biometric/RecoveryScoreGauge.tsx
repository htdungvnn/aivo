"use client";

import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface RecoveryScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  gaugeWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundCircle: {
    borderRadius: 50,
    borderWidth: 12,
    borderColor: "#334155",
  },
  progressCircle: {
    borderRadius: 50,
    borderWidth: 12,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
  },
  centerText: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    color: "#fff",
    fontWeight: "bold",
  },
  labelText: {
    color: "#94a3b8",
    textTransform: "uppercase" as const,
  },
});

export function RecoveryScoreGauge({ score, size = "md" }: RecoveryScoreGaugeProps) {
  const getCategory = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "#22c55e" };
    if (score >= 60) return { label: "Good", color: "#3b82f6" };
    if (score >= 40) return { label: "Fair", color: "#f97316" };
    return { label: "Poor", color: "#ef4444" };
  };

  const category = getCategory(score);
  const sizes = {
    sm: { container: 80, text: 18, label: 10 },
    md: { container: 100, text: 24, label: 12 },
    lg: { container: 120, text: 32, label: 14 },
  };
  const s = sizes[size];
  const radius = s.container / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  const strokeWidth = 12;
  const normalizedScore = score / 100;
  const strokeDashoffset = circumference * (1 - normalizedScore);

  return (
    <View style={{ width: s.container, height: s.container }}>
      <View style={styles.gaugeWrapper}>
        <View style={[styles.backgroundCircle, { width: s.container, height: s.container }]} />
        <View
          style={[
            styles.progressCircle,
            {
              width: s.container,
              height: s.container,
              borderColor: category.color,
              transform: [{ rotate: "-135deg" }],
              opacity: score > 0 ? 1 : 0,
            },
          ]}
        />
      </View>
      <View style={styles.centerText}>
        <Text style={[styles.scoreText, { fontSize: s.text }]}>{Math.round(score)}</Text>
        <Text style={[styles.labelText, { fontSize: s.label }]}>{category.label}</Text>
      </View>
    </View>
  );
}
