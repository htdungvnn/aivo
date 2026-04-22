"use client";

import type { PostureAssessment } from "@aivo/shared-types";
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
              const info = POSTURE_ISSUE_LABELS[issue.type];
              const styles = SEVERITY_STYLES[issue.severity];
              return (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border"
                  style={{ backgroundColor: styles.bg, borderColor: styles.border }}
                >
                  <div>
                    <div className="text-slate-200 font-medium text-sm">{info.label}</div>
                    <div className="text-slate-400 text-xs">{info.description}</div>
                  </div>
                  <span
                    className="text-xs font-semibold px-2 py-1 rounded"
                    style={{ backgroundColor: styles.bg, color: styles.text }}
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
