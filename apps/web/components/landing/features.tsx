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
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";
import { useTranslations } from "next-intl";

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

interface FeatureData {
  id: string;
  icon: string;
  badge?: string;
}

interface FeatureCardProps {
  feature: FeatureData;
  index: number;
}

function FeatureCard({ feature }: FeatureCardProps) {
  const t = useTranslations(`features.${feature.id}`);
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
        {t("title")}
      </h3>
      <p className="text-sm font-medium text-[var(--color-primary)] mb-3">
        {String(t.rich("description", {
          strong: (children) => <strong>{children}</strong>,
        })).slice(0, 50)}...
      </p>
      <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed mb-4">
        {t("description")}
      </p>
    </motion.div>
  );
}

export function Features() {
  const t = useTranslations("features");

  const features: FeatureData[] = [
    { id: "aiCoaching", icon: "Brain", badge: "Popular" },
    { id: "nutritionTracking", icon: "Apple" },
    { id: "smartWorkouts", icon: "Dumbbell" },
    { id: "sleepOptimization", icon: "Activity" },
    { id: "readinessScore", icon: "TrendingUp" },
    { id: "weeklyReports", icon: "TrendingUp" },
    { id: "crossPlatform", icon: "Smartphone" },
    { id: "privacy", icon: "Shield", badge: "Important" },
  ];

  return (
    <section id="features" className="py-24 lg:py-32 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-primary)]/5 to-transparent" />

      <Container className="relative z-10">
        <SectionHeader
          eyebrow="Features"
          title={t("title")}
          description={t("subtitle")}
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
          {features.map((feature: FeatureData) => (
            <FeatureCard key={feature.id} feature={feature} index={0} />
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
