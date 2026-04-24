import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Slider,
  TouchableOpacity,
} from "react-native";

interface AdherenceAdjusterProps {
  initialValue?: number;
  onChange: (adherence: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export const AdherenceAdjuster: React.FC<AdherenceAdjusterProps> = ({
  initialValue = 1.0,
  onChange,
  min = 0,
  max = 1,
  step = 0.05,
}) => {
  const [value, setValue] = useState(initialValue);

  const handleChange = useCallback((newValue: number) => {
    // Snap to step
    const steppedValue = Math.round(newValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    setValue(clampedValue);
    onChange(clampedValue);
  }, [min, max, step, onChange]);

  // Get adherence level description
  const getAdherenceLevel = (adherence: number): { label: string; color: string } => {
    if (adherence >= 0.9) {
      return { label: "Excellent", color: "#34C759" };
    } else if (adherence >= 0.75) {
      return { label: "Good", color: "#5AC8FA" };
    } else if (adherence >= 0.5) {
      return { label: "Moderate", color: "#FF9500" };
    } else if (adherence >= 0.25) {
      return { label: "Low", color: "#FF3B30" };
    } else {
      return { label: "Very Low", color: "#8E8E93" };
    }
  };

  const levelInfo = getAdherenceLevel(value);

  // Preset buttons
  const presets = [
    { label: "100%", value: 1.0 },
    { label: "80%", value: 0.8 },
    { label: "60%", value: 0.6 },
    { label: "40%", value: 0.4 },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>Adherence Level</Text>
        <View style={[styles.badge, { backgroundColor: levelInfo.color + "20" }]}>
          <Text style={[styles.badgeText, { color: levelInfo.color }]}>
            {levelInfo.label}
          </Text>
        </View>
      </View>

      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={min}
          maximumValue={max}
          step={step}
          value={value}
          onValueChange={handleChange}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#e0e0e0"
          thumbStyle={styles.thumb}
        />
        <View style={styles.valueIndicator}>
          <Text style={styles.valueText}>{Math.round(value * 100)}%</Text>
        </View>
      </View>

      <View style={styles.presetsContainer}>
        {presets.map((preset) => (
          <TouchableOpacity
            key={preset.value}
            style={[
              styles.presetButton,
              Math.abs(value - preset.value) < 0.01 && styles.presetButtonSelected,
            ]}
            onPress={() => handleChange(preset.value)}
          >
            <Text
              style={[
                styles.presetText,
                Math.abs(value - preset.value) < 0.01 && styles.presetTextSelected,
              ]}
            >
              {preset.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.helpTextContainer}>
        <Text style={styles.helpText}>
          How closely do you expect to follow this plan? Lower adherence shows
          more conservative projections.
        </Text>
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
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sliderContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  thumb: {
    width: 24,
    height: 24,
    backgroundColor: "#fff",
    borderWidth: 2,
    borderColor: "#007AFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  valueIndicator: {
    width: 50,
    alignItems: "center",
    marginLeft: 12,
  },
  valueText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#007AFF",
  },
  presetsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 12,
  },
  presetButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  presetButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  presetText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
  },
  presetTextSelected: {
    color: "#fff",
  },
  helpTextContainer: {
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
});

export default AdherenceAdjuster;
