"use client";

import React, { useMemo } from "react";

export interface HeatmapVectorPoint {
  x: number; // 0-100 normalized
  y: number;
  intensity: number; // 0-1
  muscle: string;
}

export interface BodyHeatmapProps {
  vectorData: HeatmapVectorPoint[];
  width?: number;
  height?: number;
  onPointClick?: (point: HeatmapVectorPoint) => void;
  selectedMuscles?: string[];
  colorScale?: "heat" | "cool" | "monochrome";
}

const MUSCLE_POSITIONS: Record<string, { x: number; y: number; zone: string }> = {
  chest: { x: 50, y: 42, zone: "front_torso" },
  "chest_upper": { x: 50, y: 35, zone: "front_torso" },
  "chest_lower": { x: 50, y: 50, zone: "front_torso" },
  back: { x: 50, y: 55, zone: "back_torso" },
  "back_upper": { x: 50, y: 48, zone: "back_torso" },
  "back_lower": { x: 50, y: 65, zone: "back_torso" },
  shoulders: { x: 24, y: 38, zone: "front_torso" },
  "shoulders_rear": { x: 76, y: 38, zone: "back_torso" },
  biceps: { x: 18, y: 45, zone: "front_arm" },
  triceps: { x: 22, y: 50, zone: "back_arm" },
  forearms: { x: 12, y: 55, zone: "front_arm" },
  abs: { x: 50, y: 62, zone: "front_torso" },
  core: { x: 50, y: 68, zone: "front_torso" },
  obliques: { x: 30, y: 58, zone: "front_torso" },
  quadriceps: { x: 30, y: 82, zone: "front_leg" },
  hamstrings: { x: 30, y: 92, zone: "back_leg" },
  glutes: { x: 38, y: 82, zone: "back_torso" },
  calves: { x: 30, y: 100, zone: "front_leg" },
  neck: { x: 50, y: 15, zone: "front_torso" },
};

function getColor(intensity: number, scale: string): string {
  const i = Math.max(0, Math.min(1, intensity));

  switch (scale) {
    case "cool":
      // Cyan to blue
      return `rgba(6, 182, 212, ${0.3 + i * 0.7})`;
    case "monochrome":
      return `rgba(255, 255, 255, ${0.2 + i * 0.8})`;
    case "heat":
    default:
      // Blue -> Cyan -> Green -> Yellow -> Orange -> Red
      if (i < 0.2) return `rgba(59, 130, 246, ${0.4 + i * 0.6})`; // blue-500
      if (i < 0.4) return `rgba(6, 182, 212, ${0.4 + (i - 0.2) * 5 * 0.6})`; // cyan-500
      if (i < 0.6) return `rgba(34, 197, 94, ${0.4 + (i - 0.4) * 5 * 0.6})`; // green-500
      if (i < 0.8) return `rgba(234, 179, 8, ${0.4 + (i - 0.6) * 5 * 0.6})`; // yellow-500
      return `rgba(249, 115, 22, ${0.4 + (i - 0.8) * 5 * 0.6})`; // orange-500
  }
}

function getRadius(intensity: number, baseRadius: number = 8): number {
  return baseRadius + intensity * 6;
}

// SVG paths for body outline (front and back)
const BODY_OUTLINE_FRONT = `
  M 50 15
  C 42 15, 35 18, 32 22
  C 29 26, 28 30, 28 35
  C 28 38, 27 40, 25 42
  C 23 44, 20 46, 15 48
  C 10 50, 7 52, 5 56
  C 3 60, 3 65, 4 70
  C 5 75, 6 80, 7 90
  C 8 100, 10 110, 12 120
  M 12 120 C 15 118, 20 115, 25 112
  M 50 15
  C 58 15, 65 18, 68 22
  C 71 26, 72 30, 72 35
  C 72 38, 73 40, 75 42
  C 77 44, 80 46, 85 48
  C 90 50, 93 52, 95 56
  C 97 60, 97 65, 96 70
  C 95 75, 94 80, 93 90
  C 92 100, 90 110, 88 120
  M 88 120 C 85 118, 80 115, 75 112
  M 30 28 C 30 40, 32 55, 32 70
  C 32 85, 30 100, 28 115
  M 70 28 C 70 40, 68 55, 68 70
  C 68 85, 70 100, 72 115
  M 32 115 C 28 118, 20 120, 15 122
  M 68 115 C 72 118, 80 120, 85 122
  M 45 100 C 40 100, 35 105, 32 115
  M 55 100 C 60 100, 65 105, 68 115
`.trim();

