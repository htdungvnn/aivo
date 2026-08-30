/**
 * Rep Counter Component
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface RepCounterProps {
  currentReps: number;
  targetReps: number;
  phase: string;
}

export function RepCounter({ currentReps, targetReps, phase }: RepCounterProps) {
  const progress = targetReps > 0 ? currentReps / targetReps : 0;
  
  return (
    <View style={styles.container}>
      <View style={styles.counter}>
        <Text style={styles.current}>{currentReps}</Text>
        <Text style={styles.target}>/ {targetReps}</Text>
      </View>
      
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: `${progress * 100}%` }]} />
      </View>
      
      <Text style={styles.phase}>{phase}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 16,
    padding: 16,
  },
  counter: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  current: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#22C55E',
  },
  target: {
    fontSize: 24,
    color: '#fff',
    opacity: 0.7,
  },
  progressContainer: {
    width: '100%',
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#22C55E',
  },
  phase: {
    marginTop: 8,
    fontSize: 14,
    color: '#fff',
    textTransform: 'capitalize',
  },
});
