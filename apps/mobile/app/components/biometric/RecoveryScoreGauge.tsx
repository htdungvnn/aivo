"use client";

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import colors from "@/theme/colors";

interface RecoveryScoreGaugeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

const styles = StyleSheet.create({
  gaugeWrapper: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundCircle: {
    borderRadius: 50,
    borderWidth: 12,
    borderColor: colors.border.primary,
  },
  progressCircle: {
    borderRadius: 50,
    borderWidth: 12,
    borderTopColor: colors.border.transparent,
    borderRightColor: colors.border.transparent,
  },
  centerText: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    color: colors.text.primary,
    fontWeight: "bold",
  },
  labelText: {
    color: colors.text.secondary,
    textTransform: "uppercase" as const,
  },
  hiddenGauge: {
    opacity: 0,
  },
});

export function RecoveryScoreGauge({ score, size = "md" }: RecoveryScoreGaugeProps) {
  const getCategory = (score: number) => {
    if (score >= 80) {return { label: "Excellent", color: colors.success };}
    if (score >= 60) {return { label: "Good", color: colors.brand.primary };}
    if (score >= 40) {return { label: "Fair", color: colors.warning };}
    return { label: "Poor", color: colors.error };
  };

  const category = getCategory(score);
  const sizes = {
    sm: { container: 80, text: 18, label: 10 },
    md: { container: 100, text: 24, label: 12 },
    lg: { container: 120, text: 32, label: 14 },
  };
  const s = sizes[size];

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
            },
            score > 0 ? {} : styles.hiddenGauge,
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
