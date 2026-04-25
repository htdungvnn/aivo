import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Slider from "@react-native-community/slider";

const COLORS = {
  primary: '#007AFF',
  primaryText: '#fff',
  textPrimary: '#1a1a1a',
  textSecondary: '#666',
  textTertiary: '#999',
  bgButton: '#f5f5f5',
  border: '#e0e0e0',
  thumbBorder: '#007AFF',
  shadow: '#000',
  success: '#34C759',
  warning: '#FF9500',
  danger: '#FF3B30',
  gray: '#8E8E93',
};

const ADHERENCE_LEVELS = [
  { threshold: 0.9, label: "Excellent", color: COLORS.success },
  { threshold: 0.75, label: "Good", color: COLORS.warning },
  { threshold: 0.5, label: "Moderate", color: COLORS.warning },
  { threshold: 0.25, label: "Low", color: COLORS.danger },
  { threshold: 0, label: "Very Low", color: COLORS.gray },
];

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
    const steppedValue = Math.round(newValue / step) * step;
    const clampedValue = Math.max(min, Math.min(max, steppedValue));
    setValue(clampedValue);
    onChange(clampedValue);
  }, [min, max, step, onChange]);

  const getAdherenceLevel = (adherence: number): { label: string; color: string } => {
    for (const level of ADHERENCE_LEVELS) {
      if (adherence >= level.threshold) {
        return { label: level.label, color: level.color };
      }
    }
    return { label: "Very Low", color: COLORS.gray };
  };

  const levelInfo = getAdherenceLevel(value);

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
          minimumTrackTintColor={COLORS.primary}
          maximumTrackTintColor={COLORS.border}
          thumbTintColor={COLORS.primaryText}
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
    color: COLORS.textPrimary,
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
  valueIndicator: {
    width: 50,
    alignItems: "center",
    marginLeft: 12,
  },
  valueText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.primary,
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
    backgroundColor: COLORS.bgButton,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetButtonSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  presetText: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  presetTextSelected: {
    color: COLORS.primaryText,
  },
  helpTextContainer: {
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
});

export default AdherenceAdjuster;
