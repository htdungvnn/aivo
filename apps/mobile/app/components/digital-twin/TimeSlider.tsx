import React, { useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";

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

      <View style={styles.presetsContainer}>
        <Text style={styles.presetLabel}>Short term</Text>
        <Text style={styles.presetLabel}>Long term</Text>
      </View>
    </View>
  );
};

const COLOR_PRIMARY = '#007AFF';
const COLOR_PRIMARY_TEXT = '#fff';
const COLOR_TEXT_PRIMARY = '#1a1a1a';
const COLOR_TEXT_SECONDARY = '#666';
const COLOR_TEXT_TERTIARY = '#999';
const COLOR_BG_BUTTON = '#f5f5f5';
const COLOR_BORDER = '#e0e0e0';
const COLOR_TRACK = '#e0e0e0';

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
    color: COLOR_TEXT_PRIMARY,
  },
  value: {
    fontSize: 18,
    fontWeight: "700",
    color: COLOR_PRIMARY,
  },
  sliderContainer: {
    marginBottom: 8,
  },
  track: {
    height: 6,
    backgroundColor: COLOR_TRACK,
    borderRadius: 3,
    marginBottom: 12,
    overflow: "hidden",
  },
  trackFill: {
    height: "100%",
    backgroundColor: COLOR_PRIMARY,
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
    backgroundColor: COLOR_BG_BUTTON,
    borderWidth: 1,
    borderColor: COLOR_BORDER,
  },
  weekButtonSelected: {
    backgroundColor: COLOR_PRIMARY,
    borderColor: COLOR_PRIMARY,
  },
  weekButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLOR_TEXT_SECONDARY,
  },
  weekButtonTextSelected: {
    color: COLOR_PRIMARY_TEXT,
  },
  presetsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  presetLabel: {
    fontSize: 12,
    color: COLOR_TEXT_TERTIARY,
  },
});

export default TimeSlider;
