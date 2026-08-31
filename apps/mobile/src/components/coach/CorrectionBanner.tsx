/**
 * Correction Banner Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { CorrectionResult } from '@aivo/fitness-types/correction';
import { DEFAULT_CORRECTION_MESSAGES } from '@aivo/fitness-types/correction';

interface CorrectionBannerProps {
  corrections: CorrectionResult[];
  language: 'en' | 'vi';
}

export function CorrectionBanner({ corrections, language }: CorrectionBannerProps) {
  if (corrections.length === 0) return null;

  // Get highest priority correction
  const topCorrection = corrections.reduce((prev, curr) => {
    const prevPriority = getPriority(prev.severity);
    const currPriority = getPriority(curr.severity);
    return currPriority > prevPriority ? curr : prev;
  });

  const message = DEFAULT_CORRECTION_MESSAGES[topCorrection.code as keyof typeof DEFAULT_CORRECTION_MESSAGES];
  const displayMessage = message?.[language] || topCorrection.code;

  const bgColor = getSeverityColor(topCorrection.severity);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <Text style={styles.text}>{displayMessage}</Text>
    </View>
  );
}

function getPriority(severity: string): number {
  switch (severity) {
    case 'critical': return 4;
    case 'warning': return 3;
    case 'hint': return 2;
    case 'info': return 1;
    default: return 0;
  }
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical': return 'rgba(220, 38, 38, 0.9)';
    case 'warning': return 'rgba(239, 68, 68, 0.9)';
    case 'hint': return 'rgba(245, 158, 11, 0.9)';
    default: return 'rgba(59, 130, 246, 0.9)';
  }
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
