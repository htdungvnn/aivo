/**
 * Analysis Review Screen
 * Shows AI analysis results and allows user to confirm or correct
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import {
  getNutritionClient,
  NutritionApiError,
  MealAnalysis,
  MealAnalysisItem,
  NutritionValues,
} from "@/lib/nutrition";

type ReviewMode = "view" | "edit";

export default function AnalysisReviewScreen() {
  const { analysisId } = useLocalSearchParams<{ analysisId: string }>();
  const router = useRouter();

  const [analysis, setAnalysis] = useState<MealAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editMode, setEditMode] = useState<ReviewMode>("view");

  const nutritionClient = getNutritionClient();

  /**
   * Fetch analysis status
   */
  const fetchAnalysis = useCallback(async () => {
    if (!analysisId) return;

    try {
      const result = await nutritionClient.getAnalysisResult(analysisId);
      setAnalysis(result);

      // Auto-navigate if completed and no review needed
      if (result.status === "completed" && !result.needsUserReview) {
        // Analysis is complete, user can confirm
      }
    } catch (error) {
      if (error instanceof NutritionApiError) {
        Alert.alert("Error", error.message);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [analysisId, nutritionClient]);

  /**
   * Poll for analysis completion
   */
  useEffect(() => {
    if (!analysisId) return;

    fetchAnalysis();

    // Poll for status if still processing
    const pollInterval = setInterval(async () => {
      try {
        const status = await nutritionClient.getAnalysisStatus(analysisId);

        if (status.status === "completed" || status.status === "needs_review") {
          clearInterval(pollInterval);
          await fetchAnalysis();
        } else if (status.status === "failed") {
          clearInterval(pollInterval);
          setLoading(false);
          Alert.alert(
            "Analysis Failed",
            status.errorMessage || "Please try again.",
          );
        }
      } catch {
        // Ignore polling errors
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [analysisId, fetchAnalysis, nutritionClient]);

  /**
   * Confirm analysis and create meal
   */
  const confirmAnalysis = useCallback(async () => {
    if (!analysisId || !analysis) return;

    setConfirming(true);

    try {
      const result = await nutritionClient.confirmAnalysis(analysisId);

      Alert.alert("Meal Added!", `Added ${result.meal.name} to your meals.`, [
        {
          text: "View Meal",
          onPress: () => router.push(`/meals/${result.meal.id}` as any),
        },
        {
          text: "Done",
          onPress: () => router.back(),
        },
      ]);
    } catch (error) {
      if (error instanceof NutritionApiError) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Error", "Failed to save meal. Please try again.");
      }
    } finally {
      setConfirming(false);
    }
  }, [analysisId, analysis, nutritionClient, router]);

  /**
   * Cancel analysis
   */
  const cancelAnalysis = useCallback(async () => {
    if (!analysisId) return;

    Alert.alert(
      "Cancel Analysis?",
      "This will delete the analysis and image.",
      [
        { text: "Keep", style: "cancel" },
        {
          text: "Cancel Analysis",
          style: "destructive",
          onPress: async () => {
            try {
              await nutritionClient.cancelAnalysis(analysisId);
              router.back();
            } catch (error) {
              Alert.alert("Error", "Failed to cancel analysis.");
            }
          },
        },
      ],
    );
  }, [analysisId, nutritionClient, router]);

  /**
   * Render nutrition bar
   */
  const renderNutritionBar = (
    label: string,
    value: number,
    max: number,
    unit: string,
    color: string,
  ) => {
    const percentage = Math.min((value / max) * 100, 100);

    return (
      <View style={styles.nutritionRow}>
        <View style={styles.nutritionLabel}>
          <Text style={styles.nutritionLabelText}>{label}</Text>
          <Text style={styles.nutritionValue}>
            {Math.round(value)}
            {unit}
          </Text>
        </View>
        <View style={styles.nutritionBarContainer}>
          <View
            style={[
              styles.nutritionBarFill,
              { width: `${percentage}%`, backgroundColor: color },
            ]}
          />
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Stack.Screen options={{ title: "Analyzing..." }} />
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Analyzing your meal...</Text>
        <Text style={styles.loadingSubtext}>
          This usually takes 10-30 seconds
        </Text>
      </View>
    );
  }

  if (!analysis) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Analysis not found</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalCalories = analysis.foods.reduce(
    (sum, food) => sum + food.nutrition.caloriesKcal,
    0,
  );
  const totalProtein = analysis.foods.reduce(
    (sum, food) => sum + food.nutrition.proteinG,
    0,
  );
  const totalCarbs = analysis.foods.reduce(
    (sum, food) => sum + food.nutrition.carbsG,
    0,
  );
  const totalFat = analysis.foods.reduce(
    (sum, food) => sum + food.nutrition.fatG,
    0,
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: analysis.mealName || "Meal Analysis",
          headerRight: () => (
            <TouchableOpacity onPress={cancelAnalysis}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        style={styles.container}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={fetchAnalysis} />
        }
      >
        {/* Confidence Badge */}
        <View style={styles.confidenceContainer}>
          <View
            style={[
              styles.confidenceBadge,
              {
                backgroundColor:
                  (analysis.overallConfidence || 0) >= 0.8
                    ? "#34C759"
                    : (analysis.overallConfidence || 0) >= 0.6
                      ? "#FF9500"
                      : "#FF3B30",
              },
            ]}
          >
            <Text style={styles.confidenceText}>
              {Math.round((analysis.overallConfidence || 0) * 100)}% Confident
            </Text>
          </View>

          {analysis.needsUserReview && (
            <Text style={styles.reviewWarning}>
              ⚠️ Please review the detected foods
            </Text>
          )}
        </View>

        {/* Warnings */}
        {analysis.warnings.length > 0 && (
          <View style={styles.warningsContainer}>
            {analysis.warnings.map((warning, index) => (
              <Text key={index} style={styles.warningText}>
                {warning}
              </Text>
            ))}
          </View>
        )}

        {/* Detected Foods */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detected Foods</Text>

          {analysis.foods.map((food, index) => (
            <View key={food.id || index} style={styles.foodCard}>
              <View style={styles.foodHeader}>
                <Text style={styles.foodName}>{food.name}</Text>
                <Text style={styles.foodQuantity}>
                  {food.estimatedQuantity}
                  {food.unit}
                </Text>
              </View>

              <View style={styles.foodNutrition}>
                <Text style={styles.foodCalories}>
                  {Math.round(food.nutrition.caloriesKcal)} kcal
                </Text>
                <Text style={styles.foodMacros}>
                  P: {Math.round(food.nutrition.proteinG)}g • C:{" "}
                  {Math.round(food.nutrition.carbsG)}g • F:{" "}
                  {Math.round(food.nutrition.fatG)}g
                </Text>
              </View>

              {food.nutrition.source === "ai_estimate" && (
                <Text style={styles.aiEstimateBadge}>AI Estimate</Text>
              )}

              {food.warnings.length > 0 && (
                <View style={styles.foodWarnings}>
                  {food.warnings.map((warning, idx) => (
                    <Text key={idx} style={styles.foodWarningText}>
                      {warning}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Nutrition Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Summary</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.totalCalories}>
              {Math.round(totalCalories)}
            </Text>
            <Text style={styles.totalCaloriesLabel}>kcal</Text>

            <View style={styles.macroSummary}>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>
                  {Math.round(totalProtein)}g
                </Text>
                <Text style={styles.macroLabel}>Protein</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(totalCarbs)}g</Text>
                <Text style={styles.macroLabel}>Carbs</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroValue}>{Math.round(totalFat)}g</Text>
                <Text style={styles.macroLabel}>Fat</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Spacer for button */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            confirming && styles.confirmButtonDisabled,
          ]}
          onPress={confirmAnalysis}
          disabled={confirming}
        >
          {confirming ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={24} color="#FFFFFF" />
              <Text style={styles.confirmButtonText}>Add to My Meals</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </>
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
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
  },
  loadingSubtext: {
    fontSize: 14,
    color: "#8E8E93",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
  },
  errorText: {
    fontSize: 18,
    color: "#FF3B30",
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: "#007AFF",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelText: {
    color: "#FF3B30",
    fontSize: 16,
  },
  confidenceContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  confidenceBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  confidenceText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  reviewWarning: {
    flex: 1,
    fontSize: 14,
    color: "#FF9500",
  },
  warningsContainer: {
    margin: 16,
    marginTop: 0,
    padding: 12,
    backgroundColor: "#FFF3CD",
    borderRadius: 8,
  },
  warningText: {
    fontSize: 14,
    color: "#856404",
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#000000",
  },
  foodCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  foodHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
  },
  foodQuantity: {
    fontSize: 14,
    color: "#8E8E93",
  },
  foodNutrition: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  foodCalories: {
    fontSize: 18,
    fontWeight: "600",
    color: "#007AFF",
  },
  foodMacros: {
    fontSize: 14,
    color: "#8E8E93",
  },
  aiEstimateBadge: {
    marginTop: 8,
    fontSize: 12,
    color: "#8E8E93",
    fontStyle: "italic",
  },
  foodWarnings: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#FFF3CD",
    borderRadius: 6,
  },
  foodWarningText: {
    fontSize: 12,
    color: "#856404",
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  totalCalories: {
    fontSize: 56,
    fontWeight: "bold",
    color: "#007AFF",
  },
  totalCaloriesLabel: {
    fontSize: 18,
    color: "#8E8E93",
    marginBottom: 16,
  },
  macroSummary: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  macroItem: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: 20,
    fontWeight: "600",
    color: "#000000",
  },
  macroLabel: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  nutritionRow: {
    marginBottom: 12,
  },
  nutritionLabel: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  nutritionLabelText: {
    fontSize: 14,
    color: "#333333",
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  nutritionBarContainer: {
    height: 8,
    backgroundColor: "#E5E5EA",
    borderRadius: 4,
    overflow: "hidden",
  },
  nutritionBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 34,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5EA",
  },
  confirmButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#34C759",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  confirmButtonDisabled: {
    opacity: 0.7,
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
