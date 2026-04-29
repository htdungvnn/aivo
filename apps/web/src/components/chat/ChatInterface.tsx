"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Conversation } from "@aivo/api-client";
import type { createApiClient } from "@aivo/api-client";
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

interface ModelInfo {
  id: string;
  name: string;
  provider: string;
}

interface ChatInterfaceProps {
  apiClient: ReturnType<typeof createApiClient> | null;
  availableModels: ModelInfo[];
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

  // Load conversation history when apiClient becomes available
  useEffect(() => {
    if (!apiClient) {
      return;
    }

    const loadHistory = async () => {
      try {
        const userId = await apiClient.getUserId();
        if (!userId) {
          return;
        }

        const response = await apiClient.getChatHistory(userId, 50);
        if (response.success && response.data) {
          const historyMessages: ChatMessage[] = [
            ...response.data.map((conv: Conversation) => ({
              id: conv.id,
              role: "user" as const,
              content: conv.message,
              timestamp: new Date(conv.createdAt),
            })),
            ...response.data.map((conv: Conversation) => ({
              id: `${conv.id}-response`,
              role: "assistant" as const,
              content: conv.response,
              timestamp: new Date(conv.createdAt),
              tokensUsed: conv.tokensUsed,
              model: conv.model,
            })),
          ];

          // Sort by timestamp
          historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
          setMessages(historyMessages);
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error("Failed to load chat history:", err);
      }
    };

    loadHistory();
  }, [apiClient]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) {
      return;
    }

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
      const response = await apiClient!.sendChatMessage(userMessage.content);
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
                  <p className="text-xs text-slate-400 px-2 py-1">Select AI Model</p>
                  {availableModels.map(model => (
                    <button
                      key={model.id}
                      onClick={() => {
                        onModelChange(model.id);
                        setShowModelSelector(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded text-sm ${
                        selectedModel === model.id
                          ? "bg-cyan-500/20 text-cyan-400"
                          : "text-slate-300 hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-slate-500">{model.provider}</div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Messages Area */}
      <Card className="flex-1 bg-slate-900/50 border-slate-700/50 mb-4 overflow-hidden">
        <CardContent className="p-4 h-full overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <Bot className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                <p>Start a conversation with your AI coach</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === "user"
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-800 text-slate-100"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {message.role === "assistant" ? (
                        <Bot className="w-4 h-4" />
                      ) : (
                        <User className="w-4 h-4" />
                      )}
                      <span className="text-xs opacity-70">
                        {message.role === "assistant" ? "AI Coach" : "You"}
                      </span>
                      {message.model && (
                        <Badge variant="secondary" className="text-xs ml-2">
                          {message.model}
                        </Badge>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.tokensUsed && (
                      <div className="mt-2 text-xs opacity-50 flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Coins className="w-3 h-3" />
                          {message.tokensUsed} tokens
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Input Area */}
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1 bg-slate-900 border-slate-700 text-white"
          disabled={isLoading}
        />
        <Button
          onClick={handleSendMessage}
          disabled={isLoading || !inputValue.trim()}
          className="bg-cyan-500 hover:bg-cyan-600"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
