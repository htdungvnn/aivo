/**
 * Health Index Screen
 * Main health dashboard - redirects to readiness by default
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const HEALTH_CATEGORIES = [
  {
    id: 'readiness',
    title: 'Readiness',
    subtitle: 'Daily readiness score',
    icon: 'pulse',
    color: '#34C759',
    route: '/health/readiness',
  },
  {
    id: 'sleep',
    title: 'Sleep',
    subtitle: 'Track your sleep',
    icon: 'moon',
    color: '#5856D6',
    route: '/health/sleep',
  },
  {
    id: 'activity',
    title: 'Activity',
    subtitle: 'Steps & exercise',
    icon: 'walk',
    color: '#FF9500',
    route: '/health/activity',
  },
  {
    id: 'hydration',
    title: 'Hydration',
    subtitle: 'Water intake',
    icon: 'water',
    color: '#007AFF',
    route: '/health/hydration',
  },
  {
    id: 'body-metrics',
    title: 'Body Metrics',
    subtitle: 'Weight & measurements',
    icon: 'body',
    color: '#AF52DE',
    route: '/health/body-metrics',
  },
  {
    id: 'habits',
    title: 'Habits',
    subtitle: 'Daily habits',
    icon: 'checkbox',
    color: '#FF3B30',
    route: '/health/habits',
  },
];

export default function HealthIndexScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Health</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Track your wellness journey
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Quick Actions
          </Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card }]}
              onPress={() => router.push('/health/readiness')}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#34C75920' }]}>
                <Ionicons name="pulse" size={24} color="#34C759" />
              </View>
              <Text style={[styles.quickTitle, { color: colors.textPrimary }]}>
                Check Readiness
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.quickAction, { backgroundColor: colors.card }]}
              onPress={() => router.push('/analysis/capture')}
            >
              <View style={[styles.quickIcon, { backgroundColor: '#007AFF20' }]}>
                <Ionicons name="camera" size={24} color="#007AFF" />
              </View>
              <Text style={[styles.quickTitle, { color: colors.textPrimary }]}>
                Log Meal
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Health Categories */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Categories
          </Text>
          <View style={styles.categoriesGrid}>
            {HEALTH_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[styles.categoryCard, { backgroundColor: colors.card }]}
                onPress={() => router.push(category.route)}
              >
                <View style={[styles.categoryIcon, { backgroundColor: category.color + '20' }]}>
                  <Ionicons
                    name={category.icon as any}
                    size={24}
                    color={category.color}
                  />
                </View>
                <Text style={[styles.categoryTitle, { color: colors.textPrimary }]}>
                  {category.title}
                </Text>
                <Text style={[styles.categorySubtitle, { color: colors.mutedForeground }]}>
                  {category.subtitle}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickAction: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  quickIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  categoryCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  categorySubtitle: {
    fontSize: 12,
  },
});
