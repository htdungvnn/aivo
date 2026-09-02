/**
 * Nutrition Dashboard Screen
 * Daily overview of nutrition and meals
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  getNutritionClient,
  NutritionApiError,
  Meal,
  NutritionValues,
  MacroTargets,
} from "@/lib/nutrition";

interface DailySummary {
  date: string;
  meals: Meal[];
  totalNutrition: NutritionValues;
  macroPercentages: MacroTargets;
}

export default function NutritionDashboardScreen() {
  const router = useRouter();

  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [targets, setTargets] = useState<NutritionValues | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const nutritionClient = getNutritionClient();

  /**
   * Fetch daily data
   */
  const fetchData = useCallback(async () => {
    try {
      const [todayData, targetsData] = await Promise.all([
        nutritionClient.getTodayMeals(),
        nutritionClient.getTargets(),
      ]);

      setSummary(todayData);
      setTargets(targetsData.targets);
    } catch (error) {
      console.error("Failed to fetch nutrition data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [nutritionClient]);

  /**
   * Initial fetch
   */
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /**
   * Pull to refresh
   */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  /**
   * Navigate to add meal
   */
  const navigateToCapture = useCallback(() => {
    router.push("/analysis/capture" as any);
  }, [router]);

  /**
   * Get progress percentage
   */
  const getProgress = (consumed: number, target: number): number => {
    if (target === 0) return 0;
    return Math.min((consumed / target) * 100, 100);
  };

  /**
   * Render circular progress
   */
  const renderCircularProgress = (
    consumed: number,
    target: number,
    label: string,
    unit: string,
    color: string,
  ) => {
    const progress = getProgress(consumed, target);
    const percentage = Math.round(progress);

    return (
      <View style={styles.progressItem}>
        <View style={[styles.progressCircle, { borderColor: color }]}>
          <Text style={[styles.progressValue, { color }]}>{percentage}%</Text>
        </View>
        <Text style={styles.progressLabel}>{label}</Text>
        <Text style={styles.progressAmount}>
          {Math.round(consumed)}/{target}
          {unit}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading nutrition data...</Text>
      </View>
    );
  }

  const { totalNutrition, meals, macroPercentages } = summary || {
    totalNutrition: {
      caloriesKcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
      sugarG: 0,
      sodiumMg: 0,
    },
    meals: [],
    macroPercentages: { proteinPercent: 0, carbsPercent: 0, fatPercent: 0 },
  };

  const targetValues = targets || {
    caloriesKcal: 2000,
    proteinG: 50,
    carbsG: 275,
    fatG: 78,
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Today's Nutrition</Text>
        <TouchableOpacity style={styles.addButton} onPress={navigateToCapture}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Calories Card */}
      <View style={styles.caloriesCard}>
        <View style={styles.caloriesMain}>
          <Text style={styles.caloriesValue}>
            {Math.round(totalNutrition.caloriesKcal)}
          </Text>
          <Text style={styles.caloriesUnit}>kcal</Text>
        </View>

        <View style={styles.caloriesProgress}>
          <View style={styles.caloriesBarContainer}>
            <View
              style={[
                styles.caloriesBarFill,
                {
                  width: `${getProgress(
                    totalNutrition.caloriesKcal,
                    targetValues.caloriesKcal,
                  )}%`,
                },
              ]}
            />
          </View>
          <Text style={styles.caloriesRemaining}>
            {Math.max(
              0,
              Math.round(
                targetValues.caloriesKcal - totalNutrition.caloriesKcal,
              ),
            )}
            kcal remaining
          </Text>
        </View>
      </View>

      {/* Macro Progress */}
      <View style={styles.macrosCard}>
        <Text style={styles.sectionTitle}>Macros</Text>

        <View style={styles.macrosGrid}>
          {renderCircularProgress(
            totalNutrition.proteinG,
            targetValues.proteinG,
            "Protein",
            "g",
            "#007AFF",
          )}
          {renderCircularProgress(
            totalNutrition.carbsG,
            targetValues.carbsG,
            "Carbs",
            "g",
            "#FF9500",
          )}
          {renderCircularProgress(
            totalNutrition.fatG,
            targetValues.fatG,
            "Fat",
            "g",
            "#AF52DE",
          )}
        </View>
      </View>

      {/* Meals List */}
      <View style={styles.mealsSection}>
        <View style={styles.mealsSectionHeader}>
          <Text style={styles.sectionTitle}>Today's Meals</Text>
          <Text style={styles.mealCount}>{meals.length} meals</Text>
        </View>

        {meals.length === 0 ? (
          <View style={styles.emptyMeals}>
            <Ionicons name="restaurant-outline" size={48} color="#C7C7CC" />
            <Text style={styles.emptyMealsText}>No meals logged today</Text>
            <TouchableOpacity
              style={styles.logMealButton}
              onPress={navigateToCapture}
            >
              <Text style={styles.logMealButtonText}>Log a Meal</Text>
            </TouchableOpacity>
          </View>
        ) : (
          meals.map((meal, index) => (
            <TouchableOpacity
              key={meal.id || index}
              style={styles.mealCard}
              onPress={() => router.push(`/meals/${meal.id}` as any)}
            >
              <View style={styles.mealHeader}>
                <View style={styles.mealTypeBadge}>
                  <Text style={styles.mealTypeText}>
                    {meal.mealType.charAt(0).toUpperCase() +
                      meal.mealType.slice(1)}
                  </Text>
                </View>
                <Text style={styles.mealCalories}>
                  {Math.round(meal.totalNutrition.caloriesKcal)} kcal
                </Text>
              </View>

              <Text style={styles.mealName}>{meal.name}</Text>

              <View style={styles.mealMacros}>
                <Text style={styles.mealMacroText}>
                  P: {Math.round(meal.totalNutrition.proteinG)}g
                </Text>
                <Text style={styles.mealMacroText}>
                  C: {Math.round(meal.totalNutrition.carbsG)}g
                </Text>
                <Text style={styles.mealMacroText}>
                  F: {Math.round(meal.totalNutrition.fatG)}g
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => router.push("/charts" as any)}
        >
          <Ionicons name="bar-chart-outline" size={24} color="#007AFF" />
          <Text style={styles.quickActionText}>View Charts</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => router.push("/targets" as any)}
        >
          <Ionicons name="settings-outline" size={24} color="#007AFF" />
          <Text style={styles.quickActionText}>Settings</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom padding */}
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#8E8E93",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000000",
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  caloriesCard: {
    margin: 16,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  caloriesMain: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginBottom: 16,
  },
  caloriesValue: {
    fontSize: 64,
    fontWeight: "bold",
    color: "#007AFF",
  },
  caloriesUnit: {
    fontSize: 24,
    color: "#8E8E93",
    marginLeft: 8,
  },
  caloriesProgress: {
    alignItems: "center",
  },
  caloriesBarContainer: {
    width: "100%",
    height: 8,
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
    overflow: "hidden",
  },
  caloriesBarFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 4,
  },
  caloriesRemaining: {
    marginTop: 8,
    fontSize: 14,
    color: "#8E8E93",
  },
  macrosCard: {
    marginHorizontal: 16,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 16,
  },
  macrosGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  progressItem: {
    alignItems: "center",
  },
  progressCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 4,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  progressValue: {
    fontSize: 16,
    fontWeight: "bold",
  },
  progressLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 2,
  },
  progressAmount: {
    fontSize: 11,
    color: "#C7C7CC",
  },
  mealsSection: {
    margin: 16,
  },
  mealsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealCount: {
    fontSize: 14,
    color: "#8E8E93",
  },
  emptyMeals: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyMealsText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8E8E93",
    marginBottom: 16,
  },
  logMealButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  logMealButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#F2F2F7",
    borderRadius: 12,
  },
  mealTypeText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    marginBottom: 8,
  },
  mealMacros: {
    flexDirection: "row",
    gap: 16,
  },
  mealMacroText: {
    fontSize: 14,
    color: "#8E8E93",
  },
  quickActions: {
    flexDirection: "row",
    marginHorizontal: 16,
    gap: 12,
  },
  quickAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    gap: 8,
  },
  quickActionText: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: "500",
  },
});
