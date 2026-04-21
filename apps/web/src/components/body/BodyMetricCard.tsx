"use client";

import React from "react";

export interface BodyMetricCardProps {
  label: string;
  value: number | string;
  unit?: string;
  change?: number; // positive or negative
  changeLabel?: string;
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  loading?: boolean;
}

export function BodyMetricCard({
  label,
  value,
  unit = "",
  change,
  changeLabel = "vs last",
  icon,
  variant = "default",
  loading = false,
}: BodyMetricCardProps) {
  if (loading) {
    return (
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 bg-slate-800 rounded w-1/2"></div>
          <div className="h-4 w-4 bg-slate-800 rounded"></div>
        </div>
        <div className="h-8 bg-slate-800 rounded w-3/4"></div>
      </div>
    );
  }

  const getVariantStyles = () => {
    switch (variant) {
      case "success":
        return "border-emerald-500/30 bg-emerald-500/5";
      case "warning":
        return "border-amber-500/30 bg-amber-500/5";
      case "danger":
        return "border-red-500/30 bg-red-500/5";
      default:
        return "border-slate-800 bg-slate-900/50";
    }
  };

  const getChangeColor = () => {
    if (change === undefined || change === 0) return "text-slate-400";
    return change > 0 ? "text-emerald-400" : "text-red-400";
  };

  const getChangeArrow = () => {
    if (change === undefined || change === 0) return null;
    return change > 0 ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    );
  };

  return (
    <div className={`rounded-xl border p-4 ${getVariantStyles()}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-slate-400 text-sm font-medium">{label}</span>
        {icon && <span className="text-slate-500">{icon}</span>}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-white">
          {typeof value === "number" ? value.toFixed(1) : value}
        </span>
        {unit && <span className="text-slate-400 text-sm">{unit}</span>}
      </div>

      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-sm ${getChangeColor()}`}>
          {getChangeArrow()}
          <span>{Math.abs(change).toFixed(1)} {unit}</span>
          <span className="text-slate-500 text-xs ml-1">{changeLabel}</span>
        </div>
      )}
    </div>
  );
}

export default BodyMetricCard;
