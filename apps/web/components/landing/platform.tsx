"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Monitor,
  Smartphone,
  RefreshCw,
  Wifi,
  Fingerprint,
  BarChart3,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";

const platforms = [
  {
    icon: Smartphone,
    name: "iOS & Android",
    description: "Native mobile apps for iPhone and Android with intuitive touch interfaces",
    features: [
      "Quick daily tracking on the go",
      "Haptic feedback and gestures",
      "Offline mode for tracking",
      "Apple Health & Google Fit sync",
      "Widgets for at-a-glance stats",
    ],
    color: "#22C55E",
    image: "https://picsum.photos/seed/aivo-mobile/600/800",
  },
  {
    icon: Monitor,
    name: "Web Dashboard",
    description: "Full-featured web app for detailed analytics and meal logging",
    features: [
      "Large-screen optimized layouts",
      "Detailed progress charts",
      "Bulk meal logging",
      "Weekly and monthly reports",
      "Keyboard navigation support",
    ],
    color: "#A3E635",
    image: "https://picsum.photos/seed/aivo-web/800/600",
  },
];

const syncFeatures = [
  {
    icon: RefreshCw,
    title: "Real-time Sync",
    description: "Changes sync instantly across all your devices",
  },
  {
    icon: Wifi,
    title: "Offline Support",
    description: "Track without internet, sync when connected",
  },
  {
    icon: Fingerprint,
    title: "Biometric Security",
    description: "Face ID, Touch ID, or fingerprint unlock",
  },
  {
    icon: BarChart3,
    title: "Cross-device Analytics",
    description: "View your complete history on any device",
  },
];

interface PlatformData {
  icon: LucideIcon;
  name: string;
  description: string;
  features: string[];
  color: string;
  image: string;
}

function PlatformCard({
  icon: Icon,
  name,
  description,
  features: platformFeatures,
  color,
  image,
  isReversed,
}: PlatformData & { isReversed?: boolean }) {
  return (
    <Card variant="elevated" className="overflow-hidden">
      <div className={`grid lg:grid-cols-2 ${isReversed ? "lg:flex-row-reverse" : ""}`}>
        {/* Image */}
        <div className="relative h-64 lg:h-auto lg:w-1/2">
          <Image
            src={image}
            alt={`${name} preview`}
            fill
            className="object-cover"
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${color}20, transparent)`,
            }}
          />
        </div>

        {/* Content */}
        <div className="p-8 lg:w-1/2">
          <div
            className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-6"
            style={{ backgroundColor: `${color}20`, color }}
          >
            <Icon className="w-6 h-6" />
          </div>

          <Badge variant="outline" className="mb-4">
            {name}
          </Badge>

          <h3 className="text-2xl font-bold text-[var(--color-foreground)] mb-3">
            {description}
          </h3>

          <ul className="space-y-3">
            {platformFeatures.map((feature, i) => (
              <li
                key={i}
                className="flex items-start gap-3 text-sm text-[var(--color-muted-foreground)]"
              >
                <svg
                  className="w-5 h-5 text-[var(--color-success)] shrink-0 mt-0.5"
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
                {feature}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

export function Platform() {
  return (
    <section id="platform" className="py-24 lg:py-32 bg-[var(--color-surface)]/30">
      <Container>
        <SectionHeader
          eyebrow="Platform"
          title="Your health, anywhere you go"
          description="Track on mobile, analyze on web. A seamless experience across all your devices with real-time synchronization."
        />

        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="space-y-12"
        >
          {/* Platform Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {platforms.map((platform, index) => (
              <motion.div key={platform.name} variants={createItemVariants()}>
                <PlatformCard {...platform} isReversed={index % 2 === 1} />
              </motion.div>
            ))}
          </div>

          {/* Sync Features */}
          <motion.div variants={createItemVariants()}>
            <div className="text-center mb-8">
              <h3 className="text-xl font-semibold text-[var(--color-foreground)] mb-2">
                Synchronized Experience
              </h3>
              <p className="text-[var(--color-muted-foreground)]">
                Your data follows you, no matter which device you use
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {syncFeatures.map((feature) => (
                <Card key={feature.title} className="p-5 text-center">
                  <feature.icon className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-3" />
                  <h4 className="font-medium text-[var(--color-foreground)] mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {feature.description}
                  </p>
                </Card>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </Container>
    </section>
  );
}
