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
import { useAuth } from "@/contexts/AuthContext";
import { RecoveryScoreGauge } from "@/components/biometric/RecoveryScoreGauge";
import {
  getSleepSummary,
  getCorrelationFindings,
  getBiometricSnapshot,
  generateBiometricSnapshot,
  type BiometricSnapshot,
  type CorrelationFinding,
} from "@/services/biometric-api";
import {
  Bed,
  Dumbbell,
  Utensils,
  TrendingUp,
  AlertTriangle,
  Zap,
  Activity,
} from "lucide-react-native";

type TabKey = "overview" | "sleep" | "correlations";

export default function RecoveryDashboard() {
  const { user } = useAuth();

  const [snapshot, setSnapshot] = useState<BiometricSnapshot | null>(null);
  const [correlations, setCorrelations] = useState<CorrelationFinding[]>([]);
  const [sleepSummary, setSleepSummary] = useState<{
    avgDuration: number;
    avgQuality?: number;
    avgConsistency: number;
    logsCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [summary, findings] = await Promise.all([
        getSleepSummary("7d"),
        getCorrelationFindings(5),
      ]);
      setSleepSummary({
        avgDuration: summary.avgDuration,
        avgQuality: summary.avgQuality,
        avgConsistency: summary.avgConsistency,
        logsCount: summary.totalLogs,
      });
      setCorrelations(findings);

      // Get latest snapshot
      const latestSnapshot = await getBiometricSnapshot("7d");
      if (latestSnapshot) {
        setSnapshot(latestSnapshot);
      }
    } catch {
      // Silently ignore errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData().finally(() => setRefreshing(false));
  }, [loadData]);

  const handleGenerateSnapshot = useCallback(async () => {
    if (!user) {return;}

    setGenerating(true);
    try {
      const newSnapshot = await generateBiometricSnapshot();
      setSnapshot(newSnapshot);
      Alert.alert("Analysis Complete", "Your recovery metrics have been updated!");
    } catch {
      Alert.alert("Error", "Failed to generate analysis. Please try again.");
    } finally {
      setGenerating(false);
    }
  }, [user]);

  const handleDismissCorrelation = useCallback(async (id: string) => {
    setCorrelations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const renderOverview = () => (
    <View className="space-y-4">
      {/* Recovery Score */}
      {snapshot && (
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 items-center">
          <Text className="text-slate-200 font-semibold mb-3">Recovery Score</Text>
          <RecoveryScoreGauge score={snapshot.recoveryScore} size="lg" />
          {snapshot.warnings.length > 0 && (
            <View className="mt-4 space-y-2 w-full">
              {snapshot.warnings.slice(0, 2).map((warning, idx) => (
                <View key={idx} className="flex-row items-center gap-2 p-2 bg-amber-500/10 rounded-lg">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <Text className="text-amber-400 text-xs flex-1">{warning}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* Quick Stats */}
      <View className="flex-row gap-3">
        <View className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <View className="flex-row items-center gap-2 mb-1">
            <Bed className="w-4 h-4 text-blue-400" />
            <Text className="text-slate-400 text-xs">Sleep</Text>
          </View>
          <Text className="text-white font-bold text-lg">
            {sleepSummary?.avgDuration?.toFixed(1) || "--"}h
          </Text>
          <Text className="text-slate-500 text-xs">
            {sleepSummary?.avgQuality ? `${sleepSummary.avgQuality.toFixed(0)}% quality` : "No data"}
          </Text>
        </View>

        <View className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <View className="flex-row items-center gap-2 mb-1">
            <Dumbbell className="w-4 h-4 text-emerald-400" />
            <Text className="text-slate-400 text-xs">Exercise</Text>
          </View>
          <Text className="text-white font-bold text-lg">
            {snapshot?.exerciseLoad.totalWorkouts || 0}
          </Text>
          <Text className="text-slate-500 text-xs">workouts (7d)</Text>
        </View>

        <View className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl p-3">
          <View className="flex-row items-center gap-2 mb-1">
            <Utensils className="w-4 h-4 text-orange-400" />
            <Text className="text-slate-400 text-xs">Nutrition</Text>
          </View>
          <Text className="text-white font-bold text-lg">
            {snapshot ? `${Math.round(snapshot.nutrition.consistencyScore)}%` : "--"}
          </Text>
          <Text className="text-slate-500 text-xs">consistency</Text>
        </View>
      </View>

      {/* Top Correlation */}
      {correlations.length > 0 && (
        <TouchableOpacity
          className="bg-slate-900/50 border border-slate-800 rounded-xl p-4"
          onPress={() => setActiveTab("correlations")}
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              <Text className="text-slate-200 font-semibold text-sm">Top Insight</Text>
            </View>
          </View>
          <Text className="text-white text-sm mb-1">{correlations[0].actionableInsight}</Text>
          <View className="flex-row items-center gap-2">
            <View className="h-1 flex-1 rounded-full bg-slate-800 overflow-hidden">
              <View
                className="h-full bg-purple-500"
                style={{ width: `${correlations[0].confidence * 100}%` }}
              />
            </View>
            <Text className="text-purple-400 text-xs">
              {Math.round(correlations[0].confidence * 100)}% confidence
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Run Analysis Button */}
      <TouchableOpacity
        onPress={() => void handleGenerateSnapshot()}
        disabled={generating}
        className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-4 items-center flex-row justify-center gap-2 disabled:opacity-50"
      >
        {generating ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Zap className="w-5 h-5 text-white" />
        )}
        <Text className="text-white font-semibold">
          {generating ? "Analyzing..." : "Run Analysis Now"}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSleep = () => (
    <View className="space-y-4">
      <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center gap-2">
            <Bed className="w-5 h-5 text-blue-400" />
            <Text className="text-slate-200 font-semibold">Sleep Summary</Text>
          </View>
          <Text className="text-slate-400 text-sm">
            Last 7 days • {sleepSummary?.logsCount || 0} logs
          </Text>
        </View>

        <View className="space-y-3">
          <View>
            <View className="flex-row justify-between text-sm mb-1">
              <Text className="text-slate-400">Avg Duration</Text>
              <Text className="text-white">
                {sleepSummary?.avgDuration?.toFixed(1) || "--"}h
              </Text>
            </View>
            <View className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <View
                className="h-full bg-blue-500"
                style={{ width: `${Math.min(100, (sleepSummary?.avgDuration || 0) / 9 * 100)}%` }}
              />
            </View>
          </View>

          {sleepSummary?.avgQuality !== undefined && (
            <View>
              <View className="flex-row justify-between text-sm mb-1">
                <Text className="text-slate-400">Avg Quality</Text>
                <Text className="text-white">{sleepSummary.avgQuality.toFixed(0)}%</Text>
              </View>
              <View className="h-2 bg-slate-800 rounded-full overflow-hidden">
                <View
                  className="h-full bg-emerald-500"
                  style={{ width: `${sleepSummary.avgQuality}%` }}
                />
              </View>
            </View>
          )}

          <View>
            <View className="flex-row justify-between text-sm mb-1">
              <Text className="text-slate-400">Consistency</Text>
              <Text className="text-white">{sleepSummary?.avgConsistency?.toFixed(0) || "--"}%</Text>
            </View>
            <View className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <View
                className="h-full bg-purple-500"
                style={{ width: `${sleepSummary?.avgConsistency || 0}%` }}
              />
            </View>
          </View>
        </View>
      </View>

      <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <View className="flex-row items-center gap-2 mb-3">
          <Activity className="w-5 h-5 text-cyan-400" />
          <Text className="text-slate-200 font-semibold">Factors Affecting Recovery</Text>
        </View>
        <Text className="text-slate-400 text-sm">
          Your sleep consistency score affects overall recovery. Aim for 7-9 hours with at least 20% deep sleep for optimal recovery.
        </Text>
      </View>
    </View>
  );

  const renderCorrelations = () => (
    <View className="space-y-4">
      {correlations.length === 0 ? (
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 items-center">
          <TrendingUp className="w-12 h-12 text-slate-600 mb-2" />
          <Text className="text-slate-400 text-center">
            No significant correlations found yet.
          </Text>
          <Text className="text-slate-500 text-sm text-center mt-1">
            Keep logging your data to discover patterns.
          </Text>
        </View>
      ) : (
        correlations.map((correlation) => (
          <View key={correlation.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-slate-200 font-semibold text-sm">
                {correlation.factorA.replace(/_/g, " ")} → {correlation.factorB.replace(/_/g, " ")}
              </Text>
              <TouchableOpacity onPress={() => void handleDismissCorrelation(correlation.id)}>
                <Text className="text-slate-500 text-xs">Dismiss</Text>
              </TouchableOpacity>
            </View>

            <Text className="text-white text-sm mb-2">{correlation.actionableInsight}</Text>

            <View className="flex-row items-center justify-between mb-2">
              <View className="flex-row items-center gap-1">
                <Text className="text-slate-400 text-xs">Correlation:</Text>
                <Text
                  className={`text-xs font-semibold ${correlation.correlationCoefficient > 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  r = {correlation.correlationCoefficient.toFixed(2)}
                </Text>
              </View>
              <Text className="text-slate-500 text-xs">
                p = {correlation.pValue.toFixed(4)}
              </Text>
            </View>

            {correlation.outlierDates.length > 0 && (
              <View className="mt-2 pt-2 border-t border-slate-800">
                <Text className="text-slate-400 text-xs mb-1">Outlier dates:</Text>
                <View className="flex-row flex-wrap gap-1">
                  {correlation.outlierDates.slice(0, 3).map((date, idx) => (
                    <View key={idx} className="bg-slate-800 px-2 py-0.5 rounded">
                      <Text className="text-slate-300 text-xs">{date}</Text>
                    </View>
                  ))}
                  {correlation.outlierDates.length > 3 && (
                    <Text className="text-slate-500 text-xs">+{correlation.outlierDates.length - 3} more</Text>
                  )}
                </View>
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );

  const tabs = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "sleep", label: "Sleep", icon: Bed },
    { key: "correlations", label: "Insights", icon: TrendingUp },
  ] as const;

  if (loading) {
    return (
      <ScrollView className="flex-1 bg-slate-950">
        <View className="p-4 items-center justify-center py-20">
          <ActivityIndicator size="large" color="#8b5cf6" />
          <Text className="text-slate-400 mt-2">Loading recovery data...</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-slate-950"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    >
      <View className="p-4">
        {/* Header */}
        <View className="mb-4">
          <Text className="text-2xl font-bold text-white">Recovery & Stress</Text>
          <Text className="text-slate-400 text-sm">
            AI-powered analysis of your recovery patterns
          </Text>
        </View>

        {/* Tab Navigation */}
        <View className="flex-row bg-slate-800/50 rounded-lg p-1 mb-4">
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              className={`flex-1 py-2 px-3 rounded-md flex-row items-center justify-center gap-1 ${
                activeTab === tab.key ? "bg-purple-600" : ""
              }`}
            >
              <tab.icon
                className={`w-4 h-5 ${activeTab === tab.key ? "text-white" : "text-slate-400"}`}
              />
              <Text className={`text-xs font-medium ${activeTab === tab.key ? "text-white" : "text-slate-400"}`}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === "overview" && renderOverview()}
        {activeTab === "sleep" && renderSleep()}
        {activeTab === "correlations" && renderCorrelations()}
      </View>
    </ScrollView>
  );
}
