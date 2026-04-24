import React, { useMemo } from "react";
import { View, StyleSheet, Dimensions, type StyleProp, type ViewStyle } from "react-native";
import Svg, { G, Path, Defs, LinearGradient, Stop } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const AVATAR_SIZE = SCREEN_WIDTH * 0.6;

// Define body region paths (simplified 2D silhouette)
const BODY_PATHS = {
  head: "M 50 10 C 45 10, 40 15, 40 20 C 40 25, 45 30, 50 30 C 55 30, 60 25, 60 20 C 60 15, 55 10, 50 10",
  neck: "M 45 30 L 45 38 L 55 38 L 55 30",
  torso: "M 35 38 C 30 40, 25 50, 25 70 L 25 110 C 25 120, 30 125, 35 125 L 65 125 C 70 125, 75 120, 75 110 L 75 70 C 75 50, 70 40, 65 38 Z",
  leftArm: "M 25 45 C 15 50, 10 60, 10 80 C 10 100, 15 110, 20 115 L 30 105 C 28 95, 28 85, 30 75 C 32 65, 35 55, 25 45 Z",
  rightArm: "M 75 45 C 85 50, 90 60, 90 80 C 90 100, 85 110, 80 115 L 70 105 C 72 95, 72 85, 70 75 C 68 65, 65 55, 75 45 Z",
  leftLeg: "M 30 120 C 25 125, 20 140, 20 165 C 20 190, 25 195, 30 195 L 40 195 C 45 195, 48 190, 48 165 C 48 140, 45 125, 40 120 Z",
  rightLeg: "M 70 120 C 75 125, 80 140, 80 165 C 80 190, 75 195, 70 195 L 60 195 C 55 195, 52 190, 52 165 C 52 140, 55 125, 60 120 Z",
};

interface MorphTargets {
  body_scale: number;
  fat_distribution: Array<{ region: string; intensity: number }>;
  muscle_development: Array< { muscle_group: string; development_factor: number }>;
  skin_tightness: number;
  posture_adjustment: number;
}

