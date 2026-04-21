import { View, Text, TextInput, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { useState } from "react";
import { Send } from "lucide-react-native";

export default function AIChatScreen() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi! I'm your AI fitness coach. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");

  const sendMessage = () => {
    if (!input.trim()) {return;}

    setMessages([
      ...messages,
      { role: "user", content: input },
      { role: "assistant", content: "That's a great question! Based on your recent workouts, I'd recommend focusing on recovery with some light stretching. Would you like me to suggest specific exercises?" },
    ]);
    setInput("");
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Coach</Text>
      </View>

      <ScrollView style={styles.messagesContainer}>
        {messages.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageBubble,
              message.role === "user" ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text style={[
              styles.messageText,
              message.role === "user" ? styles.userText : styles.assistantText,
            ]}>
              {message.content}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask your AI coach..."
          placeholderTextColor="#6b7280"
          multiline
        />
        <TouchableOpacity
          style={[styles.sendButton, input.trim() && styles.sendButtonActive]}
          onPress={sendMessage}
          disabled={!input.trim()}
        >
          <Send size={20} color={input.trim() ? "#fff" : "#6b7280"} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#030712",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#374151",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageBubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 16,
    marginBottom: 12,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#3b82f6",
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1f2937",
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userText: {
    color: "#fff",
  },
  assistantText: {
    color: "#d1d5db",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#374151",
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: "#1f2937",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#374151",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButtonActive: {
    backgroundColor: "#3b82f6",
  },
});
