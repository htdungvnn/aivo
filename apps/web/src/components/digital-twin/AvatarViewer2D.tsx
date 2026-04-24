"use client";

import React, { useMemo } from "react";
import type { SVGProps } from "react";

interface MorphTargets {
  body_scale: number;
  fat_distribution: Array<{ region: string; intensity: number }>;
  muscle_development: Array<{ muscle_group: string; development_factor: number }>;
  skin_tightness: number;
  posture_adjustment: number;
}

interface AvatarViewer2DProps extends SVGProps<SVGSVGElement> {
  morphTargets: MorphTargets;
  baseColor?: string;
  muscleColor?: string;
  showMuscleDefinitions?: boolean;
  size?: number | string;
}

// Simplified body paths for SVG rendering
const BODY_PATHS = {
  head: "M 50 10 C 45 10, 40 15, 40 20 C 40 25, 45 30, 50 30 C 55 30, 60 25, 60 20 C 60 15, 55 10, 50 10",
  neck: "M 45 30 L 45 38 L 55 38 L 55 30",
  torso: "M 35 38 C 30 40, 25 50, 25 70 L 25 110 C 25 120, 30 125, 35 125 L 65 125 C 70 125, 75 120, 75 110 L 75 70 C 75 50, 70 40, 65 38 Z",
  leftArm: "M 25 45 C 15 50, 10 60, 10 80 C 10 100, 15 110, 20 115 L 30 105 C 28 95, 28 85, 30 75 C 32 65, 35 55, 25 45 Z",
  rightArm: "M 75 45 C 85 50, 90 60, 90 80 C 90 100, 85 110, 80 115 L 70 105 C 72 95, 72 85, 70 75 C 68 65, 65 55, 75 45 Z",
  leftLeg: "M 30 120 C 25 125, 20 140, 20 165 C 20 190, 25 195, 30 195 L 40 195 C 45 195, 48 190, 48 165 C 48 140, 45 125, 40 120 Z",
  rightLeg: "M 70 120 C 75 125, 80 140, 80 165 C 80 190, 75 195, 70 195 L 60 195 C 55 195, 52 190, 52 165 C 52 140, 55 125, 60 120 Z",
};

export const AvatarViewer2D: React.FC<AvatarViewer2DProps> = ({
  morphTargets,
  baseColor = "#e0ac69",
  muscleColor = "#c9784a",
  showMuscleDefinitions = true,
  size = 300,
  ...svgProps
}) => {
  // Ensure size is a number
  const numericSize = typeof size === "number" ? size : parseFloat(String(size)) || 300;
  const scale = morphTargets.body_scale;
  const viewBoxSize = 125;
  const scaledSize = numericSize * scale;

  // Build fat intensity map
  const fatIntensityMap = useMemo(() => {
    const map: Record<string, number> = {};
    morphTargets.fat_distribution.forEach((fd) => {
      map[fd.region] = fd.intensity;
    });
    return map;
  }, [morphTargets.fat_distribution]);

  // Build muscle factor map
  const muscleFactorMap = useMemo(() => {
    const map: Record<string, number> = {};
    morphTargets.muscle_development.forEach((md) => {
      map[md.muscle_group] = md.development_factor;
    });
    return map;
  }, [morphTargets.muscle_development]);

  // Calculate fat transform for a region
  const getFatTransform = (regionName: string) => {
    const intensity = fatIntensityMap[regionName] || 0;
    if (intensity <= 0) {
      return {};
    }
    const widthScale = 1 + intensity * 0.3;
    const yOffset = intensity * 5;
    return { scaleX: widthScale, translateY: yOffset };
  };

  // Calculate muscle stroke style
  const getMuscleStyle = (muscleGroup: string) => {
    const factor = muscleFactorMap[muscleGroup] || 1.0;
    if (!showMuscleDefinitions || factor <= 1.1) {
      return {};
    }
    const strokeWidth = Math.min(2, (factor - 1) * 2);
    return { stroke: "#8b5a2b", strokeWidth, fill: "none" };
  };

  // Render body parts in order
  const renderBodyParts = () => {
    const parts = [
      { path: BODY_PATHS.torso, region: "abdomen", muscleGroup: undefined },
      { path: BODY_PATHS.leftArm, region: "arms", muscleGroup: "triceps" },
      { path: BODY_PATHS.leftArm, region: "arms", muscleGroup: "biceps" },
      { path: BODY_PATHS.rightArm, region: "arms", muscleGroup: "triceps" },
      { path: BODY_PATHS.rightArm, region: "arms", muscleGroup: "biceps" },
      { path: BODY_PATHS.leftLeg, region: "thighs", muscleGroup: "hamstrings" },
      { path: BODY_PATHS.leftLeg, region: "calves", muscleGroup: "calves" },
      { path: BODY_PATHS.rightLeg, region: "thighs", muscleGroup: "hamstrings" },
      { path: BODY_PATHS.rightLeg, region: "calves", muscleGroup: "calves" },
      { path: BODY_PATHS.neck, region: "neck", muscleGroup: undefined },
      { path: BODY_PATHS.head, region: "face", muscleGroup: undefined },
      { path: BODY_PATHS.torso, region: "shoulders", muscleGroup: "deltoids" },
      { path: BODY_PATHS.torso, region: "chest", muscleGroup: "pectorals" },
      { path: BODY_PATHS.torso, region: "abdomen", muscleGroup: "abs" },
      { path: BODY_PATHS.leftLeg, region: "hips", muscleGroup: "glutes" },
      { path: BODY_PATHS.rightLeg, region: "hips", muscleGroup: "glutes" },
      { path: BODY_PATHS.leftLeg, region: "thighs", muscleGroup: "quadriceps" },
      { path: BODY_PATHS.rightLeg, region: "thighs", muscleGroup: "quadriceps" },
      { path: BODY_PATHS.leftLeg, region: "calves", muscleGroup: "calves" },
      { path: BODY_PATHS.rightLeg, region: "calves", muscleGroup: "calves" },
    ];

    return parts.map(({ path, region, muscleGroup }, index) => {
      const fatTransform = getFatTransform(region);
      const muscleStyle = muscleGroup ? getMuscleStyle(muscleGroup) : {};
      const factor = muscleGroup ? (muscleFactorMap[muscleGroup] || 1) : 1;
      const fill = muscleGroup && factor > 1.1 ? muscleColor : baseColor;
      const fillOpacity = 0.8 + (morphTargets.skin_tightness - 0.3) * 0.2;

      const translateX = (numericSize - scaledSize) / 2;
      const translateY = (numericSize - scaledSize) / 2;
      const scaleX = scale * (fatTransform.scaleX || 1);
      const transform = `translate(${translateX}, ${translateY}) scale(${scaleX}, ${scale})`;

      return (
        <path
          key={`${region}-${muscleGroup || "base"}-${index}`}
          d={path}
          fill={fill}
          fillOpacity={fillOpacity}
          transform={transform}
          {...muscleStyle}
        />
      );
    });
  };

  return (
    <svg
      width={numericSize}
      height={numericSize}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize * 1.25}`}
      {...svgProps}
    >
      <defs>
        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f5d0b5" stopOpacity="0.9" />
          <stop offset="50%" stopColor={baseColor} stopOpacity="0.85" />
          <stop offset="100%" stopColor="#c9784a" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      <g
        transform={`translate(${morphTargets.posture_adjustment * 10}, 0) rotate(${morphTargets.posture_adjustment * 5}, 50, 60)`}
      >
        {renderBodyParts()}
      </g>
    </svg>
  );
};

export default AvatarViewer2D;
