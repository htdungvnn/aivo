import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AvatarViewer2DComponent from "@/components/digital-twin/AvatarViewer2D";

interface MorphTargets {
  body_scale: number;
  fat_distribution: Array<{ region: string; intensity: number }>;
  muscle_development: Array<{ muscle_group: string; development_factor: number }>;
  skin_tightness: number;
  posture_adjustment: number;
}

interface AvatarViewer2DProps {
  morphTargets?: MorphTargets;
  baseColor?: string;
  muscleColor?: string;
  showMuscleDefinitions?: boolean;
  style?: any;
}

const DEFAULT_MORPH_TARGETS: MorphTargets = {
  body_scale: 1.0,
  fat_distribution: [],
  muscle_development: [],
  skin_tightness: 0.5,
  posture_adjustment: 0,
};

export default function AvatarViewer2D(props: AvatarViewer2DProps) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <AvatarViewer2DComponent
          morphTargets={props.morphTargets ?? DEFAULT_MORPH_TARGETS}
          baseColor={props.baseColor ?? "#e0ac69"}
          muscleColor={props.muscleColor ?? "#c9784a"}
          showMuscleDefinitions={props.showMuscleDefinitions ?? true}
          style={props.style}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