const BODY_OUTLINE_BACK = `
  M 50 15
  C 42 15, 35 18, 32 22
  C 29 26, 28 30, 28 35
  C 28 38, 27 40, 25 42
  C 23 44, 20 46, 15 48
  C 10 50, 7 52, 5 56
  C 3 60, 3 65, 4 70
  C 5 75, 6 80, 7 90
  C 8 100, 10 110, 12 120
  M 12 120 C 15 118, 20 115, 25 112
  M 50 15
  C 58 15, 65 18, 68 22
  C 71 26, 72 30, 72 35
  C 72 38, 73 40, 75 42
  C 77 44, 80 46, 85 48
  C 90 50, 93 52, 95 56
  C 97 60, 97 65, 96 70
  C 95 75, 94 80, 93 90
  C 92 100, 90 110, 88 120
  M 88 120 C 85 118, 80 115, 75 112
  M 30 32 C 30 45, 32 60, 32 75
  C 32 90, 30 105, 28 120
  M 70 32 C 70 45, 68 60, 68 75
  C 68 90, 70 105, 72 120
  M 32 120 C 28 123, 20 125, 15 127
  M 68 120 C 72 123, 80 125, 85 127
`.trim();

export function BodyHeatmap({
  vectorData,
  width = 300,
  height = 600,
  onPointClick,
  selectedMuscles = [],
  colorScale = "heat",
}: BodyHeatmapProps) {
  const viewBox = `0 0 200 400`;

  // Group points by muscle for aggregation
  const aggregatedPoints = useMemo(() => {
    const groups: Record<string, { x: number; y: number; count: number; totalIntensity: number }> = {};

    vectorData.forEach((point) => {
      const key = `${point.muscle}_${Math.round(point.x)}_${Math.round(point.y)}`;
      if (!groups[key]) {
        groups[key] = { x: point.x, y: point.y, count: 0, totalIntensity: 0 };
      }
      groups[key].count++;
      groups[key].totalIntensity += point.intensity;
    });

    return Object.values(groups).map((g) => ({
      x: g.x,
      y: g.y,
      intensity: g.totalIntensity / g.count,
    }));
  }, [vectorData]);

  // Generate heatmap overlay circles
  const heatmapOverlay = useMemo(() => {
    return aggregatedPoints
      .map((point) => {
        const cx = point.x * 2; // Normalize to 200 width
        const cy = point.y * 4; // Normalize to 400 height (0-100 -> 0-400)
        const radius = getRadius(point.intensity);
        const fill = getColor(point.intensity, colorScale);
        const opacity = 0.5 + point.intensity * 0.4;
        const isSelected = selectedMuscles.some(
          (m) => MUSCLE_POSITIONS[m] && Math.abs(MUSCLE_POSITIONS[m].x - point.x) < 5
        );

        return (
          <ellipse
            key={`${point.x}-${point.y}`}
            cx={cx}
            cy={cy}
            rx={radius}
            ry={radius * 1.2}
            fill={fill}
            fillOpacity={isSelected ? 0.9 : opacity}
            stroke={isSelected ? "#ffffff" : "transparent"}
            strokeWidth={isSelected ? 2 : 0}
            style={{ cursor: onPointClick ? "pointer" : "default" }}
            onClick={() => onPointClick?.(point as HeatmapVectorPoint)}
            onMouseEnter={(e) => {
              if (onPointClick) {
                (e.target as SVGEllipseElement).setAttribute("fill-opacity", "0.9");
              }
            }}
            onMouseLeave={(e) => {
              if (onPointClick) {
                (e.target as SVGEllipseElement).setAttribute("fill-opacity", String(opacity));
              }
            }}
          />
        );
      })
      .concat(
        // Add muscle group labels
        selectedMuscles.map((muscle) => {
          const pos = MUSCLE_POSITIONS[muscle];
          if (!pos) return null;
          return (
            <text
              key={`label-${muscle}`}
              x={pos.x * 2}
              y={pos.y * 4 + 20}
              textAnchor="middle"
              fill="#94a3b8"
              fontSize={8}
              fontWeight={500}
            >
              {muscle.toUpperCase()}
            </text>
          );
        })
      );
  }, [aggregatedPoints, selectedMuscles, colorScale, onPointClick]);

  return (
    <div className="relative flex items-center justify-center bg-slate-900/50 rounded-xl p-4">
      <svg width={width} height={height} viewBox={viewBox} className="overflow-visible">
        <defs>
          {/* Glow filter for intense areas */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Body silhouette outline */}
        <g fill="none" stroke="#475569" strokeWidth="2">
          <path d={BODY_OUTLINE_FRONT} />
        </g>

        {/* Heatmap overlay */}
        <g filter="url(#glow)">{heatmapOverlay}</g>
      </svg>
    </div>
  );
}

export default BodyHeatmap;
