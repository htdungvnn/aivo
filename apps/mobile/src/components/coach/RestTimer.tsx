/**
 * Rest Timer Component
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface RestTimerProps {
  duration: number;
  onComplete: () => void;
}

export function RestTimer({ duration, onComplete }: RestTimerProps) {
  const [remaining, setRemaining] = useState(duration);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete]);

  const progress = (duration - remaining) / duration;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Rest</Text>
      
      <View style={styles.timerContainer}>
        <View style={styles.progressRing}>
          <View
            style={[
              styles.progressFill,
              { height: `${progress * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.time}>{remaining}</Text>
      </View>
      
      <TouchableOpacity style={styles.skipButton} onPress={onComplete}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1412',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 40,
  },
  timerContainer: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  progressFill: {
    width: '100%',
    backgroundColor: '#22C55E',
  },
  time: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#fff',
  },
  skipButton: {
    marginTop: 40,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
  },
  skipText: {
    fontSize: 16,
    color: '#fff',
  },
});