interface AvatarViewer2DProps {
  morphTargets: MorphTargets;
  baseColor?: string;
  muscleColor?: string;
  showMuscleDefinitions?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const AvatarViewer2D: React.FC<AvatarViewer2DProps> = ({
  morphTargets,
  baseColor = "#e0ac69",
  muscleColor = "#c9784a",
  showMuscleDefinitions = true,
  style,
}) => {
  // Calculate fat intensity per region
  const fatIntensityMap = useMemo(() => {
    const map: Record<string, number> = {};
    morphTargets.fat_distribution.forEach((fd) => {
      map[fd.region] = fd.intensity;
    });
    return map;
  }, [morphTargets.fat_distribution]);

  // Calculate muscle development per group
  const muscleFactorMap = useMemo(() => {
    const map: Record<string, number> = {};
    morphTargets.muscle_development.forEach((md) => {
      map[md.muscle_group] = md.development_factor;
    });
    return map;
  }, [morphTargets.muscle_development]);

  // Apply body scale transformation
  const scale = morphTargets.body_scale;
  const scaledSize = AVATAR_SIZE * scale;

  // Calculate region-specific transforms
  const getFatTransform = (regionName: string) => {
    const intensity = fatIntensityMap[regionName] || 0;
    if (intensity <= 0) {
      return {};
    }

    const widthScale = 1 + intensity * 0.3;
    const yOffset = intensity * 5;

    return { scaleX: widthScale, translateY: yOffset };
  };

  const getMuscleDefinition = (muscleGroup: string) => {
    const factor = muscleFactorMap[muscleGroup] || 1.0;
    if (!showMuscleDefinitions || factor <= 1.0) {
      return {};
    }
    const strokeWidth = Math.min(2, (factor - 1) * 2);
    return { stroke: styles.muscleStrokeColor, strokeWidth };
  };

  // Render a body path with applied morphing
  const renderBodyPath = (pathData: string, regionName?: string, muscleGroup?: string) => {
    const fatTransform = regionName ? getFatTransform(regionName) : {};
    const muscleStyle = muscleGroup ? getMuscleDefinition(muscleGroup) : {};

    const fillOpacity = 0.8 + (morphTargets.skin_tightness - 0.3) * 0.2;

    return (
      <Path
        key={`${regionName || "body"}-${muscleGroup || "base"}`}
        d={pathData}
        fill={muscleGroup && (muscleFactorMap[muscleGroup] || 1) > 1.1 ? muscleColor : baseColor}
        fillOpacity={fillOpacity}
        transform={[
          { translateX: (AVATAR_SIZE - scaledSize) / 2 },
          { translateY: (AVATAR_SIZE - scaledSize) / 2 },
          { scaleX: scale * (fatTransform.scaleX || 1) },
          { scaleY: scale },
        ]}
        {...muscleStyle}
      />
    );
  };

  return (
    <View style={[styles.container, style]}>
      <Svg width={AVATAR_SIZE} height={AVATAR_SIZE} viewBox={`0 0 100 125`}>
        <Defs>
          {/* Gradient for body shading */}
          <LinearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#f5d0b5" stopOpacity="0.9" />
            <Stop offset="50%" stopColor={baseColor} stopOpacity="0.85" />
            <Stop offset="100%" stopColor="#c9784a" stopOpacity="0.9" />
          </LinearGradient>
        </Defs>

        <G
          transform={`translate(${morphTargets.posture_adjustment * 10}, 0)`}
          rotation={morphTargets.posture_adjustment * 5}
          originX={50}
          originY={60}
        >
          {/* Render body parts in order (back to front) */}
          {/* Torso */}
          {renderBodyPath(BODY_PATHS.torso, "abdomen")}

          {/* Left arm (back) */}
          {renderBodyPath(BODY_PATHS.leftArm, "arms", "triceps")}
          {renderBodyPath(BODY_PATHS.leftArm, "arms", "biceps")}

          {/* Right arm (back) */}
          {renderBodyPath(BODY_PATHS.rightArm, "arms", "triceps")}
          {renderBodyPath(BODY_PATHS.rightArm, "arms", "biceps")}

          {/* Legs (back) */}
          {renderBodyPath(BODY_PATHS.leftLeg, "thighs", "hamstrings")}
          {renderBodyPath(BODY_PATHS.leftLeg, "calves", "calves")}
          {renderBodyPath(BODY_PATHS.rightLeg, "thighs", "hamstrings")}
          {renderBodyPath(BODY_PATHS.rightLeg, "calves", "calves")}

          {/* Head and neck (front) */}
          {renderBodyPath(BODY_PATHS.neck, "neck")}
          {renderBodyPath(BODY_PATHS.head, "face")}

          {/* Shoulders (front) */}
          {renderBodyPath(BODY_PATHS.torso, "shoulders", "deltoids")}

          {/* Chest */}
          {renderBodyPath(BODY_PATHS.torso, "chest", "pectorals")}

          {/* Abs */}
          {renderBodyPath(BODY_PATHS.torso, "abdomen", "abs")}

          {/* Glutes */}
          {renderBodyPath(BODY_PATHS.leftLeg, "hips", "glutes")}
          {renderBodyPath(BODY_PATHS.rightLeg, "hips", "glutes")}

          {/* Quadriceps (front of legs) */}
          {renderBodyPath(BODY_PATHS.leftLeg, "thighs", "quadriceps")}
          {renderBodyPath(BODY_PATHS.rightLeg, "thighs", "quadriceps")}

          {/* Calves (front) */}
          {renderBodyPath(BODY_PATHS.leftLeg, "calves", "calves")}
          {renderBodyPath(BODY_PATHS.rightLeg, "calves", "calves")}
        </G>
      </Svg>
    </View>
  );
};

const COLOR_TRANSPARENT = 'transparent';

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLOR_TRANSPARENT,
  },
});

export default AvatarViewer2D;
