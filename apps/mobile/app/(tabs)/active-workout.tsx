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
import { Dumbbell, Timer, ChevronRight, AlertTriangle, CheckCircle, XCircle, Zap } from "lucide-react-native";
import { liveWorkoutAPI, type LiveWorkoutSession, type LiveAdjustmentResponse } from "../services/live-workout-api";

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
  const [fatigueLevel, setFatigueLevel] = useState(0);
  const [fatigueCategory, setFatigueCategory] = useState<"fresh" | "moderate" | "fatigued" | "exhausted">("fresh");
  const [recentRPERecords, setRecentRPERecords] = useState<Array<{
    rpe: number;
    weight?: number;
    repsCompleted?: number;
    restTimeSeconds?: number;
    setNumber: number;
  }>>([]);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const restTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Start workout session on mount
  useEffect(() => {
    startSession();
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, []);

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
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restTimerActive, remainingRest]);

  const startSession = async () => {
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
  };

  const startPolling = useCallback(() => {
    // Poll for adjustments every 3 seconds
    pollingRef.current = setInterval(fetchAdjustment, 3000);
  }, []);

  const fetchAdjustment = async () => {
    if (!session) return;

    // Fetch the latest session state
    const sessionResult = await liveWorkoutAPI.getSession(session.id);
    if (sessionResult.success && sessionResult.session) {
      setSession(sessionResult.session);
      setFatigueLevel(sessionResult.session.fatigueLevel);
      setFatigueCategory(sessionResult.session.fatigueCategory);
    }

    // Request AI adjustment based on recent RPE records
    // For demo, we use mock data - in production, this would be based on actual recent sets
    if (recentRPERecords.length > 0) {
      const adjustmentResult = await liveWorkoutAPI.getAdjustment({
        sessionId: session.id,
        currentWeight: parseFloat(weight) || 100, // fallback
        targetReps: 10, // from workout template
        remainingSets: 5, // calculate from total sets
        exerciseType: "squat", // from current exercise
        isWarmup: false,
        hasSpotter: hasSpotter,
        recentRPERecords: recentRPERecords.slice(0, 5), // last 5 sets
      });

      if (adjustmentResult.success && adjustmentResult.adjustment) {
        setAdjustment(adjustmentResult);

        // Animate the adjustment notification
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Auto-fade out after 5 seconds
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start();
        }, 5000);
      }
    }
  };

  const logRPE = async () => {
    if (!session) return;

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
      // Animate adjustment notification
      await fetchAdjustmentWithAnimation();

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

  const fetchAdjustmentWithAnimation = async () => {
    // In a real implementation, we'd send recent RPE records to the server
    // For now, show a mock adjustment based on fatigue

    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();

    // Auto-fade out after 5 seconds
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }, 5000);
  };

  const startRest = () => {
    if (!session) return;
    setRemainingRest(session.idealRestSeconds);
    setRestTimerActive(true);
  };

  const skipRest = () => {
    setRemainingRest(0);
    setRestTimerActive(false);
  };

  const endWorkout = async () => {
    if (!session) return;

    Alert.alert(
      "End Workout",
      "Are you sure you want to end this workout?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End",
          style: "destructive",
          onPress: async () => {
            const result = await liveWorkoutAPI.endSession(session.id);
            if (result.success) {
              router.back();
            } else {
              Alert.alert("Error", result.error || "Failed to end workout");
            }
          },
        },
      ]
    );
  };

  const getAdjustmentColor = (type: string) => {
    switch (type) {
      case "reduce_weight": return "#ef4444";
      case "reduce_reps": return "#f59e0b";
      case "add_rest": return "#3b82f6";
      case "stop": return "#991b1b";
      default: return "#10b981";
    }
  };

  const getFatigueColor = (category: string) => {
    switch (category) {
      case "fresh": return "#10b981";
      case "moderate": return "#3b82f6";
      case "fatigued": return "#f59e0b";
      case "exhausted": return "#ef4444";
      default: return "#9ca3af";
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
            <Timer size={24} color="#3b82f6" />
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
                placeholderTextColor="#6b7280"
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
                placeholderTextColor="#6b7280"
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
                placeholderTextColor="#6b7280"
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.logButton, (!weight || !repsCompleted || !rpe) && styles.logButtonDisabled]}
            onPress={logRPE}
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
            <Timer size={16} color="#3b82f6" />
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
    backgroundColor: "#030712",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#030712",
  },
  loadingText: {
    color: "#9ca3af",
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
    borderBottomColor: "#1f2937",
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: "#3b82f6",
    fontSize: 16,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  endButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#991b1b",
    borderRadius: 8,
  },
  endButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  fatigueCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
  },
  cardTitle: {
    color: "#fff",
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
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  metricLabel: {
    color: "#9ca3af",
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
    color: "#d1d5db",
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  adjustmentDetail: {
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 4,
  },
  adjustmentConfidence: {
    color: "#6b7280",
    fontSize: 11,
    marginTop: 8,
    fontStyle: "italic",
  },
  restTimerCard: {
    backgroundColor: "#111827",
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  restTimerText: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "bold",
    fontVariant: ["tabular-nums"],
  },
  restTimerLabel: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: "auto",
  },
  skipRestButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#374151",
    borderRadius: 8,
  },
  skipRestText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  setLoggerCard: {
    backgroundColor: "#111827",
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
    color: "#9ca3af",
    fontSize: 12,
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#1f2937",
    borderRadius: 8,
    padding: 12,
    color: "#fff",
    fontSize: 16,
    borderWidth: 1,
    borderColor: "#374151",
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
    backgroundColor: "#1f2937",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#374151",
  },
  rpeButtonActive: {
    backgroundColor: "#3b82f6",
    borderColor: "#3b82f6",
  },
  rpeButtonText: {
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600",
  },
  rpeButtonTextActive: {
    color: "#fff",
  },
  logButton: {
    backgroundColor: "#3b82f6",
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  logButtonDisabled: {
    backgroundColor: "#374151",
  },
  logButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  restButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1f2937",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#374151",
  },
  restButtonText: {
    color: "#3b82f6",
    fontSize: 14,
    fontWeight: "600",
  },
  statsCard: {
    backgroundColor: "#111827",
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
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  statLabel: {
    color: "#9ca3af",
    fontSize: 11,
    marginTop: 4,
  },
});
