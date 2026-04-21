import React from "react";
import { View, Text } from "react-native";

export interface PostureIssue {
  type: string;
  severity: "mild" | "moderate" | "severe";
}

export interface PostureAssessment {
  score: number;
  issues: PostureIssue[];
  recommendations: string[];
}

interface PostureAnalysisCardProps {
  assessment?: PostureAssessment;
  loading?: boolean;
}

const ISSUE_LABELS: Record<string, string> = {
  forward_head: "Forward Head",
  rounded_shoulders: "Rounded Shoulders",
  hyperlordosis: "Hyperlordosis",
  kyphosis: "Kyphosis",
  pelvic_tilt: "Pelvic Tilt",
};

const SEVERITY_COLORS = {
  mild: "#fbbf24",
  moderate: "#f97316",
  severe: "#ef4444",
};

export function PostureAnalysisCard({ assessment, loading = false }: PostureAnalysisCardProps) {
  if (loading) {
    return (
      <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <View className="h-5 bg-slate-800 rounded w-1/3 mb-3" />
        <View className="h-24 bg-slate-800 rounded mb-3" />
        <View className="space-y-2">
          <View className="h-4 bg-slate-800 rounded" />
          <View className="h-4 bg-slate-800 rounded" />
          <View className="h-4 bg-slate-800 rounded" />
        </View>
      </View>
    );
  }

  if (!assessment) {
    return (
      <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <Text className="text-slate-200 font-semibold mb-3">Posture Analysis</Text>
        <Text className="text-slate-400 text-sm">
          Upload a body photo to receive AI-powered posture assessment.
        </Text>
      </View>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) {return "text-emerald-400";}
    if (score >= 60) {return "text-blue-400";}
    if (score >= 40) {return "text-amber-400";}
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) {return "Excellent";}
    if (score >= 60) {return "Good";}
    if (score >= 40) {return "Fair";}
    return "Needs Work";
  };

  return (
    <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <View className="flex items-center justify-between mb-4">
        <Text className="text-slate-200 font-semibold">Posture Analysis</Text>
        <View className="text-right">
          <Text className={`text-2xl font-bold ${getScoreColor(assessment.score)}`}>
            {assessment.score}
          </Text>
          <Text className="text-xs text-slate-400 uppercase tracking-wider">
            {getScoreLabel(assessment.score)}
          </Text>
        </View>
      </View>

      {/* Score bar */}
      <View className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
        <View
          className={`h-full ${assessment.score >= 60 ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${assessment.score}%` }}
        />
      </View>

      {/* Issues */}
      {assessment.issues.length > 0 && (
        <View className="mb-4">
          <Text className="text-slate-300 text-sm font-medium mb-2">Detected Issues</Text>
          <View className="space-y-2">
            {assessment.issues.map((issue, index) => {
              const info = ISSUE_LABELS[issue.type] || issue.type;
              return (
                <View
                  key={index}
                  className={`flex-row items-center justify-between p-2 rounded-lg border ${issue.severity === "severe" ? "border-red-500/30 bg-red-500/10" : issue.severity === "moderate" ? "border-orange-500/30 bg-orange-500/10" : "border-amber-500/30 bg-amber-500/10"}`}
                >
                  <Text className="text-slate-200 text-sm capitalize">{info}</Text>
                  <Text
                    className={`text-xs font-semibold px-2 py-0.5 rounded ${issue.severity === "severe" ? "bg-red-500/30 text-red-400" : issue.severity === "moderate" ? "bg-orange-500/30 text-orange-400" : "bg-amber-500/30 text-amber-400"}`}
                  >
                    {issue.severity}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Recommendations */}
      {assessment.recommendations.length > 0 && (
        <View className="bg-slate-800/50 rounded-lg p-3">
          <Text className="text-slate-300 text-sm font-medium mb-2">Recommendations</Text>
          {assessment.recommendations.map((rec, index) => (
            <View key={index} className="flex-row items-start gap-2 mb-1">
              <Text className="text-emerald-400 mt-0.5">✓</Text>
              <Text className="text-slate-300 text-sm flex-1">{rec}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

export default PostureAnalysisCard;
