"use client";

/**
 * AI Coach Page - Chat interface with AI health coach
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { AppShell } from "@/components/shell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { LoadingState } from "@/components/shared/state-components";
import { cn } from "@/lib/utils";
import {
  Send,
  Sparkles,
  RefreshCw,
  Trash2,
  ChevronDown,
  MessageSquare,
  TrendingUp,
  Heart,
  Utensils,
  Dumbbell,
  Moon,
  Droplets,
  ExternalLink,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

// =============================================================================
// Types
// =============================================================================

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  contextUsed?: string[];
  suggestedActions?: SuggestedAction[];
  requiresConfirmation?: boolean;
  pendingMutation?: {
    type: string;
    description: string;
    changes: Record<string, unknown>;
  };
}

interface SuggestedAction {
  id: string;
  label: string;
  type: "navigate" | "action" | "mutate";
  payload: Record<string, unknown>;
}

interface Conversation {
  id: string;
  title: string;
  updatedAt: number;
  messageCount: number;
}

// =============================================================================
// Sample Data
// =============================================================================

const SUGGESTED_PROMPTS = [
  {
    id: "1",
    text: "What should I focus on today?",
    icon: TrendingUp,
  },
  {
    id: "2",
    text: "Why is my readiness lower?",
    icon: Heart,
  },
  {
    id: "3",
    text: "What should I eat to reach my protein goal?",
    icon: Utensils,
  },
  {
    id: "4",
    text: "Should today's workout change?",
    icon: Dumbbell,
  },
  {
    id: "5",
    text: "Summarize my week",
    icon: Moon,
  },
  {
    id: "6",
    text: "Help me plan tomorrow",
    icon: Droplets,
  },
];

const SAMPLE_MESSAGES: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Good morning! I'm your AI Coach. Based on your recent data, I see you've had some great workouts this week. Your readiness is at 78 today, which is good. Is there anything specific you'd like to discuss about your health or fitness goals?",
    timestamp: Date.now() - 3600000,
    contextUsed: ["readiness", "workouts"],
  },
  {
    id: "2",
    role: "user",
    content: "My protein intake has been low lately. What should I eat to reach my goal?",
    timestamp: Date.now() - 3500000,
  },
  {
    id: "3",
    role: "assistant",
    content: "Based on your nutrition log, you're currently at 95g of protein, and your target is 150g. You have about 55g remaining for the day. Here are some high-protein options that fit your preferences:\n\n**Quick protein boost:**\n- Greek yogurt with berries (20g protein)\n- Hard-boiled eggs (6g each)\n- Cottage cheese (25g per cup)\n\n**Meal ideas:**\n- Grilled chicken breast (35g per 150g)\n- Salmon fillet (25g per 100g)\n- Tofu stir-fry with edamame (20g per serving)\n\nWould you like me to suggest a specific meal plan for today, or help you find recipes?",
    timestamp: Date.now() - 3400000,
    contextUsed: ["nutrition", "protein"],
    suggestedActions: [
      { id: "1", label: "Show me meal ideas", type: "action", payload: {} },
      { id: "2", label: "Log a meal now", type: "navigate", payload: { href: "/health/nutrition" } },
    ],
  },
];

// =============================================================================
// Components
// =============================================================================

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: "up" | "down" | "stable";
  color: string;
}

function MetricCard({ label, value, unit, trend, color }: MetricCardProps) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg bg-[var(--color-muted)]">
      <div className="flex flex-col">
        <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
        <div className="flex items-baseline gap-1">
          <span className={cn("text-sm font-semibold", color)}>{value}</span>
          {unit && <span className="text-xs text-[var(--color-tertiary)]">{unit}</span>}
        </div>
      </div>
      {trend && (
        <div className={cn(
          "ml-auto",
          trend === "up" && "text-[var(--color-success)]",
          trend === "down" && "text-[var(--color-error)]",
          trend === "stable" && "text-[var(--color-muted-foreground)]"
        )}>
          {trend === "up" && <TrendingUp className="h-4 w-4" />}
          {trend === "down" && <TrendingUp className="h-4 w-4 rotate-180" />}
          {trend === "stable" && <span className="text-xs">—</span>}
        </div>
      )}
    </div>
  );
}

interface MessageBubbleProps {
  message: Message;
  onAction?: (action: SuggestedAction) => void;
  onConfirmMutation?: (messageId: string) => void;
  onCancelMutation?: (messageId: string) => void;
}

function MessageBubble({
  message,
  onAction,
  onConfirmMutation,
  onCancelMutation,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      <Avatar
        fallback={isUser ? "You" : "AI"}
        className={cn(
          "shrink-0",
          isUser ? "bg-[var(--color-primary)]" : "bg-[var(--color-ai)]"
        )}
      />

      {/* Message Content */}
      <div className={cn("flex-1 max-w-[85%] space-y-2", isUser && "items-end")}>
        {/* Time */}
        <span className="text-xs text-[var(--color-tertiary)]">
          {formatTime(message.timestamp)}
        </span>

        {/* Bubble */}
        <div
          className={cn(
            "p-4 rounded-2xl",
            isUser
              ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] rounded-tr-md"
              : "bg-[var(--color-surface)] border border-[var(--color-border)] rounded-tl-md"
          )}
        >
          {/* AI Indicator */}
          {!isUser && (
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-[var(--color-ai)]" />
              <span className="text-xs font-medium text-[var(--color-ai)]">
                AI Coach
              </span>
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm prose-invert max-w-none">
            <p className="whitespace-pre-wrap text-sm leading-relaxed">
              {message.content}
            </p>
          </div>

          {/* Context Used */}
          {message.contextUsed && message.contextUsed.length > 0 && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
              <span className="text-xs text-[var(--color-tertiary)]">Using data from:</span>
              <div className="flex flex-wrap gap-1">
                {message.contextUsed.map((context) => (
                  <Badge key={context} variant="subtle" size="sm">
                    {context}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Suggested Actions */}
        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {message.suggestedActions.map((action) => (
              <Button
                key={action.id}
                variant="secondary"
                size="sm"
                onClick={() => onAction?.(action)}
                className="text-xs"
              >
                {action.type === "navigate" && <ExternalLink className="h-3 w-3 mr-1" />}
                {action.label}
              </Button>
            ))}
          </div>
        )}

        {/* Pending Mutation Confirmation */}
        {message.pendingMutation && message.requiresConfirmation && (
          <div className="p-4 rounded-xl border border-[var(--color-warning)]/30 bg-[var(--color-warning-muted)]">
            <div className="flex items-start gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-[var(--color-warning)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[var(--color-foreground)]">
                  Confirmation Required
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)] mt-1">
                  {message.pendingMutation.description}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <Button
                size="sm"
                onClick={() => onConfirmMutation?.(message.id)}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Confirm Change
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onCancelMutation?.(message.id)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface SuggestedPromptProps {
  prompt: typeof SUGGESTED_PROMPTS[0];
  onClick: () => void;
}

function SuggestedPrompt({ prompt, onClick }: SuggestedPromptProps) {
  const Icon = prompt.icon;
  
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-foreground)] transition-colors"
    >
      <Icon className="h-4 w-4" />
      <span>{prompt.text}</span>
    </button>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export default function CoachPage() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [messages, setMessages] = useState<Message[]>(SAMPLE_MESSAGES);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: content.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: "I'm processing your request. Let me analyze your data and provide a personalized response...",
        timestamp: Date.now(),
        contextUsed: ["readiness", "nutrition", "workouts"],
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 2000);
  }, []);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    handleSendMessage(prompt);
  }, [handleSendMessage]);

  const handleAction = useCallback((action: SuggestedAction) => {
    if (action.type === "navigate" && action.payload.href) {
      window.location.href = action.payload.href as string;
    }
    // Handle other action types as needed
  }, []);

  const handleConfirmMutation = useCallback((messageId: string) => {
    // Handle mutation confirmation
    console.log("Confirming mutation for message:", messageId);
  }, []);

  const handleCancelMutation = useCallback((messageId: string) => {
    // Handle mutation cancellation
    console.log("Cancelling mutation for message:", messageId);
  }, []);

  const handleClearChat = useCallback(() => {
    setMessages([]);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-background)]">
        <LoadingState message="Loading AI Coach..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return null;
  }

  return (
    <AppShell
      user={
        user
          ? {
              name: user.displayName || user.email,
              email: user.email,
              avatar: user.avatarUrl || undefined,
            }
          : undefined
      }
    >
      <div className="flex flex-col h-[calc(100vh-8rem)] max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--color-ai-muted)]">
              <Sparkles className="h-5 w-5 text-[var(--color-ai)]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--color-foreground)]">
                AI Coach
              </h1>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Your personal wellness assistant
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClearChat}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear chat
          </Button>
        </div>

        {/* Context Metrics */}
        <div className="flex gap-2 py-4 overflow-x-auto scrollbar-thin">
          <MetricCard label="Readiness" value="78" color="text-readiness" trend="up" />
          <MetricCard label="Calories" value="1450/2200" unit="kcal" color="text-nutrition" trend="down" />
          <MetricCard label="Protein" value="95/150" unit="g" color="text-nutrition" trend="stable" />
          <MetricCard label="Sleep" value="7.5h" color="text-sleep" trend="up" />
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto space-y-6 pb-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="p-4 rounded-full bg-[var(--color-ai-muted)] mb-4">
                <MessageSquare className="h-8 w-8 text-[var(--color-ai)]" />
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
                Welcome to AI Coach
              </h2>
              <p className="text-sm text-[var(--color-muted-foreground)] max-w-md mb-6">
                Ask me anything about your health, nutrition, workouts, or get
                personalized recommendations based on your data.
              </p>

              {/* Suggested Prompts */}
              <div className="flex flex-wrap justify-center gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <SuggestedPrompt
                    key={prompt.id}
                    prompt={prompt}
                    onClick={() => handleSuggestedPrompt(prompt.text)}
                  />
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  message={message}
                  onAction={handleAction}
                  onConfirmMutation={handleConfirmMutation}
                  onCancelMutation={handleCancelMutation}
                />
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <div className="flex gap-3">
                  <Avatar fallback="AI" className="shrink-0 bg-[var(--color-ai)]" />
                  <div className="p-4 rounded-2xl rounded-tl-md bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-[var(--color-muted-foreground)] animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="h-2 w-2 rounded-full bg-[var(--color-muted-foreground)] animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="h-2 w-2 rounded-full bg-[var(--color-muted-foreground)] animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <span className="text-sm text-[var(--color-muted-foreground)]">
                        Thinking...
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="pt-4 border-t border-[var(--color-border)]">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything about your health..."
              className="w-full p-4 pr-12 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-foreground)] placeholder:text-[var(--color-tertiary)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 focus:border-[var(--color-primary)]"
              rows={2}
            />
            <Button
              onClick={() => handleSendMessage(inputValue)}
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-2 bottom-2"
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-[var(--color-tertiary)] mt-2 text-center">
            AI Coach provides general wellness guidance. Always consult healthcare professionals for medical advice.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
