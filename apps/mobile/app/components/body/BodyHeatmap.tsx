import React, { useMemo } from "react";
import { View, Dimensions } from "react-native";
import Svg, { Ellipse, G, Circle, Defs, RadialGradient, Stop } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HEATMAP_SIZE = Math.min(SCREEN_WIDTH - 64, 320);

const MUSCLE_POSITIONS: Record<string, { x: number; y: number }> = {
  chest: { x: 50, y: 42 },
  back: { x: 50, y: 55 },
  shoulders: { x: 24, y: 38 },
  biceps: { x: 18, y: 45 },
  triceps: { x: 22, y: 50 },
  abs: { x: 50, y: 62 },
  core: { x: 50, y: 68 },
  quadriceps: { x: 30, y: 82 },
  hamstrings: { x: 30, y: 92 },
  glutes: { x: 38, y: 82 },
  calves: { x: 30, y: 100 },
  neck: { x: 50, y: 15 },
};

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
  M 12 120
  C 15 118, 20 115, 25 112
  M 50 15
  C 58 15, 65 18, 68 22
  C 71 26, 72 30, 72 35
  C 72 38, 73 40, 75 42
  C 77 44, 80 46, 85 48
  C 90 50, 93 52, 95 56
  C 97 60, 97 65, 96 70
  C 95 75, 94 80, 93 90
  C 92 100, 90 110, 88 120
  M 88 120
  C 85 118, 80 115, 75 112
  M 30 28
  C 30 40, 32 55, 32 70
  C 32 85, 30 100, 28 115
  M 70 28
  C 70 40, 68 55, 68 70
  C 68 85, 70 100, 72 115
  M 32 115
  C 28 118, 20 120, 15 122
  M 68 115
  C 72 118, 80 120, 85 122
`;

function getColor(intensity: number): string {
  if (intensity < 0.2) return "rgba(59, 130, 246, 0.6)"; // blue-500
  if (intensity < 0.4) return "rgba(6, 182, 212, 0.7)"; // cyan-500
  if (intensity < 0.6) return "rgba(34, 197, 94, 0.7)"; // green-500
  if (intensity < 0.8) return "rgba(234, 179, 8, 0.7)"; // yellow-500
  return "rgba(249, 115, 22, 0.8)"; // orange-500
}

export interface BodyHeatmapProps {
  vectorData: Array<{ x: number; y: number; muscle: string; intensity: number }>;
  onPointPress?: (muscle: string, intensity: number) => void;
}

export function BodyHeatmap({ vectorData, onPointPress }: BodyHeatmapProps) {
  const viewBox = "0 0 200 400";
  const scale = HEATMAP_SIZE / 200;

  const heatmapCircles = useMemo(() => {
    // Group and average points
    const groups: Record<string, { x: number; y: number; totalI: number; count: number }> = {};

    vectorData.forEach((point) => {
      const key = `${point.muscle}_${Math.round(point.x)}_${Math.round(point.y)}`;
      if (!groups[key]) {
        groups[key] = { x: point.x, y: point.y, totalI: 0, count: 0 };
      }
      groups[key].totalI += point.intensity;
      groups[key].count++;
    });

    return Object.values(groups).map((g, index) => {
      const cx = g.x * 2;
      const cy = g.y * 4;
      const radius = 6 + (g.totalI / g.count) * 5;
      const fill = getColor(g.totalI / g.count);
      const opacity = 0.5 + (g.totalI / g.count) * 0.4;

      return (
        <Circle
          key={index}
          cx={cx}
          cy={cy}
          r={radius}
          fill={fill.replace(/[\d.]+\)$/, `${opacity})`)}
          onPress={() => {
            // Find closest muscle name
            const muscle = vectorData.find(
              (p) => Math.abs(p.x - g.x) < 2 && Math.abs(p.y - g.y) < 2
            )?.muscle;
            onPointPress?.(muscle || "", g.totalI / g.count);
          }}
        />
      );
    });
  }, [vectorData, onPointPress]);

  return (
    <View className="bg-slate-900/50 rounded-xl p-4 items-center">
      <Svg width={HEATMAP_SIZE} height={HEATMAP_SIZE * 2} viewBox={viewBox}>
        <Defs>
          <RadialGradient id="bodyGradient" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#475569" stopOpacity="0.3" />
            <Stop offset="100%" stopColor="#334155" stopOpacity="0.1" />
          </RadialGradient>
        </Defs>

        {/* Body outline */}
        <G stroke="#475569" strokeWidth="2" fill="url(#bodyGradient)">
          <G>
            {BODY_OUTLINE_FRONT.split("M").map((path, i) =>
              path ? <G key={i}><path d={`M${path}`} fill="none" /></G> : null
            )}
          </G>
        </G>

        {/* Heatmap overlay */}
        {heatmapCircles}
      </Svg>
    </View>
  );
}

export default BodyHeatmap;
