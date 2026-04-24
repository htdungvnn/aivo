import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { HealthScoreResult } from '@aivo/shared-types';

interface BodyInsightCardProps {
  insight?: HealthScoreResult;
  onPress?: () => void;
}

export default function BodyInsightCard(_props: BodyInsightCardProps) {
  return (
    <View style={styles.container}>
      <Text>Body Insights</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
});
