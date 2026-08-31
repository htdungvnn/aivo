/**
 * AIVO Mobile - Nutrition Dashboard
 * Track calories, macros, and meals
 */

import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/ui';

import {
  ScrollScreen,
  BackHeader,
  Card,
  ScoreRing,
  SectionHeader,
  MetricCard,
  ProgressRing,
  Badge,
  ListHeader,
  LoadingState,
  spacingNamed,
  fontSize,
  fontWeight,
} from '@/components/mobile';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface Meal {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string;
}

export default function NutritionScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  // Mock data
  const targets = {
    calories: 2200,
    protein: 150,
    carbs: 220,
    fat: 73,
  };

  const consumed = {
    calories: 1650,
    protein: 95,
    carbs: 165,
    fat: 55,
  };

  const meals: Meal[] = [
    { id: '1', name: 'Greek Yogurt Parfait', type: 'breakfast', calories: 320, protein: 22, carbs: 45, fat: 8, time: '7:30 AM' },
    { id: '2', name: 'Grilled Chicken Salad', type: 'lunch', calories: 450, protein: 42, carbs: 28, fat: 18, time: '12:30 PM' },
    { id: '3', name: 'Protein Shake', type: 'snack', calories: 180, protein: 25, carbs: 8, fat: 3, time: '3:00 PM' },
  ];

  const remaining = {
    calories: targets.calories - consumed.calories,
    protein: targets.protein - consumed.protein,
    carbs: targets.carbs - consumed.carbs,
    fat: targets.fat - consumed.fat,
  };

  const calorieProgress = (consumed.calories / targets.calories) * 100;
  const proteinProgress = (consumed.protein / targets.protein) * 100;
  const carbsProgress = (consumed.carbs / targets.carbs) * 100;
  const fatProgress = (consumed.fat / targets.fat) * 100;

  const getMealIcon = (type: string): keyof typeof Ionicons.glyphMap => {
    const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
      breakfast: 'sunny',
      lunch: 'partly-sunny',
      dinner: 'moon',
      snack: 'cafe',
    };
    return icons[type] || 'restaurant';
  };

  if (loading) {
    return (
      <ScrollScreen edges={['top']}>
        <View style={styles.headerSpacer} />
        <LoadingState message="Loading nutrition data..." fullScreen />
      </ScrollScreen>
    );
  }

  return (
    <ScrollScreen
      edges={['top']}
      contentStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.headerSpacer} />

      <BackHeader
        title="Nutrition"
        subtitle="Track your daily intake"
        right={
          <TouchableOpacity
            onPress={() => router.push('/meals/meal-camera')}
            style={styles.cameraButton}
          >
            <Ionicons name="camera" size={24} color={colors.primary} />
          </TouchableOpacity>
        }
      />

      {/* Calorie Summary Card */}
      <Card variant="elevated" padding="lg" style={styles.summaryCard}>
        <View style={styles.calorieContent}>
          <View style={styles.calorieRing}>
            <ScoreRing
              score={Math.min(calorieProgress, 100)}
              size={140}
              strokeWidth={12}
              colorKey="nutrition"
            />
            <View style={styles.calorieOverlay}>
              <Text style={[styles.calorieRemaining, { color: colors.nutrition }]}>
                {remaining.calories}
              </Text>
              <Text style={[styles.calorieLabel, { color: colors.textSecondary }]}>
                remaining
              </Text>
            </View>
          </View>

          <View style={styles.calorieInfo}>
            <View style={styles.calorieRow}>
              <Text style={[styles.calorieTitle, { color: colors.textSecondary }]}>
                Consumed
              </Text>
              <Text style={[styles.calorieValue, { color: colors.textPrimary }]}>
                {consumed.calories}
              </Text>
            </View>
            <View style={styles.calorieRow}>
              <Text style={[styles.calorieTitle, { color: colors.textSecondary }]}>
                Target
              </Text>
              <Text style={[styles.calorieValue, { color: colors.textPrimary }]}>
                {targets.calories}
              </Text>
            </View>
            <View style={[styles.calorieRow, styles.calorieRowTotal]}>
              <Text style={[styles.calorieTitle, { color: colors.textSecondary }]}>
                Net
              </Text>
              <Text style={[styles.calorieValue, { color: remaining.calories >= 0 ? colors.success : colors.danger }]}>
                {remaining.calories >= 0 ? '+' : ''}{remaining.calories}
              </Text>
            </View>
          </View>
        </View>
      </Card>

      {/* Macros */}
      <SectionHeader title="Macros" />

      <Card padding="md" style={styles.macrosCard}>
        <View style={styles.macrosGrid}>
          {/* Protein */}
          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <View style={[styles.macroDot, { backgroundColor: colors.nutritionSecondary }]} />
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                Protein
              </Text>
            </View>
            <View style={styles.macroValues}>
              <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
                {consumed.protein}g
              </Text>
              <Text style={[styles.macroTarget, { color: colors.textMuted }]}>
                / {targets.protein}g
              </Text>
            </View>
            <View style={styles.macroBar}>
              <View
                style={[
                  styles.macroBarFill,
                  { width: `${Math.min(proteinProgress, 100)}%`, backgroundColor: colors.nutritionSecondary },
                ]}
              />
            </View>
          </View>

          {/* Carbs */}
          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <View style={[styles.macroDot, { backgroundColor: colors.info }]} />
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                Carbs
              </Text>
            </View>
            <View style={styles.macroValues}>
              <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
                {consumed.carbs}g
              </Text>
              <Text style={[styles.macroTarget, { color: colors.textMuted }]}>
                / {targets.carbs}g
              </Text>
            </View>
            <View style={styles.macroBar}>
              <View
                style={[
                  styles.macroBarFill,
                  { width: `${Math.min(carbsProgress, 100)}%`, backgroundColor: colors.info },
                ]}
              />
            </View>
          </View>

          {/* Fat */}
          <View style={styles.macroItem}>
            <View style={styles.macroHeader}>
              <View style={[styles.macroDot, { backgroundColor: colors.workout }]} />
              <Text style={[styles.macroLabel, { color: colors.textSecondary }]}>
                Fat
              </Text>
            </View>
            <View style={styles.macroValues}>
              <Text style={[styles.macroValue, { color: colors.textPrimary }]}>
                {consumed.fat}g
              </Text>
              <Text style={[styles.macroTarget, { color: colors.textMuted }]}>
                / {targets.fat}g
              </Text>
            </View>
            <View style={styles.macroBar}>
              <View
                style={[
                  styles.macroBarFill,
                  { width: `${Math.min(fatProgress, 100)}%`, backgroundColor: colors.workout },
                ]}
              />
            </View>
          </View>
        </View>
      </Card>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.primary + '20' }]}
          onPress={() => router.push('/meals/meal-camera')}
        >
          <Ionicons name="camera" size={24} color={colors.primary} />
          <Text style={[styles.quickActionText, { color: colors.primary }]}>
            Scan Meal
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.nutrition + '20' }]}
          onPress={() => {}}
        >
          <Ionicons name="create" size={24} color={colors.nutrition} />
          <Text style={[styles.quickActionText, { color: colors.nutrition }]}>
            Add Manual
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickAction, { backgroundColor: colors.info + '20' }]}
          onPress={() => {}}
        >
          <Ionicons name="copy" size={24} color={colors.info} />
          <Text style={[styles.quickActionText, { color: colors.info }]}>
            Reuse Meal
          </Text>
        </TouchableOpacity>
      </View>

      {/* Today's Meals */}
      <SectionHeader
        title="Today's Meals"
        action={{
          label: 'See all',
          onPress: () => {},
        }}
      />

      {meals.map((meal) => (
        <Card
          key={meal.id}
          padding="md"
          onPress={() => {}}
          style={styles.mealCard}
        >
          <View style={styles.mealContent}>
            <View style={[styles.mealIcon, { backgroundColor: colors.nutrition + '15' }]}>
              <Ionicons
                name={getMealIcon(meal.type)}
                size={20}
                color={colors.nutrition}
              />
            </View>
            <View style={styles.mealInfo}>
              <View style={styles.mealHeader}>
                <Text style={[styles.mealName, { color: colors.textPrimary }]}>
                  {meal.name}
                </Text>
                <Text style={[styles.mealCalories, { color: colors.nutrition }]}>
                  {meal.calories} cal
                </Text>
              </View>
              <View style={styles.mealMacros}>
                <Text style={[styles.mealMacro, { color: colors.textMuted }]}>
                  P: {meal.protein}g
                </Text>
                <Text style={[styles.mealMacro, { color: colors.textMuted }]}>
                  C: {meal.carbs}g
                </Text>
                <Text style={[styles.mealMacro, { color: colors.textMuted }]}>
                  F: {meal.fat}g
                </Text>
                <Text style={[styles.mealTime, { color: colors.textMuted }]}>
                  {meal.time}
                </Text>
              </View>
            </View>
          </View>
        </Card>
      ))}

      {/* Bottom padding */}
      <View style={styles.bottomPadding} />
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacingNamed.lg,
  },
  headerSpacer: {
    height: 20,
  },
  cameraButton: {
    padding: spacingNamed.sm,
  },
  summaryCard: {
    marginBottom: spacingNamed['2xl'],
  },
  calorieContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calorieRing: {
    position: 'relative',
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calorieOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  calorieRemaining: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
  },
  calorieLabel: {
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  calorieInfo: {
    flex: 1,
    marginLeft: spacingNamed.lg,
  },
  calorieRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacingNamed.xs,
  },
  calorieRowTotal: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.1)',
    marginTop: spacingNamed.sm,
    paddingTop: spacingNamed.sm,
  },
  calorieTitle: {
    fontSize: fontSize.sm,
  },
  calorieValue: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    fontVariant: ['tabular-nums'],
  },
  macrosCard: {
    marginBottom: spacingNamed['2xl'],
  },
  macrosGrid: {
    gap: spacingNamed.lg,
  },
  macroItem: {},
  macroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacingNamed.xs,
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacingNamed.sm,
  },
  macroLabel: {
    fontSize: fontSize.sm,
    flex: 1,
  },
  macroValues: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacingNamed.xs,
  },
  macroValue: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  macroTarget: {
    fontSize: fontSize.sm,
    marginLeft: spacingNamed.xs,
  },
  macroBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  macroBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacingNamed.md,
    marginBottom: spacingNamed['2xl'],
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacingNamed.lg,
    borderRadius: 12,
    gap: spacingNamed.sm,
  },
  quickActionText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.medium,
  },
  mealCard: {
    marginBottom: spacingNamed.md,
  },
  mealContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  mealIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacingNamed.md,
  },
  mealInfo: {
    flex: 1,
  },
  mealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacingNamed.xs,
  },
  mealName: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.medium,
    flex: 1,
    marginRight: spacingNamed.md,
  },
  mealCalories: {
    fontSize: fontSize.base,
    fontWeight: fontWeight.semibold,
  },
  mealMacros: {
    flexDirection: 'row',
    gap: spacingNamed.md,
  },
  mealMacro: {
    fontSize: fontSize.xs,
  },
  mealTime: {
    fontSize: fontSize.xs,
    marginLeft: 'auto',
  },
  bottomPadding: {
    height: 100,
  },
});

export {};
