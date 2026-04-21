"use client";

import React from "react";

export interface PostureIssue {
  type: "forward_head" | "rounded_shoulders" | "hyperlordosis" | "kyphosis" | "pelvic_tilt";
  severity: "mild" | "moderate" | "severe";
}

export interface PostureAssessment {
  score: number; // 0-100
  issues: PostureIssue[];
  recommendations: string[];
}

export interface PostureAnalysisCardProps {
  assessment?: PostureAssessment;
  loading?: boolean;
}

const ISSUE_LABELS: Record<string, { label: string; description: string }> = {
  forward_head: { label: "Forward Head", description: "Head positioned too far forward" },
  rounded_shoulders: { label: "Rounded Shoulders", description: "Shoulders rolled forward" },
  hyperlordosis: { label: "Hyperlordosis", description: "Excessive lower back arch" },
  kyphosis: { label: "Kyphosis", description: "Upper back rounding" },
  pelvic_tilt: { label: "Pelvic Tilt", description: "Anterior or posterior pelvic tilt" },
};

const SEVERITY_COLORS = {
  mild: "#fbbf24", // amber-400
  moderate: "#f97316", // orange-500
  severe: "#ef4444", // red-500
};

const SEVERITY_BG = {
  mild: "bg-amber-500/20 border-amber-500/30",
  moderate: "bg-orange-500/20 border-orange-500/30",
  severe: "bg-red-500/20 border-red-500/30",
};

export function PostureAnalysisCard({
  assessment,
  loading = false,
}: PostureAnalysisCardProps) {
  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/2 mb-4"></div>
        <div className="h-32 bg-slate-800 rounded mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-slate-800 rounded"></div>
          <div className="h-4 bg-slate-800 rounded"></div>
          <div className="h-4 bg-slate-800 rounded"></div>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-slate-200 font-semibold mb-4">Posture Analysis</h3>
        <p className="text-slate-400 text-sm">
          Upload a body photo to receive AI-powered posture assessment.
        </p>
      </div>
    );
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-blue-400";
    if (score >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Excellent";
    if (score >= 60) return "Good";
    if (score >= 40) return "Fair";
    return "Needs Work";
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-slate-200 font-semibold">Posture Analysis</h3>
        <div className="text-right">
          <div className={`text-3xl font-bold ${getScoreColor(assessment.score)}`}>
            {assessment.score}
          </div>
          <div className="text-xs text-slate-400 uppercase tracking-wider">
            {getScoreLabel(assessment.score)}
          </div>
        </div>
      </div>

      {/* Posture score bar */}
      <div className="mb-6">
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${
              assessment.score >= 60 ? "bg-gradient-to-r from-emerald-500 to-blue-500" : "bg-gradient-to-r from-amber-500 to-red-500"
            }`}
            style={{ width: `${assessment.score}%` }}
          />
        </div>
      </div>

      {/* Issues list */}
      {assessment.issues.length > 0 && (
        <div className="mb-6">
          <h4 className="text-slate-300 text-sm font-medium mb-3">Detected Issues</h4>
          <div className="space-y-2">
            {assessment.issues.map((issue, index) => {
              const info = ISSUE_LABELS[issue.type];
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${SEVERITY_BG[issue.severity]}`}
                >
                  <div>
                    <div className="text-slate-200 font-medium text-sm">{info.label}</div>
                    <div className="text-slate-400 text-xs">{info.description}</div>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded ${SEVERITY_BG[issue.severity].split(" ")[1]}`}
                  >
                    {issue.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recommendations */}
      {assessment.recommendations.length > 0 && (
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h4 className="text-slate-300 text-sm font-medium mb-2">Recommendations</h4>
          <ul className="space-y-2">
            {assessment.recommendations.map((rec, index) => (
              <li key={index} className="flex items-start gap-2">
                <svg
                  className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-slate-300 text-sm">{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PostureAnalysisCard;
