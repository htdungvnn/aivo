import React, { useState, useCallback, useRef, useEffect } from "react";
import { View, Text, TextInput, ScrollView, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from "react-native";
import { Send, Loader2 } from "lucide-react-native";
import { useMetrics } from "@/contexts/MetricsContext";
import { createApiClient } from "@aivo/api-client";
import { ApiErrorHandler, retryWithBackoff } from "@/utils/error-handler";
import * as SecureStore from "expo-secure-store";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8787";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const MessageBubble = React.memo(function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <View className={`max-w-[85%] p-3 rounded-2xl mb-3 ${isUser ? "self-end bg-blue-600 rounded-br-sm" : "self-start bg-slate-800 rounded-bl-sm"}`}>
      <Text className={`text-sm leading-5 ${isUser ? "text-white" : "text-slate-300"}`}>{message.content}</Text>
      <Text className={`text-[10px] mt-1 text-right ${isUser ? "text-blue-200" : "text-slate-500"}`}>
        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </Text>
    </View>
  );
});

const scrollViewContentStyle = { paddingBottom: 24 };

export default function AIChatScreen() {
  const { metrics } = useMetrics();
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "assistant", content: "Hi! I'm your AI fitness coach. How can I help you today?", timestamp: new Date() },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = () => {
    void sendMessage().catch(() => {
      // Error handled in sendMessage
    });
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) {return;}

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const api = createApiClient({
        baseUrl: API_URL,
        tokenProvider: async () => (await SecureStore.getItemAsync("aivo_token")) || "",
      });

      const context = metrics.length > 0 ? [`Latest weight: ${metrics[0].weight}kg`, `BMI: ${metrics[0].bmi}`] : undefined;

      const response = await retryWithBackoff(() => api.sendChatMessage(userMessage.content, context));

      if (!response.data) {
        throw new Error("No response from AI");
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error: unknown) {
      const message = ApiErrorHandler.handle(error, "Failed to get response");
      Alert.alert("Error", message);
    } finally {
      setLoading(false);
    }
  }, [input, loading, metrics]);

  return (
    <KeyboardAvoidingView className="flex-1 bg-slate-950" behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}>
      <View className="flex-row items-center justify-between px-5 pt-14 pb-4 border-b border-slate-800">
        <Text className="text-xl font-bold text-white">AI Coach</Text>
        {loading && <ActivityIndicator size="small" color="#3b82f6" />}
      </View>

      <ScrollView ref={scrollViewRef} className="flex-1 p-4" contentContainerStyle={scrollViewContentStyle} showsVerticalScrollIndicator={false}>
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </ScrollView>

      <View className="flex-row items-end gap-3 p-4 border-t border-slate-800">
        <TextInput
          className="flex-1 bg-slate-900 rounded-2xl px-4 py-3 text-slate-100 text-sm border border-slate-800 max-h-[100]"
          value={input}
          onChangeText={setInput}
          placeholder="Ask your AI coach..."
          placeholderTextColor="#6b7280"
          multiline
          maxLength={1000}
          editable={!loading}
          returnKeyType="send"
          onSubmitEditing={handleSend}
        />
        <TouchableOpacity
          className={`w-11 h-11 rounded-full items-center justify-center ${input.trim() && !loading ? "bg-blue-600" : "bg-slate-800"}`}
          onPress={handleSend}
          disabled={!input.trim() || loading}
        >
          {loading ? <Loader2 size={20} color="#fff" className="animate-spin" /> : <Send size={20} color={input.trim() ? "#fff" : "#6b7280"} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
