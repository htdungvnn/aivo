import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface TimeSliderProps {
  selectedWeeks: number;
  onWeeksChange: (weeks: number) => void;
  minWeeks?: number;
  maxWeeks?: number;
  step?: number;
}

const TimeSlider: React.FC<TimeSliderProps> = ({
  selectedWeeks,
  onWeeksChange,
  minWeeks = 4,
  maxWeeks = 12,
  step = 1,
}) => {
  const handleDecrease = useCallback(() => {
    const newValue = selectedWeeks - step;
    if (newValue >= minWeeks) {
      onWeeksChange(newValue);
    }
  }, [selectedWeeks, step, minWeeks, onWeeksChange]);

  const handleIncrease = useCallback(() => {
    const newValue = selectedWeeks + step;
    if (newValue <= maxWeeks) {
      onWeeksChange(newValue);
    }
  }, [selectedWeeks, step, maxWeeks, onWeeksChange]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Time Horizon</Text>
        <View style={styles.valueBadge}>
          <Text style={styles.valueText}>{selectedWeeks} weeks</Text>
        </View>
      </View>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.button, selectedWeeks <= minWeeks && styles.buttonDisabled]}
          onPress={handleDecrease}
          disabled={selectedWeeks <= minWeeks}
        >
          <Text style={[styles.buttonText, selectedWeeks <= minWeeks && styles.buttonTextDisabled]}>-</Text>
        </TouchableOpacity>

        <View style={styles.sliderTrack}>
          <View style={styles.sliderFill} />
          <View style={styles.sliderThumb} />
        </View>

        <TouchableOpacity
          style={[styles.button, selectedWeeks >= maxWeeks && styles.buttonDisabled]}
          onPress={handleIncrease}
          disabled={selectedWeeks >= maxWeeks}
        >
          <Text style={[styles.buttonText, selectedWeeks >= maxWeeks && styles.buttonTextDisabled]}>+</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rangeLabels}>
        <Text style={styles.rangeLabel}>{minWeeks}w</Text>
        <Text style={styles.rangeLabel}>{maxWeeks}w</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  valueBadge: {
    backgroundColor: "#007AFF20",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  valueText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#007AFF",
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    lineHeight: 28,
  },
  buttonTextDisabled: {
    color: "#999",
  },
  sliderTrack: {
    flex: 1,
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    position: "relative",
  },
  sliderFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#007AFF",
    borderRadius: 3,
    width: "30%",
  },
  sliderThumb: {
    position: "absolute",
    top: -7,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#007AFF",
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
    left: "30%",
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  rangeLabel: {
    fontSize: 12,
    color: "#666",
  },
});

export default TimeSlider;
