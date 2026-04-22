import { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Timer, ChevronRight, CheckCircle, XCircle, Zap } from "lucide-react-native";
import { liveWorkoutAPI, type LiveWorkoutSession, type LiveAdjustmentResponse } from "../services/live-workout-api";

const COLORS = {
  background: "#030712",
  surface: "#111827",
  border: "#374151",
  textMuted: "#9ca3af",
  textPrimary: "#ffffff",
  primary: "#3b82f6",
  danger: "#991b1b",
  gray: "#6b7280",
  lightGray: "#d1d5db",
  textDark: "#1f2937",
  overlayLight: "rgba(0,0,0,0.1)",
  overlayMedium: "rgba(0,0,0,0.2)",
} as const;

const SCREEN_WIDTH = Dimensions.get("window").width;

interface ActiveWorkoutScreenProps {
  workoutName?: string;
  targetRPE?: number;
  idealRestSeconds?: number;
  hasSpotter?: boolean;
}

export default function ActiveWorkoutScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<ActiveWorkoutScreenProps>();

  const workoutName = params.workoutName || "Workout";
  const targetRPE = params.targetRPE || 8;
  const idealRestSeconds = params.idealRestSeconds || 90;
  const hasSpotter = params.hasSpotter || false;
  const [session, setSession] = useState<LiveWorkoutSession | null>(null);
  const [currentSet, setCurrentSet] = useState(1);
  const [weight, setWeight] = useState("");
  const [repsCompleted, setRepsCompleted] = useState("");
  const [rpe, setRpe] = useState("");
  const [restTimeSeconds, setRestTimeSeconds] = useState(0);
  const [adjustment, setAdjustment] = useState<LiveAdjustmentResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [restTimerActive, setRestTimerActive] = useState(false);
  const [remainingRest, setRemainingRest] = useState(0);
  const [fatigueLevel] = useState(0);
  const [fatigueCategory] = useState<"fresh" | "moderate" | "fatigued" | "exhausted">("fresh");
  const [recentRPERecords, setRecentRPERecords] = useState<Array<{
    rpe: number;
    weight?: number;
    repsCompleted?: number;
    restTimeSeconds?: number;
    setNumber: number;
  }>>([]);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Fetch AI adjustment and session state
  const fetchAdjustment = useCallback(async () => {
    if (!session) {return;}

    // Fetch the latest session state
    const sessionResult = await liveWorkoutAPI.getSession(session.id);
    if (sessionResult.success && sessionResult.session) {
      setSession(sessionResult.session);
    }

    // Request AI adjustment based on recent RPE records
    if (recentRPERecords.length > 0) {
      const adjustmentResult = await liveWorkoutAPI.getAdjustment({
        sessionId: session.id,
        currentWeight: parseFloat(weight) || 100,
        targetReps: 10,
        remainingSets: 5,
        exerciseType: "squat",
        isWarmup: false,
        hasSpotter: hasSpotter,
        recentRPERecords: recentRPERecords.slice(0, 5),
      });

      if (adjustmentResult.success && adjustmentResult.adjustment) {
        setAdjustment(adjustmentResult.adjustment);

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 5000);
      }
    }
  }, [session, recentRPERecords, weight, hasSpotter, fadeAnim]);

  // Start polling for adjustments
  const startPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    pollingRef.current = setInterval(() => {
      void fetchAdjustment();
    }, 3000);
  }, [fetchAdjustment]);

  // Start workout session
  const startSession = useCallback(async () => {
    setIsLoading(true);
    const result = await liveWorkoutAPI.startSession({
      name: workoutName,
      targetRPE,
      idealRestSeconds,
      hasSpotter,
    });

    if (result.success && result.session) {
      setSession(result.session);
      startPolling();
    } else {
      Alert.alert("Error", result.error || "Failed to start workout");
      router.back();
    }
    setIsLoading(false);
  }, [workoutName, targetRPE, idealRestSeconds, hasSpotter, startPolling, router]);

  // Rest timer logic
  useEffect(() => {
    if (restTimerActive && remainingRest > 0) {
      restTimerRef.current = setInterval(() => {
        setRemainingRest((prev) => {
          if (prev <= 1) {
            setRestTimerActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (restTimerRef.current) {clearInterval(restTimerRef.current);}
    };
  }, [restTimerActive, remainingRest]);

  // Start workout session on mount
  useEffect(() => {
    startSession();
    return () => {
      if (pollingRef.current) {clearInterval(pollingRef.current);}
      if (restTimerRef.current) {clearInterval(restTimerRef.current);}
    };
  }, [startSession]);

  const logRPE = async () => {
    if (!session) {return;}

    const weightNum = parseFloat(weight);
    const repsNum = parseInt(repsCompleted);
    const rpeNum = parseInt(rpe);

    if (isNaN(weightNum) || isNaN(repsNum) || isNaN(rpeNum)) {
      Alert.alert("Invalid Input", "Please fill in all fields");
      return;
    }

    setIsLoading(true);
    const result = await liveWorkoutAPI.logRPE({
      sessionId: session.id,
      setNumber: currentSet,
      exerciseName: "Main Exercise", // TODO: get from workout template
      weight: weightNum,
      plannedReps: 10, // TODO: get from workout template
      completedReps: repsNum,
      rpe: rpeNum,
      restTimeSeconds: restTimeSeconds,
    });

    if (result.success) {
      // Add to recent RPE records for adjustment calculation
      setRecentRPERecords((prev) => [
        {
          rpe: rpeNum,
          weight: weightNum,
          repsCompleted: repsNum,
          restTimeSeconds: restTimeSeconds,
          setNumber: currentSet,
        },
        ...prev,
      ].slice(0, 5)); // Keep only last 5

      // Move to next set
      setCurrentSet((prev) => prev + 1);
      setWeight("");
      setRepsCompleted("");
      setRpe("");
      setRestTimeSeconds(0);
      setRestTimerActive(false);

      Alert.alert("Set Logged", `Set ${currentSet} recorded. RPE: ${rpeNum}`);
    } else {
      Alert.alert("Error", result.error || "Failed to log RPE");
    }
    setIsLoading(false);
  };

  const startRest = () => {
    if (!session) {return;}
    setRemainingRest(session.idealRestSeconds);
    setRestTimerActive(true);
  };

  const skipRest = () => {
    setRemainingRest(0);
    setRestTimerActive(false);
  };

  const endWorkout = () => {
    if (!session) {return;}

    Alert.alert(
      "End Workout",
      "Are you sure you want to end this workout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End",
          style: "destructive",
          onPress: () => {
            void (async () => {
              const result = await liveWorkoutAPI.endSession(session.id);
              if (result.success) {
                router.back();
              } else {
                Alert.alert("Error", result.error || "Failed to end workout");
              }
            })();
          },
        },
      ]
    );
  };

  const getAdjustmentColor = (type: string) => {
    switch (type) {
      case "reduce_weight": return "#ef4444";
      case "reduce_reps": return "#f59e0b";
      case "add_rest": return COLORS.primary;
      case "stop": return COLORS.danger;
      default: return "#10b981";
    }
  };

  const getFatigueColor = (category: string) => {
    switch (category) {
      case "fresh": return "#10b981";
      case "moderate": return COLORS.primary;
      case "fatigued": return "#f59e0b";
      case "exhausted": return "#ef4444";
      default: return COLORS.textMuted;
    }
  };

  const getAdjustmentIcon = (type: string) => {
    switch (type) {
      case "reduce_weight": return <Zap size={20} color={getAdjustmentColor(type)} />;
      case "reduce_reps": return <ChevronRight size={20} color={getAdjustmentColor(type)} />;
      case "add_rest": return <Timer size={20} color={getAdjustmentColor(type)} />;
      case "stop": return <XCircle size={20} color={getAdjustmentColor(type)} />;
      default: return <CheckCircle size={20} color={getAdjustmentColor(type)} />;
    }
  };

  if (isLoading && !session) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Starting workout...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{workoutName}</Text>
        <TouchableOpacity onPress={endWorkout} style={styles.endButton}>
          <Text style={styles.endButtonText}>End</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Fatigue Overview */}
        <View style={[styles.fatigueCard, { borderLeftColor: getFatigueColor(fatigueCategory) }]}>
          <Text style={styles.cardTitle}>Fatigue Status</Text>
          <View style={styles.fatigueMetrics}>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{fatigueLevel}%</Text>
              <Text style={styles.metricLabel}>Fatigue</Text>
            </View>
            <View style={styles.metric}>
              <Text style={[styles.metricValue, { color: getFatigueColor(fatigueCategory) }]}>
                {fatigueCategory}
              </Text>
              <Text style={styles.metricLabel}>Status</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricValue}>{targetRPE}</Text>
              <Text style={styles.metricLabel}>Target RPE</Text>
            </View>
          </View>
        </View>

        {/* AI Adjustment Banner */}
        {adjustment?.adjustment && adjustment.adjustment.adjustmentType !== "keep" && (
          <Animated.View
            style={[
              styles.adjustmentBanner,
              {
                backgroundColor: `${getAdjustmentColor(adjustment.adjustment.adjustmentType)}20`,
                borderColor: getAdjustmentColor(adjustment.adjustment.adjustmentType),
                opacity: fadeAnim,
              },
            ]}
          >
            <View style={styles.adjustmentHeader}>
              {getAdjustmentIcon(adjustment.adjustment.adjustmentType)}
              <Text style={[styles.adjustmentTitle, { color: getAdjustmentColor(adjustment.adjustment.adjustmentType) }]}>
                {adjustment.adjustment.adjustmentType.replace("_", " ").toUpperCase()}
              </Text>
            </View>
            <Text style={styles.adjustmentReasoning}>{adjustment.adjustment.reasoning}</Text>
            {adjustment.adjustment.weightPercent && (
              <Text style={styles.adjustmentDetail}>
                Weight adjustment: {adjustment.adjustment.weightPercent > 0 ? "+" : ""}
                {adjustment.adjustment.weightPercent}%
              </Text>
            )}
            {adjustment.adjustment.repAdjustment && (
              <Text style={styles.adjustmentDetail}>
                Reps: {adjustment.adjustment.repAdjustment > 0 ? "+" : ""}
                {adjustment.adjustment.repAdjustment}
              </Text>
            )}
            {adjustment.adjustment.additionalRestSeconds && (
              <Text style={styles.adjustmentDetail}>
                Add {adjustment.adjustment.additionalRestSeconds}s rest
              </Text>
            )}
            <Text style={styles.adjustmentConfidence}>
              Confidence: {Math.round(adjustment.adjustment.confidence * 100)}%
            </Text>
          </Animated.View>
        )}

        {/* Rest Timer */}
        {restTimerActive && (
          <View style={styles.restTimerCard}>
            <Timer size={24} color={COLORS.primary} />
            <Text style={styles.restTimerText}>
              {Math.floor(remainingRest / 60)}:{String(remainingRest % 60).padStart(2, "0")}
            </Text>
            <Text style={styles.restTimerLabel}>REST</Text>
            <TouchableOpacity onPress={skipRest} style={styles.skipRestButton}>
              <Text style={styles.skipRestText}>Skip</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Set Logger */}
        <View style={styles.setLoggerCard}>
          <Text style={styles.cardTitle}>Set {currentSet}</Text>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Weight (kg)</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.gray}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Reps</Text>
              <TextInput
                style={styles.input}
                value={repsCompleted}
                onChangeText={setRepsCompleted}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.gray}
              />
            </View>
          </View>

          <View style={styles.rpeSelector}>
            <Text style={styles.inputLabel}>RPE (1-10)</Text>
            <View style={styles.rpeButtons}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.rpeButton,
                    parseInt(rpe) === value && styles.rpeButtonActive,
                  ]}
                  onPress={() => setRpe(value.toString())}
                >
                  <Text style={[
                    styles.rpeButtonText,
                    parseInt(rpe) === value && styles.rpeButtonTextActive,
                  ]}>
                    {value}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputRow}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rest Time (s)</Text>
              <TextInput
                style={styles.input}
                value={restTimeSeconds.toString()}
                onChangeText={(text) => setRestTimeSeconds(parseInt(text) || 0)}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.gray}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.logButton, (!weight || !repsCompleted || !rpe) && styles.logButtonDisabled]}
            onPress={() => void logRPE()}
            disabled={!weight || !repsCompleted || !rpe || isLoading}
          >
            <Text style={styles.logButtonText}>
              {isLoading ? "Logging..." : "Log Set"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restButton}
            onPress={startRest}
          >
            <Timer size={16} color={COLORS.primary} />
            <Text style={styles.restButtonText}>Start Rest Timer</Text>
          </TouchableOpacity>
        </View>

        {/* Session Stats */}
        {session && (
          <View style={styles.statsCard}>
            <Text style={styles.cardTitle}>Session Progress</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{session.setsCompleted}</Text>
                <Text style={styles.statLabel}>Sets Done</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{session.totalCompletedVolume.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Volume</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{session.totalPlannedVolume.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Target Volume</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  loadingText: {
    color: COLORS.textMuted,
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.textDark,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: "600",
  },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
  },
  endButtonText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fatigueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  fatigueMetrics: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  metric: {
    alignItems: "center",
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "bold",
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  adjustmentBanner: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  adjustmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  adjustmentTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  adjustmentReasoning: {
    color: COLORS.lightGray,
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  adjustmentDetail: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 4,
  },
  adjustmentConfidence: {
    color: COLORS.gray,
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
  restTimerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  restTimerText: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
  restTimerLabel: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
    marginLeft: "auto",
  },
  skipRestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.border,
    borderRadius: 8,
  },
  skipRestText: {
    color: COLORS.textMuted,
    fontSize: 12,
  },
  setLoggerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    color: COLORS.textMuted,
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.textDark,
    borderRadius: 8,
    padding: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rpeSelector: {
    marginBottom: 16,
  },
  rpeButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rpeButton: {
    width: (SCREEN_WIDTH - 32 - 48) / 10,
    aspectRatio: 1,
    backgroundColor: COLORS.textDark,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  rpeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  rpeButtonText: {
    color: COLORS.textMuted,
    fontSize: 12,
    fontWeight: "600",
  },
  rpeButtonTextActive: {
    color: COLORS.textPrimary,
  },
  logButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  logButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  logButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  restButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.textDark,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  restButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "600",
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 4,
  },
});
