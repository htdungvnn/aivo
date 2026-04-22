"use client";

import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BODY_OUTLINE_FRONT, BODY_ZONES } from "@aivo/shared-types";

export interface HeatmapZoneOverlay {
  zoneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  intensity: number; // 0-1
  color: string;
}

export interface BodyHeatmapProps {
  // Original vector data format (for backward compatibility)
  vectorData?: Array<{ x: number; y: number; muscle: string; intensity: number; radius?: number }>;
  // New zone overlay format (preferred)
  zoneOverlays?: HeatmapZoneOverlay[];
  width?: number;
  height?: number;
  selectedMuscles?: string[];
  animate?: boolean;
  showOutline?: boolean;
  onPointClick?: (point: { muscle: string; intensity: number; x: number; y: number }) => void;
}

export function BodyHeatmap({
  vectorData,
  zoneOverlays,
  width = 300,
  height = 600,
  selectedMuscles = [],
  animate = true,
  showOutline = true,
  onPointClick,
}: BodyHeatmapProps) {
  const viewBox = `0 0 200 400`;

  // Render zone overlays (preferred approach for vision-based heatmaps)
  const zoneElements = useMemo(() => {
    if (!zoneOverlays || zoneOverlays.length === 0) {return null;}

    return zoneOverlays.map((overlay, index) => {
      const isSelected = selectedMuscles.includes(overlay.zoneId);

      const rectProps = animate
        ? {
            initial: { opacity: 0, scale: 0.8 },
            animate: { opacity: 1, scale: 1 },
            exit: { opacity: 0, scale: 0.8 },
            transition: {
              duration: 0.5,
              delay: index * 0.03,
              ease: "easeOut",
            },
          }
        : {};

      return (
        <motion.rect
          key={overlay.zoneId}
          x={overlay.x}
          y={overlay.y}
          width={overlay.width}
          height={overlay.height}
          fill={overlay.color}
          stroke={isSelected ? "#ffffff" : "transparent"}
          strokeWidth={isSelected ? 2 : 0}
          rx={4}
          ry={4}
          {...rectProps}
        />
      );
    });
  }, [zoneOverlays, selectedMuscles, animate]);

  // Fallback to vector data rendering if zoneOverlays not provided
  const vectorElements = useMemo(() => {
    if (!vectorData || vectorData.length === 0) {return null;}

    return vectorData.map((point, index) => {
      const isSelected = selectedMuscles.some(
        (m) => point.muscle === m
      );

      const delay = index * 0.01;

      const circleProps = animate
        ? {
            initial: { r: 0, opacity: 0 },
            animate: { r: point.radius || 10, opacity: point.intensity * 0.8 + 0.2 },
            exit: { r: 0, opacity: 0 },
            transition: {
              r: { type: "spring", stiffness: 200, damping: 20, delay, duration: 0.6 },
              opacity: { duration: 0.3, delay },
            },
            whileHover: {
              r: (point.radius || 10) * 1.2,
              opacity: 1,
              transition: { duration: 0.2 },
            },
          }
        : {
            r: point.radius || 10,
            opacity: point.intensity * 0.8 + 0.2,
          };

      // Color based on intensity (green -> yellow -> red)
      const intensity = point.intensity;
      let r: number, g: number, b: number;
      if (intensity < 0.5) {
        const t = intensity * 2;
        r = Math.round(255 * t);
        g = 255;
        b = 0;
      } else {
        const t = (intensity - 0.5) * 2;
        r = 255;
        g = Math.round(255 * (1 - t));
        b = 0;
      }
      const color = `rgb(${r}, ${g}, ${b})`;

      return (
        <motion.ellipse
          key={`${point.muscle}-${index}`}
          cx={point.x}
          cy={point.y}
          rx={point.radius || 10}
          ry={(point.radius || 10) * 1.2}
          fill={color}
          fillOpacity={1}
          stroke={isSelected ? "#ffffff" : "transparent"}
          strokeWidth={isSelected ? 2 : 0}
          style={{ cursor: onPointClick ? "pointer" : "default" }}
          onClick={() => onPointClick?.({ muscle: point.muscle, intensity: point.intensity, x: point.x, y: point.y })}
          {...circleProps}
        />
      );
    });
  }, [vectorData, selectedMuscles, animate, onPointClick]);

  // Generate muscle group labels
  const labels = useMemo(() => {
    return selectedMuscles.map((muscle, index) => {
      const zone = BODY_ZONES.find(z => z.id === muscle);
      if (!zone?.bounds) {return null;}
      const { x, y, width, height } = zone.bounds;
      return (
        <motion.text
          key={`label-${muscle}`}
          x={(x + width / 2) * 200}
          y={(y + height / 2) * 400 + 20}
          textAnchor="middle"
          fill="#94a3b8"
          fontSize={8}
          fontWeight={500}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
        >
          {muscle.toUpperCase()}
        </motion.text>
      );
    });
  }, [selectedMuscles]);

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
        {showOutline && (
          <g fill="none" stroke="#475569" strokeWidth="2">
            <path d={BODY_OUTLINE_FRONT} />
          </g>
        )}

        {/* Heatmap overlay with animation */}
        <g filter="url(#glow)">
          <AnimatePresence mode="popLayout">
            {zoneElements}
            {vectorElements}
          </AnimatePresence>
        </g>

        {/* Selected muscle labels */}
        {labels}
      </svg>
    </div>
  );
}

export default BodyHeatmap;
