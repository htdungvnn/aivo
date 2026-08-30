"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  UserPlus,
  ClipboardList,
  Sparkles,
  CheckCircle,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { howItWorksSteps } from "../../../packages/design-system/src";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";

const iconMap: Record<string, LucideIcon> = {
  UserPlus,
  ClipboardList,
  Sparkles,
  CheckCircle,
  TrendingUp,
};

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 lg:py-32 bg-[var(--color-surface)]/30">
      <Container>
        <SectionHeader
          eyebrow="How It Works"
          title="Get started in minutes"
          description="AIVO adapts to your lifestyle and helps you build sustainable health habits with AI-powered guidance."
        />

        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="relative"
        >
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-24 left-[calc(10%+40px)] right-[calc(10%+40px)] h-px bg-gradient-to-r from-[var(--color-primary)]/20 via-[var(--color-primary)]/40 to-[var(--color-primary)]/20" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-4">
            {howItWorksSteps.map((step, index) => {
              const Icon = iconMap[step.icon] || Sparkles;
              const isLast = index === howItWorksSteps.length - 1;

              return (
                <motion.div
                  key={step.id}
                  variants={createItemVariants()}
                  className="relative"
                >
                  <div className="flex flex-col items-center text-center">
                    {/* Step Number & Icon */}
                    <div className="relative mb-6">
                      {/* Connector dot */}
                      {!isLast && (
                        <div className="hidden lg:block absolute top-1/2 -right-[calc(100%+16px)] w-[calc(100%+32px)] h-0.5 bg-gradient-to-r from-[var(--color-border)] to-[var(--color-border)]" />
                      )}
                      
                      <div className="relative z-10 flex items-center justify-center w-20 h-20 rounded-2xl border border-[var(--color-border)] bg-[var(--color-elevated)] shadow-[var(--shadow-lg)]">
                        <div className="absolute -top-2 -left-2 flex items-center justify-center w-6 h-6 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-xs font-bold">
                          {step.number}
                        </div>
                        <Icon className="w-8 h-8 text-[var(--color-primary)]" />
                      </div>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
                      {step.title}
                    </h3>
                    <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
