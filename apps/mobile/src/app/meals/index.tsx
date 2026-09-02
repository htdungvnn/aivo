/**
 * Meals Index Screen
 * Default route for the meals module - shows meal list or redirects to capture
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function MealsIndexScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Meals</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="restaurant-outline" size={64} color={colors.mutedForeground} />
        </View>

        <Text style={[styles.subtitle, { color: colors.textPrimary }]}>
          Track Your Nutrition
        </Text>

        <Text style={[styles.description, { color: colors.mutedForeground }]}>
          Log your meals and get AI-powered nutrition analysis
        </Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/analysis/capture')}
          >
            <Ionicons name="camera" size={20} color={colors.primaryForeground} />
            <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>
              Add Meal
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: colors.border }]}
            onPress={() => router.push('/nutrition')}
          >
            <Ionicons name="bar-chart-outline" size={20} color={colors.textPrimary} />
            <Text style={[styles.secondaryButtonText, { color: colors.textPrimary }]}>
              View Nutrition
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.quickLinks}>
          <TouchableOpacity
            style={[styles.linkCard, { backgroundColor: colors.card }]}
            onPress={() => router.push('/meals/meal-camera')}
          >
            <Ionicons name="camera" size={24} color={colors.primary} />
            <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Camera</Text>
            <Text style={[styles.linkSubtitle, { color: colors.mutedForeground }]}>
              Take a photo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.linkCard, { backgroundColor: colors.card }]}
            onPress={() => router.push('/meals/nutrition')}
          >
            <Ionicons name="nutrition" size={24} color={colors.success} />
            <Text style={[styles.linkTitle, { color: colors.textPrimary }]}>Nutrition</Text>
            <Text style={[styles.linkSubtitle, { color: colors.mutedForeground }]}>
              Daily summary
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  actions: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  quickLinks: {
    flexDirection: 'row',
    marginTop: 32,
    gap: 12,
  },
  linkCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  linkTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  linkSubtitle: {
    fontSize: 12,
  },
});
