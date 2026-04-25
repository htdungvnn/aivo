import React, { useMemo, useCallback, useEffect } from "react";
import { View, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import Svg, { G, Circle, Defs, RadialGradient, Stop } from "react-native-svg";
import { BODY_OUTLINE_FRONT } from "@aivo/shared-types";
import { HeatmapRenderer, type HeatmapVectorPoint } from "@aivo/body-compute";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HEATMAP_SIZE = Math.min(SCREEN_WIDTH - 64, 320);

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface BodyHeatmapProps {
  vectorData: HeatmapVectorPoint[];
  onPointPress?: (muscle: string, intensity: number) => void;
}

interface AnimatedHeatmapCircleProps {
  point: { x: number; y: number; intensity: number; muscle: string; cx: number; cy: number; radius: number };
  onPress?: () => void;
  isSelected: boolean;
}

function AnimatedHeatmapCircle({ point, onPress, isSelected }: AnimatedHeatmapCircleProps) {
  const radius = useSharedValue(0);
  const opacity = useSharedValue(0);

  const handlePress = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress?.();
  }, [onPress]);

  useEffect(() => {
    radius.value = withSpring(point.radius, { damping: 20, stiffness: 200 });
    opacity.value = withSpring(0.5 + point.intensity * 0.4, { damping: 20, stiffness: 200 });
  }, [point.radius, point.intensity, radius, opacity]);

  return (
    <AnimatedCircle
      cx={point.cx}
      cy={point.cy}
      // @ts-expect-error - AnimatedCircle accepts shared values for these props
      r={radius}
      fill={HeatmapRenderer.color(point.intensity, "heat")}
      // @ts-expect-error - AnimatedCircle accepts shared values for opacity
      opacity={isSelected ? 1 : opacity}
      stroke={isSelected ? "#ffffff" : "transparent"}
      strokeWidth={isSelected ? 2 : 0}
      onPress={handlePress}
    />
  );
}

export function BodyHeatmap({ vectorData, onPointPress }: BodyHeatmapProps) {
  const viewBox = "0 0 200 400";

  // Use shared business logic for data preparation
  const preparedPoints = useMemo(() => {
    return HeatmapRenderer.prepare(vectorData, { width: 200, height: 400, colorScale: "heat" });
  }, [vectorData]);

  const heatmapCircles = useMemo(() => {
    return preparedPoints.points.map((point) => (
      <AnimatedHeatmapCircle
        key={`${point.muscle}_${Math.round(point.x)}_${Math.round(point.y)}`}
        point={{
          ...point,
          cx: point.cx,
          cy: point.cy,
          radius: point.radius,
        }}
        onPress={() => onPointPress?.(point.muscle, point.intensity)}
        isSelected={false}
      />
    ));
  }, [preparedPoints.points, onPointPress]);

  return (
    <View className="bg-slate-900/50 rounded-xl p-4 items-center" testID="body-heatmap">
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
