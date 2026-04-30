import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  FlatList,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useMetrics } from "@/contexts/MetricsContext";
import RecoveryDashboard from "@/components/biometric/RecoveryDashboard";
import { launchImageLibraryAsync, MediaTypeOptions, launchCameraAsync } from "expo-image-picker";
import { BodyMetricChart, HealthScoreGauge, MuscleBalanceChart } from "@/components/body/BodyMetricChart";
import PostureAnalysisCard from "@/components/body/PostureAnalysisCard";
import { uploadBodyImage, analyzeImage } from "../services/metrics-api";
import DigitalTwinScreen from "@/screens/DigitalTwinScreen";
import {
  Camera,
  Upload,
  Image as ImageIcon,
  ChevronRight,
  Activity,
  TrendingUp,
  Scale,
  Target,
  Bed,
  User,
} from "lucide-react-native";

type MainTab = "body" | "recovery";
type BodyTab = "overview" | "upload" | "trends" | "digital-twin";

export default function InsightsScreen() {
  const { user } = useAuth();
  const { metrics, loading, refreshMetrics, addMetricOptimistic } = useMetrics();

  const [activeMainTab, setActiveMainTab] = useState<MainTab>("body");
  const [bodyTab, setBodyTab] = useState<BodyTab>("overview");

  // Body image upload state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);

  // Haptic feedback helper
  const triggerHaptic = useCallback(async (type: "light" | "medium" | "heavy" | "success" | "warning" | "error") => {
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
    } catch {
      // Haptics not available
    }
  }, []);

  useEffect(() => {
    if (activeMainTab === "body") {
      refreshMetrics();
    }
  }, [activeMainTab, refreshMetrics]);

  // Body image handlers
  const handlePickImage = useCallback(async () => {
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
      setBodyTab("upload");
      await triggerHaptic("light");
    }
  }, [triggerHaptic]);

  const handleTakePhoto = useCallback(async () => {
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
      setBodyTab("upload");
      await triggerHaptic("light");
    }
  }, [triggerHaptic]);

  const handleAnalyze = useCallback(async (imageUrl?: string) => {
    const url = imageUrl || selectedImage;
    if (!url) { return; }

    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeImage(url);

      const bodyComposition = result.analysis?.bodyComposition;
      if (bodyComposition && (bodyComposition.bodyFatEstimate || bodyComposition.muscleMassEstimate)) {
        const optimisticMetric = {
          weight: undefined,
          bodyFatPercentage: bodyComposition.bodyFatEstimate,
          muscleMass: bodyComposition.muscleMassEstimate,
          bmi: undefined,
        };

        try {
          await addMetricOptimistic(optimisticMetric);
        } catch {
          await refreshMetrics();
        }
      }

      await triggerHaptic("success");
      Alert.alert("Analysis Complete", "Your body metrics have been updated!");

      setSelectedImage(null);
      setImageFile(null);
      setBodyTab("overview");
      await triggerHaptic("medium");
    } catch (err: unknown) {
      await triggerHaptic("error");
      const message = err instanceof Error ? err.message : "Failed to analyze image";
      setError(message);
    } finally {
      setAnalyzing(false);
    }
  }, [selectedImage, triggerHaptic, addMetricOptimistic, refreshMetrics]);

  const handleUpload = useCallback(async () => {
    if (!imageFile || !user) {return;}

    setUploading(true);
    setError(null);

    try {
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
      setBodyTab("overview");
      await triggerHaptic("light");
    } catch (err: unknown) {
      await triggerHaptic("error");
      const message = err instanceof Error ? err.message : "Failed to upload image";
      setError(message);
    } finally {
      setUploading(false);
    }
  }, [imageFile, user, triggerHaptic, handleAnalyze]);

  const clearImage = useCallback(() => {
    setSelectedImage(null);
    setImageFile(null);
    setError(null);
  }, []);

  // Prepare chart data - ensure metrics is always an array
  const safeMetrics = Array.isArray(metrics) ? metrics : [];
  const weightData = safeMetrics
    .filter((m) => m.weight)
    .map((m) => ({
      date: new Date(m.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: m.weight!,
    }))
    .reverse();

  const bodyFatData = safeMetrics
    .filter((m) => m.bodyFatPercentage)
    .map((m) => ({
      date: new Date(m.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: (m.bodyFatPercentage || 0) * 100,
    }))
    .reverse();

  const muscleData = safeMetrics
    .filter((m) => m.muscleMass)
    .map((m) => ({
      date: new Date(m.timestamp * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      value: m.muscleMass!,
    }))
    .reverse();

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

  const renderTrendsContent = () => {
    type ChartMetric = "weight" | "bodyFat" | "muscleMass";

    interface ChartItem {
      id: string;
      icon: any;
      title: string;
      data: any[];
      color: string;
      isBalance: boolean;
      metric?: ChartMetric;
    }

    const charts: ChartItem[] = [];

    if (weightData.length > 0) {
      charts.push({
        id: "weight",
        icon: Scale,
        title: "Weight Progress",
        data: weightData,
        color: "emerald",
        isBalance: false,
        metric: "weight",
      });
    }

    if (bodyFatData.length > 0) {
      charts.push({
        id: "bodyFat",
        icon: Activity,
        title: "Body Fat %",
        data: bodyFatData,
        color: "orange",
        isBalance: false,
        metric: "bodyFat",
      });
    }

    if (muscleData.length > 0) {
      charts.push({
        id: "muscle",
        icon: TrendingUp,
        title: "Muscle Mass",
        data: muscleData,
        color: "blue",
        isBalance: false,
        metric: "muscleMass",
      });
    }

    // Always add muscle balance chart
    charts.push({
      id: "balance",
      icon: Target,
      title: "Muscle Balance",
      data: muscleBalanceData,
      color: "purple",
      isBalance: true,
    });

    if (charts.length === 0) {
      return (
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <Text className="text-slate-400 text-center">No trend data available yet. Start logging your metrics to see progress.</Text>
        </View>
      );
    }

    return (
      <FlatList
        data={charts}
        keyExtractor={(item) => item.id}
        scrollEnabled={false}
        className="space-y-4"
        ItemSeparatorComponent={() => <View className="h-3" />}
        renderItem={({ item }) => (
          <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <View className="flex items-center gap-2 mb-3">
              <item.icon className={`w-5 h-5 text-${item.color}-400`} />
              <Text className="text-slate-200 font-semibold">{item.title}</Text>
            </View>
            {item.isBalance ? (
              <MuscleBalanceChart data={item.data as any} height={250} />
            ) : (
              <BodyMetricChart data={item.data as any} metric={item.metric!} height={200} />
            )}
          </View>
        )}
      />
    );
  };

  const renderBodyContent = () => {
    switch (bodyTab) {
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

            {/* Muscle Heatmap */}
            <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
              <View className="flex items-center justify-between mb-4">
                <Text className="text-slate-200 font-semibold">Muscle Development</Text>
                <TouchableOpacity onPress={() => setBodyTab("trends")}>
                  <ChevronRight className="w-5 h-5 text-cyan-400" />
                </TouchableOpacity>
              </View>
              {metrics.length > 0 ? (
                <View className="h-48 bg-slate-800/50 rounded-lg items-center justify-center">
                  <Text className="text-cyan-400">Heatmap visualization</Text>
                </View>
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
                  <ExpoImage
                    source={{ uri: selectedImage }}
                    className="w-full aspect-[3/4] rounded-lg"
                    contentFit="cover"
                    cachePolicy="disk"
                  />
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
                        <View className="h-full bg-cyan-500 w-full" />
                      </View>
                    </View>
                  ) : (
                    <>
                      <TouchableOpacity
                        onPress={() => void handleUpload()}
                        className="bg-gradient-to-r from-cyan-600 to-blue-600 py-3 rounded-lg items-center flex-row justify-center gap-2"
                      >
                        <Upload className="w-5 h-5 text-white" />
                        <Text className="text-white font-semibold">Upload Photo</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => void handleAnalyze(selectedImage)}
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
                  onPress={() => void handleTakePhoto()}
                  className="bg-slate-800 border-2 border-dashed border-slate-700 rounded-xl p-6 items-center mb-3"
                >
                  <Camera className="w-12 h-12 text-cyan-400 mb-2" />
                  <Text className="text-white font-medium mb-1">Take Photo</Text>
                  <Text className="text-slate-400 text-sm">Use camera for fresh photo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => void handlePickImage()}
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
        return renderTrendsContent();

      case "digital-twin":
        return <DigitalTwinScreen />;
    }
  };

  return (
    <ScrollView ref={scrollRef} className="flex-1 bg-slate-950">
      <View className="p-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-white mb-1">Insights</Text>
          <Text className="text-slate-400 text-sm">
            Body metrics & recovery tracking
          </Text>
        </View>

        {/* Main Tab Navigation */}
        <View className="flex-row bg-slate-800/50 rounded-lg p-1 mb-4">
          {[
            { key: "body", label: "Body", icon: Activity },
            { key: "recovery", label: "Recovery", icon: Bed },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveMainTab(tab.key as MainTab)}
              className={`flex-1 py-2 px-3 rounded-md flex-row items-center justify-center gap-1 ${
                activeMainTab === tab.key ? "bg-purple-600" : ""
              }`}
            >
              <tab.icon
                className={`w-4 h-4 ${activeMainTab === tab.key ? "text-white" : "text-slate-400"}`}
              />
              <Text className={`text-xs font-medium ${activeMainTab === tab.key ? "text-white" : "text-slate-400"}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Body Tab Sub-navigation */}
        {activeMainTab === "body" && (
          <View className="flex-row bg-slate-800/50 rounded-lg p-1 mb-4">
            {[
              { key: "overview", label: "Overview", icon: Activity },
              { key: "upload", label: "Upload", icon: Upload },
              { key: "trends", label: "Trends", icon: TrendingUp },
              { key: "digital-twin", label: "Twin", icon: User },
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                onPress={() => setBodyTab(tab.key as BodyTab)}
                className={`flex-1 py-2 px-3 rounded-md flex-row items-center justify-center gap-1 ${
                  bodyTab === tab.key ? "bg-cyan-600" : ""
                }`}
              >
                <tab.icon
                  className={`w-4 h-4 ${bodyTab === tab.key ? "text-white" : "text-slate-400"}`}
                />
                <Text className={`text-xs font-medium ${bodyTab === tab.key ? "text-white" : "text-slate-400"}`}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Content */}
        {activeMainTab === "body" ? renderBodyContent() : <RecoveryDashboard />}

        {/* Loading overlay for body metrics */}
        {loading && activeMainTab === "body" && (
          <View className="absolute inset-0 bg-slate-950/50 items-center justify-center">
            <ActivityIndicator size="large" color="#06b6d4" />
            <Text className="text-slate-400 text-sm mt-2">Loading metrics...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
