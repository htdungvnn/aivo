import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AvatarViewer2D from "./AvatarViewer2D";
import TimeSlider from "./TimeSlider";
import AdherenceAdjuster from "./AdherenceAdjuster";

const COLORS = {
  primary: '#007AFF',
  background: '#f8f9fa',
  white: '#fff',
  textPrimary: '#1a1a1a',
  textSecondary: '#666',
  textTertiary: '#999',
  border: '#e0e0e0',
  success: '#34C759',
  warning: '#FF9500',
  shadow: '#000',
  primaryTransparent: '#007AFF20',
};

// API types
interface MorphTargets {
  body_scale: number;
  fat_distribution: Array<{ region: string; intensity: number }>;
  muscle_development: Array<{ muscle_group: string; development_factor: number }>;
  skin_tightness: number;
  posture_adjustment: number;
}

interface ProjectionData {
  id: string;
  projectedWeight: number;
  projectedBodyFatPct: number;
  projectedMuscleMass: number;
  confidence: number;
  narrative: string;
  morphTargets: MorphTargets;
  scenarios: {
    consistent_performance: Array<{ weight_kg: number; body_fat_percentage: number; muscle_mass_kg: number }>;
    best_case: Array<{ weight_kg: number }>;
    worst_case: Array<{ weight_kg: number }>;
  };
}

interface AvatarModel {
  id: string;
  currentWeight: number;
  currentBodyFatPct: number;
  currentMuscleMass: number;
  heightCm: number;
  somatotype: string;
  morphTargets: MorphTargets;
  avatarStyle: string;
  showMuscleDefinitions: boolean;
}

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080";

// Helper to get auth token (implement based on your auth system)
async function getAuthToken(): Promise<string> {
  // In a real app, retrieve from AsyncStorage or secure storage
  const token = ""; // TODO: Implement token retrieval
  return token;
}

export const DigitalTwinScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarModel, setAvatarModel] = useState<AvatarModel | null>(null);
  const [projection, setProjection] = useState<ProjectionData | null>(null);
  const [selectedWeeks, setSelectedWeeks] = useState(8);
  const [adherence, setAdherence] = useState(1.0);

  // Calibrate avatar from latest metrics
  const calibrateAvatar = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/digital-twin/calibrate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          avatarStyle: "realistic",
          showMuscleDefinitions: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to calibrate avatar");
      }

      const data = await response.json();
      setAvatarModel({
        id: data.data.avatarModelId,
        currentWeight: 0, // Will be populated from API response
        currentBodyFatPct: 0,
        currentMuscleMass: 0,
        heightCm: 170,
        somatotype: data.data.somatotype.somatotype,
        morphTargets: data.data.morphTargets,
        avatarStyle: "realistic",
        showMuscleDefinitions: true,
      });
    } catch {
      Alert.alert("Calibration Failed", "Could not calibrate avatar. Please ensure you have body metrics recorded.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user's avatar model on mount
  const fetchAvatarModel = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/digital-twin/avatar-model`, {
        headers: {
          Authorization: `Bearer ${await getAuthToken()}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // No avatar model yet - trigger calibration
          await calibrateAvatar();
          return;
        }
        throw new Error("Failed to fetch avatar model");
      }

      const data = await response.json();
      setAvatarModel(data.data);
    } catch {
      Alert.alert("Error", "Failed to load avatar model");
    }
  }, [calibrateAvatar]);

  // Generate projection with current settings
  const generateProjection = useCallback(async () => {
    if (!avatarModel) {
      Alert.alert("No Avatar", "Please calibrate your avatar first");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/digital-twin/project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await getAuthToken()}`,
        },
        body: JSON.stringify({
          timeHorizonDays: selectedWeeks * 7, // Convert weeks to days
          adherenceFactor: adherence,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate projection");
      }

      const data = await response.json();
      setProjection(data.data);
    } catch {
      Alert.alert("Error", "Failed to generate projection");
    } finally {
      setLoading(false);
    }
  }, [avatarModel, selectedWeeks, adherence]);

  // Initial load
  useEffect(() => {
    fetchAvatarModel();
  }, [fetchAvatarModel]);

  // Generate new projection when settings change (with debounce)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (avatarModel) {
        generateProjection();
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timer);
  }, [avatarModel, selectedWeeks, adherence, generateProjection]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAvatarModel()
      .finally(() => setRefreshing(false));
  };

  const currentMorphTargets = projection?.morphTargets || avatarModel?.morphTargets;

  if (loading && !projection) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading your digital twin...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Digital Twin</Text>
          <Text style={styles.subtitle}>See your future self</Text>
        </View>

        {/* Avatar Display */}
        <View style={styles.avatarContainer}>
          {currentMorphTargets && (
            <AvatarViewer2D
              morphTargets={currentMorphTargets}
              baseColor="#e0ac69"
              muscleColor="#c9784a"
              showMuscleDefinitions={avatarModel?.showMuscleDefinitions}
              style={styles.avatar}
            />
          )}
        </View>

        {/* Somatotype badge */}
        {avatarModel && (
          <View style={styles.somatotypeBadge}>
            <Text style={styles.somatotypeText}>
              {avatarModel.somatotype.charAt(0).toUpperCase() + avatarModel.somatotype.slice(1)}
            </Text>
          </View>
        )}

        {/* Time Slider */}
        <View style={styles.controlPanel}>
          <TimeSlider
            selectedWeeks={selectedWeeks}
            onWeeksChange={setSelectedWeeks}
            minWeeks={4}
            maxWeeks={12}
            step={4}
          />
        </View>

        {/* Adherence Adjuster */}
        <View style={styles.controlPanel}>
          <AdherenceAdjuster
            initialValue={adherence}
            onChange={setAdherence}
          />
        </View>

        {/* Projection Stats */}
        {projection && (
          <View style={styles.statsContainer}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Projected Weight</Text>
              <Text style={styles.statValue}>{projection.projectedWeight.toFixed(1)} kg</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Body Fat</Text>
              <Text style={styles.statValue}>{projection.projectedBodyFatPct.toFixed(1)}%</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Muscle Mass</Text>
              <Text style={styles.statValue}>{projection.projectedMuscleMass.toFixed(1)} kg</Text>
            </View>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Confidence</Text>
              <Text style={[styles.statValue, { color: projection.confidence > 0.7 ? COLORS.success : COLORS.warning }]}>
                {Math.round(projection.confidence * 100)}%
              </Text>
            </View>
          </View>
        )}

        {/* Narrative */}
        {projection?.narrative && (
          <View style={styles.narrativeContainer}>
            <Text style={styles.narrativeLabel}>Your Path Forward</Text>
            <Text style={styles.narrativeText}>{projection.narrative}</Text>
          </View>
        )}

        {/* Action Button */}
        <View style={styles.actionContainer}>
          <Text style={styles.actionHint}>
            Adjust the sliders to see how different adherence levels affect your results
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    paddingVertical: 32,
    marginBottom: 16,
  },
  avatar: {
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  somatotypeBadge: {
    alignSelf: "center",
    backgroundColor: COLORS.primaryTransparent,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  somatotypeText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
    textTransform: "capitalize",
  },
  controlPanel: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statsContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statLabel: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  narrativeContainer: {
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
    padding: 16,
  },
  narrativeLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  narrativeText: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  actionContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  actionHint: {
    fontSize: 13,
    color: COLORS.textTertiary,
    textAlign: "center",
    fontStyle: "italic",
  },
});

export default DigitalTwinScreen;
