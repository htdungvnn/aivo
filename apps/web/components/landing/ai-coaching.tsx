"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Brain, Shield, Sparkles, MessageCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { sampleAIConversations, type SampleAIConversation } from "@aivo/marketing-config";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";

const categoryColors: Record<string, string> = {
  nutrition: "bg-[var(--color-success)]/10 text-[var(--color-success)] border-[var(--color-success)]/20",
  fitness: "bg-[var(--color-accent)]/10 text-[var(--color-accent)] border-[var(--color-accent)]/20",
  wellness: "bg-[var(--color-info)]/10 text-[var(--color-info)] border-[var(--color-info)]/20",
  motivation: "bg-[var(--color-warning)]/10 text-[var(--color-warning)] border-[var(--color-warning)]/20",
};

function ConversationCard({ prompt, response, category }: SampleAIConversation) {
  return (
    <Card className="p-6 hover:border-[var(--color-border-hover)] transition-colors">
      {/* Category Badge */}
      <Badge
        variant="outline"
        className={`mb-4 capitalize ${categoryColors[category] || categoryColors.wellness}`}
      >
        {category}
      </Badge>

      {/* User Prompt */}
      <div className="mb-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-foreground)] mb-1">
              You asked
            </p>
            <p className="text-sm text-[var(--color-muted-foreground)] italic">
              &ldquo;{prompt}&rdquo;
            </p>
          </div>
        </div>
      </div>

      {/* AI Response */}
      <div className="relative pl-11">
        <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-[var(--color-primary)] flex items-center justify-center">
          <Brain className="w-4 h-4 text-[var(--color-primary-foreground)]" />
        </div>
        <div className="p-4 rounded-xl bg-[var(--color-elevated)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-[var(--color-primary)]">
              AIVO Coach
            </p>
            <Badge variant="primary" size="sm">
              AI
            </Badge>
          </div>
          <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
            {response}
          </p>
        </div>
      </div>
    </Card>
  );
}

export function AICoaching() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-[var(--color-accent)]/5 rounded-full blur-3xl" />
      </div>

      <Container className="relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div>
            <SectionHeader
              eyebrow="AI Coaching"
              title="Your personal wellness guide, available 24/7"
              description="Ask questions, get motivation, and receive personalized wellness advice from AIVO's AI coach. It's like having a knowledgeable friend who understands your health goals."
              badge="Safe & Evidence-Based"
              badgeVariant="primary"
              className="text-left mb-0"
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 space-y-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-[var(--color-foreground)] mb-1">
                    Wellness Guidance, Not Medical Advice
                  </h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    AIVO provides general wellness tips and motivation. Always consult a healthcare professional for medical concerns.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-accent)]/10 text-[var(--color-accent)] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-[var(--color-foreground)] mb-1">
                    Learns Your Preferences
                  </h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    The more you interact, the better AIVO understands your goals, preferences, and what motivates you.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-info)]/10 text-[var(--color-info)] shrink-0">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-medium text-[var(--color-foreground)] mb-1">
                    Natural Conversations
                  </h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Chat naturally about nutrition, fitness, sleep, habits, or anything wellness-related.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Sample Conversations */}
          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                Sample Conversations
              </h3>
              <Badge variant="outline" size="sm">
                Demo Data
              </Badge>
            </div>

            {sampleAIConversations.map((conversation: SampleAIConversation) => (
              <ConversationCard key={conversation.prompt} {...conversation} />
            ))}

            <p className="text-xs text-[var(--color-tertiary)] text-center">
              Responses are AI-generated wellness guidance, not professional medical advice.
            </p>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
