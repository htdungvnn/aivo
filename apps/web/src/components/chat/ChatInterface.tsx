"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createApiClient, type Conversation } from "@aivo/api-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Send,
  Bot,
  User,
  Loader2,
  ChevronDown,
  Zap,
  Clock,
  Coins,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  tokensUsed?: number;
  model?: string;
  provider?: string;
  cost?: number;
}

interface ChatInterfaceProps {
  apiClient: ReturnType<typeof createApiClient> | null;
  availableModels: any[];
  selectedModel: string | null;
  onModelChange: (modelId: string) => void;
  isLoadingModels: boolean;
}

export function ChatInterface({
  apiClient,
  availableModels,
  selectedModel,
  onModelChange,
  isLoadingModels,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showModelSelector, setShowModelSelector] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Show loading if API client not ready
  if (!apiClient) {
    return (
      <Card className="flex-1 bg-slate-900/50 border-slate-700/50 flex items-center justify-center">
        <CardContent className="text-center">
          <Loader2 className="w-10 h-10 text-cyan-400 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Initializing AI service...</p>
        </CardContent>
      </Card>
    );
  }

  // Load conversation history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const userId = await apiClient.userIdProvider?.();
        if (!userId) return;

        const response = await apiClient.getChatHistory(userId, 50);
        if (response.success && response.data) {
          const historyMessages: ChatMessage[] = response.data
            .map((conv: Conversation) => ({
              id: conv.id,
              role: "user" as const,
              content: conv.message,
              timestamp: new Date(conv.createdAt),
            }))
            .concat(
              response.data.map((conv: Conversation) => ({
                id: `${conv.id}-response`,
                role: "assistant" as const,
                content: conv.response,
                timestamp: new Date(conv.createdAt),
                tokensUsed: conv.tokensUsed,
                model: conv.model,
              }))
            );

          // Sort by timestamp
          historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          setMessages(historyMessages);
        }
      } catch (err) {
        console.error("Failed to load chat history:", err);
      }
    };

    loadHistory();
  }, [apiClient]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.sendChatMessage(userMessage.content);
      if (response.success && response.data) {
        const assistantMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: response.data.message,
          timestamp: new Date(),
          tokensUsed: response.data.tokensUsed,
          model: selectedModel || undefined,
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(response.error || "Failed to get response");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getModelDisplayName = (modelId: string) => {
    const model = availableModels.find(m => m.id === modelId);
    return model ? `${model.name} (${model.provider})` : modelId;
  };

  const selectedModelData = availableModels.find(m => m.id === selectedModel);

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]">
      {/* Header with Model Selector */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Bot className="w-6 h-6 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">AI Coach</h2>
        </div>
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="gap-2 border-slate-700 bg-slate-800/50"
          >
            {isLoadingModels ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="hidden sm:inline">
                  {selectedModelData ? selectedModelData.name : "Auto (Recommended)"}
                </span>
                <ChevronDown className="w-4 h-4" />
              </>
            )}
          </Button>
          <AnimatePresence>
            {showModelSelector && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-10 overflow-hidden"
              >
                <div className="p-2">
                  <p className="text-xs text-gray-400 px-2 py-1">Select AI Model</p>
                  {availableModels.map(model => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id);
                        setShowModelSelector(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedModel === model.id
                          ? "bg-cyan-500/20 text-cyan-300"
                          : "hover:bg-slate-800 text-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{model.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {model.provider}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                        <span>${model.pricing.inputPer1M.toFixed(3)}/1M in</span>
                        <span>${model.pricing.outputPer1M.toFixed(3)}/1M out</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          Quality: {model.qualityScore}/10
                        </Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages Area */}
      <Card className="flex-1 bg-slate-900/50 border-slate-700/50 overflow-hidden flex flex-col">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Bot className="w-16 h-16 text-cyan-500/50 mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">Start a Conversation</h3>
              <p className="text-gray-400 max-w-md">
                Ask me anything about fitness, nutrition, workout planning, or your health goals.
                I'm here to help you optimize your fitness journey.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 justify-center">
                {[
                  "Create a workout plan for muscle gain",
                  "How many calories should I eat?",
                  "Tips for better recovery",
                  "Analyze my recent progress",
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => {
                      setInputValue(suggestion);
                      inputRef.current?.focus();
                    }}
                    className="px-3 py-1.5 text-sm bg-slate-800/50 border border-slate-700 rounded-full text-gray-300 hover:border-cyan-500/50 hover:text-cyan-300 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white"
                      : "bg-slate-800/50 border border-slate-700/50 text-gray-200"
                  }`}
                >
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                  {message.tokensUsed && (
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {message.tokensUsed} tokens
                      </span>
                      {message.model && (
                        <span className="flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          {message.model.split(":")[1] || message.model}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1 text-right">
                    {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                {message.role === "user" && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="text-gray-400 text-sm">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input Area */}
        <div className="p-4 border-t border-slate-700/50 bg-slate-800/30">
          {error && (
            <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 bg-slate-800/50 border-slate-700 focus:border-cyan-500 focus:ring-cyan-500/20"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </Card>
    </div>
  );
}
