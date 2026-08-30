"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Apple,
  Dumbbell,
  Activity,
  TrendingUp,
  Smartphone,
  Shield,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Badge } from "@/components/ui/badge";
import { features, type Feature } from "../../../packages/design-system/src";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";

const iconMap: Record<string, LucideIcon> = {
  Brain,
  Apple,
  Dumbbell,
  Activity,
  TrendingUp,
  Smartphone,
  Shield,
  UserCheck,
};

interface FeatureCardProps {
  feature: Feature;
  index: number;
}

function FeatureCard({ feature }: FeatureCardProps) {
  const Icon = iconMap[feature.icon] || Activity;

  return (
    <motion.div
      variants={createItemVariants()}
      className="group relative rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 transition-all duration-300 hover:border-[var(--color-border-hover)] hover:bg-[var(--color-elevated)] hover:shadow-[var(--shadow-lg)]"
    >
      {/* Icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-primary-foreground)] transition-colors duration-300">
          <Icon className="w-6 h-6" />
        </div>
        {feature.badge && (
          <Badge variant="primary" size="sm">
            {feature.badge}
          </Badge>
        )}
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">
        {feature.name}
      </h3>
      <p className="text-sm font-medium text-[var(--color-primary)] mb-3">
        {feature.tagline}
      </p>
      <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-4">
        {feature.description}
      </p>

      {/* Highlights */}
      <ul className="space-y-2">
        {feature.highlights.slice(0, 3).map((highlight: string, i: number) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-[var(--color-tertiary)]"
          >
            <svg
              className="w-4 h-4 text-[var(--color-success)] shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            {highlight}
          </li>
        ))}
      </ul>

      {/* Hover Glow */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
        <div className="absolute inset-0 rounded-xl border border-[var(--color-primary)]/20" />
      </div>
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-32 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-primary)]/5 to-transparent" />

      <Container className="relative z-10">
        <SectionHeader
          eyebrow="Features"
          title="Everything you need to transform your health"
          description="A complete platform for personalized wellness coaching, nutrition tracking, fitness planning, and progress analytics."
          badge="Complete MVP"
          badgeVariant="primary"
        />

        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature: Feature) => (
            <FeatureCard key={feature.id} feature={feature} index={0} />
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
