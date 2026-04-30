import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import {
  getFormVideoStatus,
  getFormVideoResult,
  listUserFormVideos,
} from "../services/form-analysis-api";
import type { FormAnalysisVideo, FormExerciseType } from "@aivo/shared-types";
import {
  Video,
  Upload,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  Clock,
  X,
} from "lucide-react-native";

type VideoWithStatus = FormAnalysisVideo & {
  hasAnalysis: boolean;
  completedAt: number | null;
  grade: string | null;
  overallScore: number | null;
};

export default function FormAnalysisScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [videos, setVideos] = useState<VideoWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<FormExerciseType>("squat");

  const exerciseTypes: { value: FormExerciseType; label: string }[] = [
    { value: "squat", label: "Squat" },
    { value: "deadlift", label: "Deadlift" },
    { value: "bench_press", label: "Bench Press" },
    { value: "overhead_press", label: "Overhead Press" },
    { value: "lunge", label: "Lunge" },
  ];

  const loadVideos = useCallback(async () => {
    try {
      const data = await listUserFormVideos();
      setVideos(data);
    } catch {
      // Failed to load videos
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadVideos();
  };

  const handleUpload = async () => {
    if (!user) {return;}

    // For now, we'll simulate picking a video file
    // In production, use expo-image-picker with video type or a dedicated video picker
    Alert.alert(
      "Upload Video",
      "Select exercise type and record a 10-second video of your form.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue",
          onPress: () => {
            setShowExercisePicker(true);
          },
        },
      ]
    );
  };

  const handleStartRecording = async () => {
    // For now, this is a placeholder for actual camera integration
    Alert.alert(
      "Record Video",
      `Recording a ${selectedExercise.replace("_", " ")} video. This will open the camera.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Recording",
          onPress: () => {
            // TODO: Implement actual camera recording with expo-camera
            // For now, simulate with a file picker or mock upload
            Alert.alert("Coming Soon", "Video recording will be available in the next update.");
          },
        },
      ]
    );
  };

  const handleVideoPress = async (video: VideoWithStatus) => {
    try {
      const status = await getFormVideoStatus(video.id);

      if (!status.analysisCompleted) {
        Alert.alert(
          "Analysis Pending",
          `Your video is ${status.status}. You'll receive a notification when analysis is complete.`,
          [{ text: "OK" }]
        );
        return;
      }

      // Fetch full results
      await getFormVideoResult(video.id);
      router.push({ pathname: "/form-result" as const, params: { videoId: video.id } });
    } catch {
      Alert.alert("Error", "Failed to load video details");
    }
  };

  const getStatusIcon = (video: VideoWithStatus) => {
    if (video.status === "completed" && video.hasAnalysis) {
      return <CheckCircle className="w-5 h-5 text-emerald-400" />;
    }
    if (video.status === "failed") {
      return <X className="w-5 h-5 text-red-400" />;
    }
    if (video.status === "processing" || video.status === "pending") {
      return <Clock className="w-5 h-5 text-amber-400" />;
    }
    return <AlertCircle className="w-5 h-5 text-slate-400" />;
  };

  const getStatusColor = (video: VideoWithStatus) => {
    if (video.status === "completed" && video.hasAnalysis) {return "text-emerald-400";}
    if (video.status === "failed") {return "text-red-400";}
    if (video.status === "processing" || video.status === "pending") {return "text-amber-400";}
    return "text-slate-400";
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const renderVideoCard = (video: VideoWithStatus) => (
    <TouchableOpacity
      key={video.id}
      onPress={() => void handleVideoPress(video)}
      className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 mb-3"
    >
      <View className="flex-row items-start gap-3">
        {/* Thumbnail placeholder */}
        <View className="w-20 h-20 bg-slate-800 rounded-lg items-center justify-center flex-shrink-0">
          <Video className="w-8 h-8 text-slate-600" />
        </View>

        <View className="flex-1">
          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-slate-200 font-semibold capitalize">
              {video.exerciseType.replace("_", " ")}
            </Text>
            {getStatusIcon(video)}
          </View>

          <Text className="text-slate-400 text-xs mb-2">
            {formatDate(video.createdAt)}
          </Text>

          {video.hasAnalysis && video.grade && video.overallScore ? (
            <View className="flex-row items-center gap-2">
              <View className="px-2 py-1 bg-emerald-500/20 rounded">
                <Text className="text-emerald-400 text-xs font-bold">Grade {video.grade}</Text>
              </View>
              <Text className="text-slate-300 text-sm">
                {Math.round(video.overallScore)}/100
              </Text>
            </View>
          ) : (
            <Text className={`text-xs ${getStatusColor(video)}`}>
              {video.status === "pending" && "Waiting for analysis..."}
              {video.status === "processing" && "Analyzing your form..."}
              {video.status === "failed" && "Analysis failed"}
            </Text>
          )}
        </View>

        <ChevronRight className="w-5 h-5 text-slate-600" />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text className="text-slate-400 mt-4">Loading your videos...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View className="p-4">
        {/* Header */}
        <View className="mb-6">
          <Text className="text-2xl font-bold text-white mb-1">Form Coach</Text>
          <Text className="text-slate-400 text-sm">
            Upload exercise videos for AI-powered form analysis
          </Text>
        </View>

        {/* Upload Card */}
        <TouchableOpacity
          onPress={() => void handleUpload()}
          className="bg-gradient-to-br from-cyan-950/30 to-blue-950/30 border border-cyan-500/30 rounded-xl p-6 mb-6"
        >
          <View className="flex-row items-center gap-4">
            <View className="w-14 h-14 bg-cyan-500/20 rounded-xl items-center justify-center">
              <Upload className="w-7 h-7 text-cyan-400" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-lg mb-1">Upload Exercise Video</Text>
              <Text className="text-slate-400 text-sm">
                Record a 10-second video of your squat, deadlift, or other compound lift
              </Text>
            </View>
            <ChevronRight className="w-6 h-6 text-cyan-400" />
          </View>
        </TouchableOpacity>

        {/* Video List */}
        <View className="mb-4">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-slate-200 font-semibold">Your Videos</Text>
            <Text className="text-slate-400 text-sm">{videos.length}</Text>
          </View>

          {videos.length === 0 ? (
            <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 items-center">
              <Video className="w-16 h-16 text-slate-700 mb-3" />
              <Text className="text-slate-400 text-center mb-2">No videos yet</Text>
              <Text className="text-slate-500 text-sm text-center">
                Upload your first video to get AI-powered form feedback
              </Text>
            </View>
          ) : (
            <FlatList
              data={videos}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => renderVideoCard(item)}
              scrollEnabled={false}
              initialNumToRender={5}
              maxToRenderPerBatch={10}
              windowSize={10}
            />
          )}
        </View>

        {/* Info Card */}
        <View className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <Text className="text-slate-200 font-semibold mb-3">How It Works</Text>
          <View className="space-y-3">
            {[
              { step: "1", text: "Record a 10-second video of your exercise" },
              { step: "2", text: "Upload and wait for AI analysis (30s - 2 min)" },
              { step: "3", text: "Receive detailed form feedback and corrections" },
              { step: "4", text: "Get drill recommendations to improve" },
            ].map((item, i) => (
              <View key={i} className="flex-row items-start gap-3">
                <View className="w-6 h-6 bg-cyan-500/20 rounded-full items-center justify-center flex-shrink-0">
                  <Text className="text-cyan-400 text-xs font-bold">{item.step}</Text>
                </View>
                <Text className="text-slate-300 text-sm flex-1">{item.text}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Exercise Type Picker Modal */}
      <Modal
        visible={showExercisePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowExercisePicker(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-end">
          <View className="bg-slate-900 rounded-t-2xl w-full p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-white text-lg font-semibold">Select Exercise</Text>
              <TouchableOpacity onPress={() => setShowExercisePicker(false)}>
                <X className="w-6 h-6 text-slate-400" />
              </TouchableOpacity>
            </View>

            <View className="space-y-2 mb-6">
              {exerciseTypes.map((exercise) => (
                <TouchableOpacity
                  key={exercise.value}
                  onPress={() => {
                    setSelectedExercise(exercise.value);
                    setShowExercisePicker(false);
                    handleStartRecording();
                  }}
                  className={`py-4 px-4 rounded-xl flex-row items-center justify-between ${
                    selectedExercise === exercise.value
                      ? "bg-cyan-500/20 border border-cyan-500/50"
                      : "bg-slate-800 border border-slate-700"
                  }`}
                >
                  <Text className="text-white font-medium capitalize">
                    {exercise.label}
                  </Text>
                  {selectedExercise === exercise.value && (
                    <ChevronRight className="w-5 h-5 text-cyan-400" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => setShowExercisePicker(false)}
              className="py-4 bg-slate-800 rounded-xl"
            >
              <Text className="text-slate-400 text-center font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
