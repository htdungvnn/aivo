"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  Star,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Quote,
  Shield,
  Brain,
  Calendar,
  BarChart3,
  Bot,
} from "lucide-react";
import type { FeatureCardConfig } from "@/data/feature-cards";

interface FeatureCardProps {
  config: FeatureCardConfig;
  isExpanded: boolean;
  onToggle: (id: string) => void;
}

// Icon mapping
const iconMap = {
  Shield,
  Brain,
  Calendar,
  BarChart3,
  Bot,
};

// Animation variants (shared with page.tsx)
export const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

/**
 * FeatureCard - Reusable component for displaying feature information
 * Optimized with memoization and proper rendering patterns
 */
const FeatureCard = memo(function FeatureCard({
  config,
  isExpanded,
  onToggle,
}: FeatureCardProps) {
  const {
    id,
    title,
    description,
    gradient,
    borderGradient,
    icon,
    badgeColor,
    badgeBgColor,
    badgeBorderColor,
    details
  } = config;

  // Get the icon component
  const IconComponent = iconMap[icon as keyof typeof iconMap] || Shield;

  // Determine hover gradient color based on the gradient prop
  const getHoverGradient = (): string => {
    if (gradient.includes('emerald')) {
      return "from-emerald-500/5 to-transparent";
    }
    if (gradient.includes('cyan')) {
      return "from-cyan-500/5 to-transparent";
    }
    if (gradient.includes('purple')) {
      return "from-purple-500/5 to-transparent";
    }
    if (gradient.includes('blue')) {
      return "from-blue-500/5 to-transparent";
    }
    if (gradient.includes('orange')) {
      return "from-orange-500/5 to-transparent";
    }
    return "from-cyan-500/5 to-transparent";
  };

  return (
    <motion.div variants={fadeInUp}>
      <Card
        className={cn(
          "group relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50",
          borderGradient,
          "transition-all overflow-hidden h-full cursor-pointer"
        )}
        onClick={() => onToggle(id)}
      >
        <CardContent className="pt-6">
          <div className={cn("absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity", getHoverGradient())} />
          <div className="relative">
            <div className={cn("w-14 h-14 rounded-xl bg-gradient-to-br flex items-center justify-center mb-6 group-hover:scale-110 transition-transform", gradient)}>
              <IconComponent className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
            <p className="text-gray-400 leading-relaxed mb-4">{description}</p>
            <div className={cn("flex items-center gap-2 text-sm font-medium group-hover:gap-3 transition-all", badgeColor)}>
              <span>{isExpanded ? 'Show less' : 'Learn more'}</span>
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </div>

            {/* Expandable Content */}
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="mt-6 pt-6 border-t border-cyan-500/20 overflow-hidden"
              >
                <div className="space-y-6">
                  {/* Key Benefits */}
                  <div>
                    <h4 className={cn("font-semibold mb-3 flex items-center gap-2", badgeColor)}>
                      <Star className="w-4 h-4" />
                      Key Benefits
                    </h4>
                    <ul className="space-y-2">
                      {details.benefits.map((benefit, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                          <CheckCircle2 className={cn("w-4 h-4 mt-0.5 flex-shrink-0", badgeColor)} />
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Specs Grid */}
                  <div className="grid grid-cols-2 gap-4">
                    {details.specs.map((spec, idx) => (
                      <div key={idx} className={cn("rounded-lg p-3", badgeBgColor)}>
                        <div className={cn("text-xs uppercase tracking-wider", badgeColor, "/70")}>
                          {spec.label}
                        </div>
                        <div className="text-white font-semibold mt-1">{spec.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Use Cases */}
                  <div>
                    <h4 className={cn("font-semibold mb-3 flex items-center gap-2", badgeColor)}>
                      <Quote className="w-4 h-4" />
                      Ideal For
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {details.useCases.map((useCase, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className={cn("text-sm", badgeBgColor, badgeBorderColor, badgeColor, "300")}
                        >
                          {useCase}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

FeatureCard.displayName = "FeatureCard";

export default FeatureCard;
