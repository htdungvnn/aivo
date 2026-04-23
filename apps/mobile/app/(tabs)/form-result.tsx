import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { getFormVideoResult, getFormVideoStatus } from "../services/form-analysis-api";
import type { FormAnalysisReport, FormIssue, FormCorrection } from "@aivo/shared-types";
import {
  ChevronLeft,
  Award,
  AlertTriangle,
  CheckCircle,
  Dumbbell,
  Clock,
  Target,
} from "lucide-react-native";

export default function FormResultScreen() {
  const router = useRouter();
  const { videoId } = useLocalSearchParams<{ videoId: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [result, setResult] = useState<FormAnalysisReport | null>(null);
  const [videoStatus, setVideoStatus] = useState<string>("");

  const loadResult = useCallback(async () => {
    if (!videoId) {return;}

    try {
      const [statusRes, resultRes] = await Promise.all([
        getFormVideoStatus(videoId),
        getFormVideoResult(videoId),
      ]);
      setVideoStatus(statusRes.status);
      setResult(resultRes);
    } catch {
      Alert.alert("Error", "Failed to load analysis results");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [videoId]);

  useEffect(() => {
    loadResult();
  }, [loadResult]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadResult();
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) {return "#22c55e";} // emerald
    if (score >= 80) {return "#84cc16";} // lime
    if (score >= 70) {return "#3b82f6";} // blue
    if (score >= 60) {return "#f59e0b";} // amber
    return "#ef4444"; // red
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "major":
        return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case "moderate":
        return <AlertTriangle className="w-4 h-4 text-amber-400" />;
      default:
        return <CheckCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getImpactText = (impact: string) => {
    switch (impact) {
      case "safety":
        return "Safety risk";
      case "performance":
        return "Performance limit";
      default:
        return "Both";
    }
  };

  const formatTimestamp = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-slate-400 mt-4">Loading analysis...</Text>
      </View>
    );
  }

  if (!result) {
    return (
      <ScrollView className="flex-1 bg-slate-950">
        <View className="p-4">
          <TouchableOpacity
            onPress={() => router.back()}
            className="flex-row items-center gap-2 mb-4"
          >
            <ChevronLeft className="w-6 h-6 text-slate-400" />
            <Text className="text-slate-400">Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-lg">No analysis data available</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View className="p-4">
        {/* Header */}
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-row items-center gap-2 mb-4"
        >
          <ChevronLeft className="w-6 h-6 text-slate-400" />
          <Text className="text-slate-400">Back to Videos</Text>
        </TouchableOpacity>

        {/* Score Card */}
        <View className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-6 mb-6 items-center">
          <View className="relative mb-4">
            <View
              className="w-32 h-32 rounded-full items-center justify-center border-8"
              style={{ borderColor: getScoreColor(result.overallScore) }}
            >
              <Text
                className="text-4xl font-bold"
                style={{ color: getScoreColor(result.overallScore) }}
              >
                {Math.round(result.overallScore)}
              </Text>
            </View>
            <View className="absolute -bottom-2 px-4 py-1 bg-slate-800 rounded-full border border-slate-700">
              <Text className="text-white text-sm font-bold">Grade {result.grade}</Text>
            </View>
          </View>

          <Text className="text-slate-400 text-sm mb-1 capitalize">
            {videoStatus === "processing" ? "Analyzing..." : "Form Analysis"}
          </Text>

          {videoStatus === "processing" && (
            <ActivityIndicator className="mt-2" color="#3b82f6" />
          )}
        </View>

        {/* Summary */}
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-6">
          <View className="flex-row items-center gap-2 mb-3">
            <Award className="w-5 h-5 text-cyan-400" />
            <Text className="text-white font-semibold">Summary</Text>
          </View>

          {result.summary.strengths.length > 0 && (
            <View className="mb-3">
              <Text className="text-emerald-400 text-sm font-medium mb-1">Strengths</Text>
              {result.summary.strengths.map((strength, i) => (
                <Text key={i} className="text-slate-300 text-sm ml-4">• {strength}</Text>
              ))}
            </View>
          )}

          <View className="mb-2">
            <Text className="text-amber-400 text-sm font-medium mb-1">Primary Concern</Text>
            <Text className="text-slate-300 text-sm">{result.summary.primaryConcern}</Text>
          </View>

          <View className="flex-row items-center gap-2 mt-2">
            <Target className="w-4 h-4 text-purple-400" />
            <Text className="text-purple-400 text-sm">
              Priority: {result.summary.priority}
            </Text>
          </View>
        </View>

        {/* Issues */}
        {result.issues.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <Text className="text-white font-semibold">Detected Issues</Text>
              <View className="px-2 py-0.5 bg-orange-500/20 rounded">
                <Text className="text-orange-400 text-xs">{result.issues.length}</Text>
              </View>
            </View>

            {result.issues.map((issue: FormIssue, index: number) => (
              <View key={index} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-3">
                <View className="flex-row items-start justify-between mb-2">
                  <View className="flex-row items-center gap-2 flex-1">
                    {getSeverityIcon(issue.severity)}
                    <Text className="text-white font-medium capitalize">
                      {issue.type.replace(/_/g, " ")}
                    </Text>
                  </View>
                  <View className="px-2 py-1 bg-slate-800 rounded">
                    <Text className="text-slate-300 text-xs capitalize">{issue.severity}</Text>
                  </View>
                </View>

                <Text className="text-slate-400 text-sm mb-2">{issue.description}</Text>

                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <Text className="text-slate-500 text-xs">
                      {formatTimestamp(issue.timestampMs)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-red-400" />
                    <Text className="text-red-400 text-xs">{getImpactText(issue.impact)}</Text>
                  </View>
                </View>

                <View className="mt-2">
                  <Text className="text-slate-500 text-xs">Confidence</Text>
                  <View className="h-1.5 bg-slate-800 rounded-full overflow-hidden mt-1">
                    <View
                      className="h-full bg-cyan-500"
                      style={{ width: `${issue.confidence * 100}%` }}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Corrections */}
        {result.corrections.length > 0 && (
          <View className="mb-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Dumbbell className="w-5 h-5 text-emerald-400" />
              <Text className="text-white font-semibold">Correction Drills</Text>
            </View>

            {result.corrections.map((corr: FormCorrection, index: number) => (
              <View key={index} className="bg-slate-900/50 border border-emerald-900/30 rounded-xl p-4 mb-3">
                <Text className="text-emerald-400 font-semibold mb-1">{corr.drillName}</Text>
                <Text className="text-slate-300 text-sm mb-3">{corr.description}</Text>

                <Text className="text-slate-400 text-xs font-medium mb-2">Steps</Text>
                {corr.steps.map((step, i) => (
                  <Text key={i} className="text-slate-400 text-sm mb-1 ml-4">
                    {i + 1}. {step}
                  </Text>
                ))}

                <Text className="text-slate-400 text-xs font-medium mt-3 mb-2">Cues</Text>
                <View className="flex-row flex-wrap gap-2 mb-3">
                  {corr.cues.map((cue, i) => (
                    <View key={i} className="px-2 py-1 bg-slate-800 rounded">
                      <Text className="text-cyan-400 text-xs">"{cue}"</Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row items-center gap-4">
                  <View className="flex-row items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    <Text className="text-slate-500 text-xs">{corr.durationSeconds}s duration</Text>
                  </View>
                  <View className="px-2 py-0.5 bg-emerald-500/20 rounded">
                    <Text className="text-emerald-400 text-xs capitalize">{corr.difficulty}</Text>
                  </View>
                </View>

                {corr.equipment.length > 0 && (
                  <View className="flex-row flex-wrap gap-1 mt-2">
                    {corr.equipment.map((eq, i) => (
                      <View key={i} className="px-2 py-1 bg-slate-800 rounded">
                        <Text className="text-slate-300 text-xs">{eq}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Processing Time */}
        {result.processingTimeMs && (
          <View className="bg-slate-900/30 border border-slate-800/50 rounded-xl p-4 mb-6">
            <Text className="text-slate-400 text-sm text-center">
              Analysis completed in {(result.processingTimeMs / 1000).toFixed(1)}s
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
