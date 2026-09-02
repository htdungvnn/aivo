/**
 * Daily Intelligence Screen
 * Mobile dashboard for health tracking and readiness
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Types
interface ReadinessFactor {
  code: string;
  score: number;
  weight: number;
  contribution: number;
  status: string;
}

interface DailyAction {
  id: string;
  type: string;
  priority: number;
  title: string;
  description: string;
  status: string;
}

interface ReadinessData {
  date: string;
  score: number;
  level: "low" | "moderate" | "good" | "high";
  confidence: number;
  dataCompleteness: number;
  factors: ReadinessFactor[];
  recommendation: {
    action: string;
    intensityModifier: number;
    volumeModifier: number;
  };
}

// Color schemes
const LEVEL_COLORS = {
  low: "#EF4444",
  moderate: "#F59E0B",
  good: "#10B981",
  high: "#3B82F6",
};

const ACTION_COLORS: Record<string, string> = {
  start_workout: "#EF4444",
  light_workout: "#3B82F6",
  recovery: "#10B981",
  rest: "#6366F1",
  add_protein: "#F59E0B",
  drink_water: "#06B6D4",
  short_walk: "#8B5CF6",
  prepare_sleep: "#6366F1",
  complete_checkin: "#3B82F6",
};

const FACTOR_LABELS: Record<string, string> = {
  sleep: "Sleep",
  training_load: "Training Load",
  workout_completion: "Workout",
  form_quality: "Form Quality",
  muscle_soreness: "Soreness",
  energy: "Energy",
  stress: "Stress",
  resting_hr: "Resting HR",
  hrv: "HRV",
  steps: "Steps",
  hydration: "Hydration",
  nutrition: "Nutrition",
  recovery_days: "Recovery",
};

const ACTION_TITLES: Record<string, string> = {
  start_workout: "Start Workout",
  light_workout: "Light Training",
  recovery: "Recovery",
  rest: "Rest Day",
  add_protein: "Add Protein",
  drink_water: "Drink Water",
  short_walk: "Take a Walk",
  prepare_sleep: "Prepare for Sleep",
  complete_checkin: "Daily Check-in",
};

export default function IntelligenceScreen() {
  const [readiness, setReadiness] = useState<ReadinessData | null>(null);
  const [actions, setActions] = useState<DailyAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [checkInData, setCheckInData] = useState({
    energy: 5,
    stress: 5,
    muscleSoreness: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Mock data for demo
      const today = new Date().toISOString().split("T")[0];

      const mockReadiness: ReadinessData = {
        date: today,
        score: 72,
        level: "good",
        confidence: 0.85,
        dataCompleteness: 0.75,
        factors: [
          {
            code: "sleep",
            score: 85,
            weight: 0.2,
            contribution: 7,
            status: "positive",
          },
          {
            code: "training_load",
            score: 70,
            weight: 0.15,
            contribution: 3,
            status: "positive",
          },
          {
            code: "workout_completion",
            score: 90,
            weight: 0.1,
            contribution: 4,
            status: "positive",
          },
          {
            code: "energy",
            score: 75,
            weight: 0.1,
            contribution: 2.5,
            status: "positive",
          },
          {
            code: "stress",
            score: 65,
            weight: 0.08,
            contribution: 1.2,
            status: "neutral",
          },
          {
            code: "resting_hr",
            score: 80,
            weight: 0.06,
            contribution: 1.8,
            status: "positive",
          },
          {
            code: "hrv",
            score: 72,
            weight: 0.05,
            contribution: 1.1,
            status: "positive",
          },
          {
            code: "steps",
            score: 60,
            weight: 0.05,
            contribution: 0.5,
            status: "neutral",
          },
          {
            code: "hydration",
            score: 55,
            weight: 0.05,
            contribution: 0.25,
            status: "neutral",
          },
          {
            code: "nutrition",
            score: 70,
            weight: 0.05,
            contribution: 1,
            status: "positive",
          },
        ],
        recommendation: {
          action: "normal_training",
          intensityModifier: 0,
          volumeModifier: 0,
        },
      };

      const mockActions: DailyAction[] = [
        {
          id: "1",
          type: "start_workout",
          priority: 1,
          title: "Start Workout",
          description: "You're ready for your regular training.",
          status: "pending",
        },
        {
          id: "2",
          type: "drink_water",
          priority: 2,
          title: "Stay Hydrated",
          description: "Drink water throughout the day.",
          status: "pending",
        },
        {
          id: "3",
          type: "complete_checkin",
          priority: 3,
          title: "Daily Check-in",
          description: "Log how you feel today.",
          status: "pending",
        },
      ];

      setReadiness(mockReadiness);
      setActions(mockActions);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleActionComplete = (actionId: string) => {
    setActions(
      actions.map((a) =>
        a.id === actionId ? { ...a, status: "completed" as const } : a,
      ),
    );
  };

  const getReadinessColor = (level: string) =>
    LEVEL_COLORS[level as keyof typeof LEVEL_COLORS] || "#6B7280";
  const getActionColor = (type: string) => ACTION_COLORS[type] || "#6B7280";

  // Render readiness ring
  const renderReadinessRing = () => {
    if (!readiness) return null;

    const size = 160;
    const strokeWidth = 12;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const score = readiness.score;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    return (
      <View style={styles.ringContainer}>
        <Svg width={size} height={size}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getReadinessColor(readiness.level)}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={styles.ringCenter}>
          <Text
            style={[
              styles.ringScore,
              { color: getReadinessColor(readiness.level) },
            ]}
          >
            {score}
          </Text>
          <Text style={styles.ringLabel}>{readiness.level}</Text>
        </View>
      </View>
    );
  };

  // Render factor bar
  const renderFactorBar = (factor: ReadinessFactor) => {
    const width = (factor.score / 100) * (SCREEN_WIDTH - 80);
    const color =
      factor.status === "positive"
        ? "#10B981"
        : factor.status === "negative"
          ? "#EF4444"
          : "#F59E0B";

    return (
      <View key={factor.code} style={styles.factorRow}>
        <Text style={styles.factorLabel}>
          {FACTOR_LABELS[factor.code] || factor.code}
        </Text>
        <View style={styles.factorBarContainer}>
          <View
            style={[
              styles.factorBar,
              { width: Math.max(4, width), backgroundColor: color },
            ]}
          />
        </View>
        <Text style={styles.factorScore}>{factor.score}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Daily Intelligence</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString("en", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>

      {/* Readiness Card */}
      <View style={styles.card}>
        <View style={styles.readinessContainer}>
          {renderReadinessRing()}

          <View style={styles.readinessInfo}>
            <Text style={styles.cardTitle}>Readiness Score</Text>

            <View
              style={[
                styles.recommendationBadge,
                {
                  backgroundColor: getActionColor(
                    readiness?.recommendation.action || "",
                  ),
                },
              ]}
            >
              <Text style={styles.recommendationText}>
                {ACTION_TITLES[readiness?.recommendation.action || ""] ||
                  "Rest"}
              </Text>
            </View>

            <Text style={styles.recommendationDescription}>
              {readiness?.recommendation.action === "rest" &&
                "Your body needs rest today."}
              {readiness?.recommendation.action === "recovery" &&
                "Light activity can help recovery."}
              {readiness?.recommendation.action === "light_training" &&
                "A lighter workout is recommended."}
              {readiness?.recommendation.action === "normal_training" &&
                "You're ready for regular training."}
              {readiness?.recommendation.action === "high_intensity" &&
                "You're primed for a challenge!"}
            </Text>
          </View>
        </View>

        {/* Quality indicators */}
        <View style={styles.qualityRow}>
          <View style={styles.qualityItem}>
            <Text style={styles.qualityLabel}>Data Quality</Text>
            <View style={styles.qualityBar}>
              <View
                style={[
                  styles.qualityFill,
                  {
                    width: `${(readiness?.dataCompleteness || 0) * 100}%`,
                    backgroundColor: "#3B82F6",
                  },
                ]}
              />
            </View>
            <Text style={styles.qualityValue}>
              {Math.round((readiness?.dataCompleteness || 0) * 100)}%
            </Text>
          </View>
          <View style={styles.qualityItem}>
            <Text style={styles.qualityLabel}>Confidence</Text>
            <View style={styles.qualityBar}>
              <View
                style={[
                  styles.qualityFill,
                  {
                    width: `${(readiness?.confidence || 0) * 100}%`,
                    backgroundColor: "#10B981",
                  },
                ]}
              />
            </View>
            <Text style={styles.qualityValue}>
              {Math.round((readiness?.confidence || 0) * 100)}%
            </Text>
          </View>
        </View>
      </View>

      {/* Factor Breakdown */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Factor Breakdown</Text>
        <View style={styles.factorsContainer}>
          {readiness?.factors.map(renderFactorBar)}
        </View>
      </View>

      {/* Today's Actions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Today's Actions</Text>
          <TouchableOpacity onPress={() => setCheckInModalVisible(true)}>
            <Text style={styles.checkInButton}>Check-in</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.actionsContainer}>
          {actions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionItem,
                action.status === "completed" && styles.actionCompleted,
              ]}
              onPress={() =>
                action.status === "pending" && handleActionComplete(action.id)
              }
            >
              <View
                style={[
                  styles.actionIndicator,
                  { backgroundColor: getActionColor(action.type) },
                ]}
              />
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>{action.title}</Text>
                <Text style={styles.actionDescription}>
                  {action.description}
                </Text>
              </View>
              {action.status === "completed" ? (
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              ) : (
                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Disclaimer */}
      <View style={styles.disclaimer}>
        <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
        <Text style={styles.disclaimerText}>
          AIVO Readiness is an estimated wellness indicator. It does not provide
          medical advice.
        </Text>
      </View>

      {/* Bottom padding */}
      <View style={{ height: 100 }} />

      {/* Check-in Modal */}
      <Modal
        visible={checkInModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setCheckInModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Daily Check-in</Text>
            <TouchableOpacity onPress={() => setCheckInModalVisible(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.checkInItem}>
              <Text style={styles.checkInLabel}>Energy Level</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>{checkInData.energy}</Text>
                <View style={styles.slider}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.sliderDot,
                        checkInData.energy >= value && styles.sliderDotActive,
                      ]}
                      onPress={() =>
                        setCheckInData({ ...checkInData, energy: value })
                      }
                    />
                  ))}
                </View>
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>Low</Text>
                <Text style={styles.sliderLabelText}>High</Text>
              </View>
            </View>

            <View style={styles.checkInItem}>
              <Text style={styles.checkInLabel}>Stress Level</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>{checkInData.stress}</Text>
                <View style={styles.slider}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.sliderDot,
                        checkInData.stress >= value && styles.sliderDotActive,
                      ]}
                      onPress={() =>
                        setCheckInData({ ...checkInData, stress: value })
                      }
                    />
                  ))}
                </View>
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>Low</Text>
                <Text style={styles.sliderLabelText}>High</Text>
              </View>
            </View>

            <View style={styles.checkInItem}>
              <Text style={styles.checkInLabel}>Muscle Soreness</Text>
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderValue}>
                  {checkInData.muscleSoreness}
                </Text>
                <View style={styles.slider}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                    <TouchableOpacity
                      key={value}
                      style={[
                        styles.sliderDot,
                        styles.sliderDotSmall,
                        checkInData.muscleSoreness >= value &&
                          styles.sliderDotActive,
                      ]}
                      onPress={() =>
                        setCheckInData({
                          ...checkInData,
                          muscleSoreness: value,
                        })
                      }
                    />
                  ))}
                </View>
              </View>
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>None</Text>
                <Text style={styles.sliderLabelText}>Very Sore</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={() => {
              setCheckInModalVisible(false);
              fetchData();
            }}
          >
            <Text style={styles.submitButtonText}>Submit Check-in</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
    backgroundColor: "#F2F2F7",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#8E8E93",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
  },
  date: {
    fontSize: 14,
    color: "#8E8E93",
    marginTop: 4,
  },
  card: {
    margin: 16,
    marginBottom: 0,
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  readinessContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  ringContainer: {
    width: 160,
    height: 160,
    justifyContent: "center",
    alignItems: "center",
  },
  ringCenter: {
    position: "absolute",
    alignItems: "center",
  },
  ringScore: {
    fontSize: 42,
    fontWeight: "bold",
  },
  ringLabel: {
    fontSize: 14,
    color: "#8E8E93",
    textTransform: "capitalize",
  },
  readinessInfo: {
    flex: 1,
    marginLeft: 20,
  },
  recommendationBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
  },
  recommendationText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
  recommendationDescription: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
  },
  qualityRow: {
    flexDirection: "row",
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F2F2F7",
  },
  qualityItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  qualityLabel: {
    fontSize: 12,
    color: "#8E8E93",
    marginBottom: 6,
  },
  qualityBar: {
    height: 6,
    backgroundColor: "#F2F2F7",
    borderRadius: 3,
    overflow: "hidden",
  },
  qualityFill: {
    height: "100%",
    borderRadius: 3,
  },
  qualityValue: {
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
    marginTop: 4,
  },
  factorsContainer: {
    marginTop: 8,
  },
  factorRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  factorLabel: {
    width: 80,
    fontSize: 12,
    color: "#666",
  },
  factorBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#F2F2F7",
    borderRadius: 4,
    overflow: "hidden",
  },
  factorBar: {
    height: "100%",
    borderRadius: 4,
  },
  factorScore: {
    width: 32,
    fontSize: 12,
    fontWeight: "600",
    color: "#000",
    textAlign: "right",
  },
  checkInButton: {
    color: "#3B82F6",
    fontSize: 16,
    fontWeight: "600",
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  actionCompleted: {
    opacity: 0.6,
  },
  actionIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#000",
  },
  actionDescription: {
    fontSize: 13,
    color: "#8E8E93",
    marginTop: 2,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "flex-start",
    margin: 16,
    padding: 12,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: "#3B82F6",
    lineHeight: 18,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "#F2F2F7",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  modalContent: {
    padding: 20,
  },
  checkInItem: {
    marginBottom: 32,
  },
  checkInLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 12,
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  sliderValue: {
    width: 32,
    fontSize: 18,
    fontWeight: "600",
    color: "#3B82F6",
  },
  slider: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  sliderDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#E5E7EB",
  },
  sliderDotSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  sliderDotActive: {
    backgroundColor: "#3B82F6",
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  sliderLabelText: {
    fontSize: 12,
    color: "#8E8E93",
  },
  submitButton: {
    margin: 20,
    padding: 16,
    backgroundColor: "#3B82F6",
    borderRadius: 12,
    alignItems: "center",
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
