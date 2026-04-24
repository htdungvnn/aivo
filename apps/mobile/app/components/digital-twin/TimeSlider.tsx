import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface TimeSliderProps {
  selectedWeeks: number;
  onWeeksChange: (weeks: number) => void;
  minWeeks?: number;
  maxWeeks?: number;
  step?: number;
}

export const TimeSlider: React.FC<TimeSliderProps> = ({
  selectedWeeks,
  onWeeksChange,
  minWeeks = 4,
  maxWeeks = 12,
  step = 4,
}) => {
  // Generate week options
  const weeksOptions = useCallback(() => {
    const options = [];
    for (let w = minWeeks; w <= maxWeeks; w += step) {
      options.push(w);
    }
    return options;
  }, [minWeeks, maxWeeks, step]);

  const options = weeksOptions();

  // Calculate position of selected week (for track indicator)
  const selectedIndex = options.indexOf(selectedWeeks);
  const progress = selectedIndex >= 0 ? selectedIndex / (options.length - 1) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.labelContainer}>
        <Text style={styles.label}>Time Horizon</Text>
        <Text style={styles.value}>{selectedWeeks} weeks</Text>
      </View>

      {/* Custom slider track with buttons */}
      <View style={styles.sliderContainer}>
        <View style={styles.track}>
          <View
            style={[
              styles.trackFill,
              { width: `${progress * 100}%` },
            ]}
          />
        </View>

        <View style={styles.buttonsContainer}>
          {options.map((weeks) => (
            <TouchableOpacity
              key={weeks}
              style={[
                styles.weekButton,
                selectedWeeks === weeks && styles.weekButtonSelected,
              ]}
              onPress={() => onWeeksChange(weeks)}
            >
              <Text
                style={[
                  styles.weekButtonText,
                  selectedWeeks === weeks && styles.weekButtonTextSelected,
                ]}
              >
                {weeks}w
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Preset labels */}
      <View style={styles.presetsContainer}>
        <Text style={styles.presetLabel}>Short term</Text>
        <Text style={styles.presetLabel}>Long term</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  labelContainer: {
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
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
  },
  sliderContainer: {
    marginBottom: 8,
  },
  track: {
    height: 6,
    backgroundColor: "#e0e0e0",
    borderRadius: 3,
    marginBottom: 12,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    backgroundColor: "#007AFF",
    borderRadius: 3,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  weekButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  weekButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  weekButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  weekButtonTextSelected: {
    color: "#fff",
  },
  presetsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  presetLabel: {
    fontSize: 12,
    color: "#999",
  },
});

export default TimeSlider;
