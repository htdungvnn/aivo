"use client";

import React, { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HeatmapRenderer, type HeatmapVectorPoint } from "@aivo/body-compute";
import { MUSCLE_POSITIONS, BODY_OUTLINE_FRONT } from "@aivo/shared-types";

export interface BodyHeatmapProps {
  vectorData: HeatmapVectorPoint[];
  width?: number;
  height?: number;
  onPointClick?: (point: HeatmapVectorPoint) => void;
  selectedMuscles?: string[];
  colorScale?: "heat" | "cool" | "monochrome";
  animate?: boolean;
}

export function BodyHeatmap({
  vectorData,
  width = 300,
  height = 600,
  onPointClick,
  selectedMuscles = [],
  colorScale = "heat",
  animate = true,
}: BodyHeatmapProps) {
  const viewBox = `0 0 200 400`;

  // Use shared business logic for data preparation
  const preparedData = useMemo(() => {
    return HeatmapRenderer.prepare(vectorData, { width: 200, height: 400, colorScale });
  }, [vectorData, colorScale]);

  const { points: aggregatedPoints } = preparedData;

  // Generate heatmap overlay circles with animation
  const heatmapOverlay = useMemo(() => {
    const circles = aggregatedPoints.map((point) => {
      const isSelected = selectedMuscles.some(
        (m) => MUSCLE_POSITIONS[m] && Math.abs(MUSCLE_POSITIONS[m].x - point.x) < 5
      );

      // Staggered animation delay based on position for organic feel
      const delay = (point.x + point.y) * 0.01;

      const circleProps = animate
        ? {
            initial: { r: 0, opacity: 0, cx: point.cx, cy: point.cy },
            animate: { r: point.radius, opacity: isSelected ? 1 : parseFloat(point.color.match(/[\d.]+\)/)?.[0] || "0.5"), cx: point.cx, cy: point.cy },
            exit: { r: 0, opacity: 0, cx: point.cx, cy: point.cy },
            transition: {
              r: { type: "spring", stiffness: 200, damping: 20, delay, duration: 0.6 },
              opacity: { duration: 0.3, delay },
              cx: { duration: 0.5, delay: 0.1 },
              cy: { duration: 0.5, delay: 0.1 },
            },
            whileHover: {
              r: point.radius * 1.2,
              opacity: 1,
              transition: { duration: 0.2 },
            },
          }
        : {
            r: point.radius,
            opacity: isSelected ? 1 : parseFloat(point.color.match(/[\d.]+\)/)?.[0] || "0.5"),
          };

      return (
        <motion.ellipse
          key={`${point.muscle}-${Math.round(point.x)}-${Math.round(point.y)}`}
          cx={point.cx}
          cy={point.cy}
          rx={point.radius}
          ry={point.radius * 1.2}
          fill={point.color}
          fillOpacity={1}
          stroke={isSelected ? "#ffffff" : "transparent"}
          strokeWidth={isSelected ? 2 : 0}
          style={{ cursor: onPointClick ? "pointer" : "default" }}
          layout
          onClick={() => onPointClick?.(point as HeatmapVectorPoint)}
          {...circleProps}
        />
      );
    });

    // Add muscle group labels with layout animations
    const labels = selectedMuscles.map((muscle) => {
      const pos = MUSCLE_POSITIONS[muscle];
      if (!pos) { return null; }
      return (
        <motion.text
          key={`label-${muscle}`}
          x={pos.x * 2}
          y={pos.y * 4 + 20}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={8}
          fontWeight={500}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          layout
        >
          {muscle.toUpperCase()}
        </motion.text>
      );
    });

    return [...circles, ...labels];
  }, [aggregatedPoints, selectedMuscles, onPointClick, animate]);

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

        {/* Heatmap overlay with animation */}
        <g filter="url(#glow)">
          <AnimatePresence mode="popLayout">
            {heatmapOverlay}
          </AnimatePresence>
        </g>
      </svg>
    </div>
  );
}

export default BodyHeatmap;
