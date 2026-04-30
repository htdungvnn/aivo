"use client";

import React, { memo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import type { ReactElement } from "react";

// No additional imports needed - icons are passed as React elements

interface TechStackCardProps {
  name: string;
  description: string;
  icon: ReactElement;
  badge1: { label: string; className: string };
  badge2: { label: string; className: string };
}

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

/**
 * TechStackCard - Display card for technology stack items
 */
const TechStackCard = memo(function TechStackCard({
  name,
  description,
  icon,
  badge1,
  badge2,
}: TechStackCardProps) {
  return (
    <motion.div variants={fadeInUp}>
      <Card className="group relative bg-slate-900/60 border-slate-700/30 hover:border-emerald-500/50 transition-all h-full">
        <CardContent className="pt-6">
          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
            {icon}
          </div>
          <h4 className="font-bold text-white mb-2">{name}</h4>
          <p className="text-sm text-gray-400">{description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary" className={badge1.className}>
              {badge1.label}
            </Badge>
            <Badge variant="secondary" className={badge2.className}>
              {badge2.label}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

TechStackCard.displayName = "TechStackCard";

export default TechStackCard;
