import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AdherenceAdjusterComponent from "@/components/digital-twin/AdherenceAdjuster";

interface AdherenceAdjusterProps {
  initialValue?: number;
  onChange?: (adherence: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export default function AdherenceAdjuster(props: AdherenceAdjusterProps) {
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.content}>
        <AdherenceAdjusterComponent
          initialValue={props.initialValue ?? 1.0}
          onChange={props.onChange ?? (() => {})}
          min={props.min ?? 0}
          max={props.max ?? 1}
          step={props.step ?? 0.05}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  content: {
    flex: 1,
    paddingTop: 20,
  },
});
