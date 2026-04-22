import React from "react";
import { View, Text } from "react-native";
import type {
  PostureAssessment,
  PostureIssueType} from "@aivo/shared-types";
import {
  POSTURE_ISSUE_LABELS,
  SEVERITY_STYLES,
  getScoreColor,
  getScoreLabel,
} from "@aivo/shared-types";

interface PostureAnalysisCardProps {
  assessment?: PostureAssessment;
  loading?: boolean;
}

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
              const info = POSTURE_ISSUE_LABELS[issue.type as PostureIssueType];
              const styles = SEVERITY_STYLES[issue.severity];
              return (
                <View
                  key={index}
                  className="flex-row items-center justify-between p-2 rounded-lg border"
                  style={{ backgroundColor: styles.bg, borderColor: styles.border }}
                >
                  <Text className="text-slate-200 text-sm">{info?.label || issue.type}</Text>
                  <Text
                    className="text-xs font-semibold px-2 py-0.5 rounded"
                    style={{ backgroundColor: styles.bg, color: styles.text }}
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
