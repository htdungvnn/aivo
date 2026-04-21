import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { useMetrics } from "@/contexts/MetricsContext";
import { launchImageLibraryAsync, MediaTypeOptions, launchCameraAsync } from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { BodyHeatmap } from "./BodyHeatmap";
import { BodyMetricChart, HealthScoreGauge, MuscleBalanceChart } from "./BodyMetricChart";
import { PostureAnalysisCard } from "./PostureAnalysisCard";
import { fetchBodyMetrics, fetchHealthScore, uploadBodyImage, analyzeImage } from "../services/metrics-api";
import {
  Camera,
  Upload,
  Image as ImageIcon,
  ChevronRight,
  Activity,
  TrendingUp,
  Scale,
  Target,
} from "lucide-react-native";

export default function InsightsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { metrics, loading, refreshMetrics } = useMetrics();

  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "upload" | "trends">("overview");

  const scrollRef = useRef<ScrollView>(null);

  // Haptic feedback helper
  const triggerHaptic = async (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => {
    if (Platform.OS === "web") {return;}
    try {
      switch (type) {
        case "light":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case "medium":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case "heavy":
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case "success":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "warning":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case "error":
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      // Silently fail if haptics not available
      console.log("Haptics not available:", error);
    }
  };

  useEffect(() => {
    refreshMetrics();
  }, []);

  const handleTabChange = useCallback((tab: "overview" | "upload" | "trends") => {
    setActiveTab(tab);
    triggerHaptic("light");
  }, []);

  const handlePickImage = async () => {
    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      setImageFile(asset.uri);
      setError(null);
      setActiveTab("upload");
      await triggerHaptic("light");
    }
  };

  const handleTakePhoto = async () => {
    const result = await launchCameraAsync({
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setSelectedImage(asset.uri);
      setImageFile(asset.uri);
      setError(null);
      setActiveTab("upload");
      await triggerHaptic("light");
    }
  };

  const handleUpload = async () => {
    if (!imageFile || !user) {return;}

    setUploading(true);
    setError(null);

    try {
      // Get file info for filename
      const fileName = `body-photo-${Date.now()}.jpg`;
      const uploadResult = await uploadBodyImage(imageFile, fileName);

      await triggerHaptic("success");

      Alert.alert(
        "Upload Complete",
        "Your photo has been uploaded. Would you like to run AI analysis now?",
        [
          { text: "Later", style: "cancel" },
          {
            text: "Analyze",
            onPress: () => {
              void handleAnalyze(uploadResult.imageUrl);
            },
          },
        ]
      );

      setSelectedImage(null);
      setImageFile(null);
      setActiveTab("overview");
      await triggerHaptic("light");
    } catch (err: unknown) {
      await triggerHaptic("error");
      const message = err instanceof Error ? err.message : "Failed to upload image";
      setError(message);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async (imageUrl?: string) => {
    const url = imageUrl || selectedImage;
    if (!url) {return;}

    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeImage(url);
      await triggerHaptic("success");
      Alert.alert("Analysis Complete", "Your body metrics have been updated!");
      await refreshMetrics();
      setSelectedImage(null);
      setImageFile(null);
      setActiveTab("overview");
      await triggerHaptic("medium");
    } catch (err: unknown) {
      await triggerHaptic("error");
      const message = err instanceof Error ? err.message : "Failed to analyze image";
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setImageFile(null);
    setError(null);
  };

  // Prepare chart data
  const weightData = metrics
    .filter((m) => m.weight)
    .map((m) => ({
      date: new Date(m.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: m.weight!,
    }))
    .reverse();

  const bodyFatData = metrics
    .filter((m) => m.bodyFatPercentage)
    .map((m) => ({
      date: new Date(m.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: (m.bodyFatPercentage || 0) * 100,
    }))
    .reverse();

  const muscleData = metrics
    .filter((m) => m.muscleMass)
    .map((m) => ({
      date: new Date(m.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: m.muscleMass!,
    }))
    .reverse();

  // Mock muscle balance data (would come from API)
  const muscleBalanceData = [
    { muscle: "chest", current: 75 },
    { muscle: "back", current: 70 },
    { muscle: "shoulders", current: 65 },
    { muscle: "biceps", current: 60 },
    { muscle: "triceps", current: 55 },
    { muscle: "abs", current: 80 },
    { muscle: "quads", current: 85 },
    { muscle: "hamstrings", current: 60 },
    { muscle: "glutes", current: 70 },
    { muscle: "calves", current: 65 },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <View className="space-y-4">
            {/* Quick Stats */}
            <View className="flex-row justify-between gap-3">
              <View className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <View className="flex items-center gap-2 mb-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  <Text className="text-slate-400 text-sm">Weight</Text>
                </View>
                <Text className="text-xl font-bold text-white">
                  {metrics[0]?.weight?.toFixed(1) || "--"} kg
                </Text>
              </View>
              <View className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <View className="flex items-center gap-2 mb-2">
                  <Activity className="w-5 h-5 text-orange-400" />
                  <Text className="text-slate-400 text-sm">Body Fat</Text>
                </View>
                <Text className="text-xl font-bold text-white">
                  {metrics[0]?.bodyFatPercentage
                    ? `${(metrics[0].bodyFatPercentage * 100).toFixed(1)}%`
                    : "--"}
                </Text>
              </View>
            </View>

            {/* Health Score */}
            <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 items-center">
              <Text className="text-slate-200 font-semibold mb-4">Health Score</Text>
              <HealthScoreGauge score={72} category="good" />
            </View>

            {/* Body Heatmap */}
            <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <View className="flex items-center justify-between mb-4">
                <Text className="text-slate-200 font-semibold">Muscle Development</Text>
                <TouchableOpacity onPress={() => setActiveTab("trends")}>
                  <ChevronRight className="w-5 h-5 text-cyan-400" />
                </TouchableOpacity>
              </View>
              {metrics.length > 0 ? (
                <BodyHeatmap
                  vectorData={[
                    // Mock data - would come from API
                    { x: 50, y: 42, muscle: "chest", intensity: 0.7 },
                    { x: 50, y: 55, muscle: "back", intensity: 0.65 },
                    { x: 24, y: 38, muscle: "shoulders", intensity: 0.55 },
                  ]}
                />
              ) : (
                <View className="h-48 bg-slate-800/50 rounded-lg items-center justify-center">
                  <Text className="text-slate-400">No heatmap data</Text>
                </View>
              )}
            </View>

            {/* Posture */}
            <PostureAnalysisCard />
          </View>
        );

      case "upload":
        return (
          <View className="space-y-4">
            {selectedImage ? (
              <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <View className="relative">
                  <Image source={{ uri: selectedImage }} className="w-full aspect-[3/4] rounded-lg" resizeMode="cover" />
                  <TouchableOpacity
                    onPress={clearImage}
                    className="absolute top-2 right-2 p-2 bg-red-500/80 rounded-full"
                  >
                    <Text className="text-white font-bold">✕</Text>
                  </TouchableOpacity>
                </View>

                <View className="mt-4 space-y-3">
                  {uploading ? (
                    <View>
                      <Text className="text-slate-400 text-sm mb-1">Uploading...</Text>
                      <View className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <View className="h-full bg-cyan-500" style={{ width: "100%" }} />
                      </View>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => {
                          void handleUpload();
                        }}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 py-3 rounded-lg items-center flex-row justify-center gap-2"
                      >
                        <Upload className="w-5 h-5 text-white" />
                        <Text className="text-white font-semibold">Upload Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          void handleAnalyze(selectedImage);
                        }}
                        disabled={analyzing}
                        className="bg-slate-800 py-3 rounded-lg items-center flex-row justify-center gap-2 border border-slate-700"
                      >
                        {analyzing ? (
                          <ActivityIndicator color="#06b6d4" />
                        ) : (
                          <ImageIcon className="w-5 h-5 text-cyan-400" />
                        )}
                        <Text className="text-cyan-400 font-semibold">
                          {analyzing ? "Analyzing..." : "Run AI Analysis"}
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}

                  {error && (
                    <View className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <Text className="text-red-400 text-sm">{error}</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <Text className="text-slate-200 font-semibold mb-4">Select Photo</Text>

                <TouchableOpacity
                  onPress={() => {
                    void handleTakePhoto();
                  }}
                  className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl p-6 items-center mb-3"
                >
                  <Camera className="w-12 h-12 text-cyan-400 mb-2" />
                  <Text className="text-white font-medium mb-1">Take Photo</Text>
                  <Text className="text-slate-400 text-sm">Use camera for fresh photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handlePickImage}
                  className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl p-6 items-center"
                >
                  <ImageIcon className="w-12 h-12 text-cyan-400 mb-2" />
                  <Text className="text-white font-medium mb-1">Choose from Gallery</Text>
                  <Text className="text-slate-400 text-sm">Select existing body photo</Text>
                </TouchableOpacity>

                {error && (
                  <View className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <Text className="text-red-400 text-sm">{error}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Tips */}
            <View className="bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/20 rounded-xl p-4">
              <Text className="text-cyan-400 font-semibold mb-3">Tips for Best Results</Text>
              <View className="space-y-2">
                {[
                  "Stand straight with arms slightly away from body",
                  "Wear form-fitting clothing",
                  "Good, even lighting without harsh shadows",
                  "Front view works best for muscle analysis",
                  "Take photos at consistent times for tracking",
                ].map((tip, i) => (
                  <View key={i} className="flex-row items-start gap-2">
                    <Text className="text-cyan-400 mt-0.5">•</Text>
                    <Text className="text-slate-300 text-sm flex-1">{tip}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        );

      case "trends":
        return (
          <View className="space-y-4">
            {weightData.length > 0 && (
              <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <View className="flex items-center gap-2 mb-3">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  <Text className="text-slate-200 font-semibold">Weight Progress</Text>
                </View>
                <BodyMetricChart data={weightData} metric="weight" height={200} />
              </View>
            )}

            {bodyFatData.length > 0 && (
              <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <View className="flex items-center gap-2 mb-3">
                  <Activity className="w-5 h-5 text-orange-400" />
                  <Text className="text-slate-200 font-semibold">Body Fat %</Text>
                </View>
                <BodyMetricChart data={bodyFatData} metric="bodyFat" height={200} />
              </View>
            )}

            {muscleData.length > 0 && (
              <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <View className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-400" />
                  <Text className="text-slate-200 font-semibold">Muscle Mass</Text>
                </View>
                <BodyMetricChart data={muscleData} metric="muscleMass" height={200} />
              </View>
            )}

            <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <View className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-purple-400" />
                <Text className="text-slate-200 font-semibold">Muscle Balance</Text>
              </View>
              <MuscleBalanceChart data={muscleBalanceData} height={250} />
            </View>
          </View>
        );
    }
  };

  return (
    <ScrollView ref={scrollRef} className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <View className="p-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-white mb-1">Body Insights</Text>
          <Text className="text-slate-400 text-sm">
            Track your physique with AI-powered analysis
          </Text>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row bg-slate-800/50 rounded-lg p-1 mb-4">
          {[
            { key: "overview", label: "Overview", icon: Activity },
            { key: "upload", label: "Upload", icon: Upload },
            { key: "trends", label: "Trends", icon: TrendingUp },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => handleTabChange(tab.key as any)}
              className={`flex-1 py-2 px-3 rounded-md flex-row items-center justify-center gap-1 ${
                activeTab === tab.key ? "bg-cyan-600" : ""
              }`}
            >
              <tab.icon className={`w-4 h-4 ${activeTab === tab.key ? "text-white" : "text-slate-400"}`} />
              <Text className={`text-xs font-medium ${activeTab === tab.key ? "text-white" : "text-slate-400"}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {renderTabContent()}

        {/* Loading state */}
        {loading && (
          <View className="py-8 items-center">
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text className="text-slate-400 text-sm mt-2">Loading metrics...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
