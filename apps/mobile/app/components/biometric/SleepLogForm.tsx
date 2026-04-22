import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { createSleepLog, type SleepLogCreate } from "@/services/biometric-api";
import { Clock, Save, Bed } from "lucide-react-native";

interface SleepLogFormProps {
  onSuccess?: () => void;
}

export default function SleepLogForm({ onSuccess }: SleepLogFormProps) {
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [durationHours, setDurationHours] = useState("");
  const [quality, setQuality] = useState("");
  const [bedtime, setBedtime] = useState("");
  const [waketime, setWaketime] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleDateChange = (_event: unknown, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  // Handlers for bedtime/waketime are not currently used as DateTimePicker components are not in the form
  // const handleBedtimeChange = (_event: unknown, selectedTime?: Date) => {
  //   if (selectedTime) {
  //     const hours = selectedTime.getHours().toString().padStart(2, "0");
  //     const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
  //     setBedtime(`${hours}:${minutes}`);
  //   }
  // };

  // const handleWaketimeChange = (_event: unknown, selectedTime?: Date) => {
  //   if (selectedTime) {
  //     const hours = selectedTime.getHours().toString().padStart(2, "0");
  //     const minutes = selectedTime.getMinutes().toString().padStart(2, "0");
  //     setWaketime(`${hours}:${minutes}`);
  //   }
  // };

  const handleSubmit = useCallback(async () => {
    if (!durationHours || parseFloat(durationHours) <= 0) {
      Alert.alert("Invalid Input", "Please enter a valid sleep duration.");
      return;
    }

    const sleepData: SleepLogCreate = {
      date: date.toISOString().split("T")[0],
      durationHours: parseFloat(durationHours),
      qualityScore: quality ? Math.min(100, Math.max(0, parseInt(quality))) : undefined,
      bedtime: bedtime || undefined,
      waketime: waketime || undefined,
      notes: notes || undefined,
      source: "manual",
    };

    setLoading(true);
    try {
      await createSleepLog(sleepData);
      Alert.alert("Success", "Sleep log saved successfully!", [
        { text: "OK", onPress: () => onSuccess?.() },
      ]);
      // Reset form
      setDate(new Date());
      setDurationHours("");
      setQuality("");
      setBedtime("");
      setWaketime("");
      setNotes("");
    } catch {
      Alert.alert("Error", "Failed to save sleep log. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [date, durationHours, quality, bedtime, waketime, notes, onSuccess]);

  return (
    <ScrollView className="flex-1 bg-slate-950">
      <View className="p-4 space-y-4">
        {/* Date Picker */}
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <Text className="text-slate-200 font-semibold mb-2">Date</Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            className="flex-row items-center justify-between py-2"
          >
            <Text className="text-white">
              {date.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
            </Text>
            <Clock className="w-5 h-5 text-cyan-400" />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Duration */}
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <Text className="text-slate-200 font-semibold mb-2">Sleep Duration (hours)</Text>
          <View className="flex-row items-center gap-3">
            <Bed className="w-5 h-5 text-blue-400" />
            <TextInput
              className="flex-1 text-white text-lg"
              placeholder="e.g., 7.5"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={durationHours}
              onChangeText={setDurationHours}
            />
            <Text className="text-slate-400">hrs</Text>
          </View>
        </View>

        {/* Quality */}
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <Text className="text-slate-200 font-semibold mb-2">Sleep Quality (%)</Text>
          <View className="flex-row items-center gap-3">
            <TextInput
              className="flex-1 text-white text-lg"
              placeholder="0-100"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
              value={quality}
              onChangeText={setQuality}
            />
            <Text className="text-slate-400">%</Text>
          </View>
          <Text className="text-slate-500 text-xs mt-2">
            How rested did you feel? (0 = terrible, 100 = amazing)
          </Text>
        </View>

        {/* Bedtime & Waketime */}
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
          <Text className="text-slate-200 font-semibold">Times</Text>

          <View className="flex-row items-center gap-3">
            <Text className="text-slate-400 w-20">Bedtime</Text>
            <TouchableOpacity
              onPress={() => {
                // Show time picker for bedtime
                Alert.alert("Set Bedtime", "Time picker would open here");
              }}
              className="flex-1 flex-row items-center justify-between py-2 border border-slate-700 rounded-lg px-3"
            >
              <Text className={bedtime ? "text-white" : "text-slate-500"}>
                {bedtime || "Select time"}
              </Text>
              <Clock className="w-4 h-4 text-slate-400" />
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center gap-3">
            <Text className="text-slate-400 w-20">Wake</Text>
            <TouchableOpacity
              onPress={() => {
                // Show time picker for waketime
                Alert.alert("Set Wake Time", "Time picker would open here");
              }}
              className="flex-1 flex-row items-center justify-between py-2 border border-slate-700 rounded-lg px-3"
            >
              <Text className={waketime ? "text-white" : "text-slate-500"}>
                {waketime || "Select time"}
              </Text>
              <Clock className="w-4 h-4 text-slate-400" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notes */}
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <Text className="text-slate-200 font-semibold mb-2">Notes (optional)</Text>
          <TextInput
            className="text-white min-h-[80] border border-slate-700 rounded-lg p-3"
            placeholder="Any factors affecting your sleep? Caffeine, stress, etc."
            placeholderTextColor="#64748b"
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          onPress={() => void handleSubmit()}
          disabled={loading || !durationHours}
          className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-xl p-4 items-center flex-row justify-center gap-2 disabled:opacity-50"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Save className="w-5 h-5 text-white" />
          )}
          <Text className="text-white font-semibold">
            {loading ? "Saving..." : "Save Sleep Log"}
          </Text>
        </TouchableOpacity>

        {/* Tips */}
        <View className="bg-gradient-to-br from-blue-950/30 to-cyan-950/30 border border-blue-500/20 rounded-xl p-4">
          <Text className="text-blue-400 font-semibold mb-2">Sleep Tips</Text>
          <View className="space-y-2">
            {[
              "Aim for 7-9 hours of sleep for optimal recovery",
              "Consistent bedtime helps regulate your circadian rhythm",
              "Avoid screens 30 minutes before bed",
              "Keep your bedroom cool and dark",
            ].map((tip, i) => (
              <View key={i} className="flex-row items-start gap-2">
                <Text className="text-blue-400 mt-0.5">•</Text>
                <Text className="text-slate-300 text-sm flex-1">{tip}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
