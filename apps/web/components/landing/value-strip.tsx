"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Target, Shield, Smartphone, TrendingUp } from "lucide-react";
import { Container } from "@/components/ui/container";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";

const valueProps = [
  {
    icon: Target,
    title: "Personalized",
    description: "Tailored to your unique goals and preferences",
  },
  {
    icon: Shield,
    title: "Privacy-First",
    description: "Your health data stays private and secure",
  },
  {
    icon: Smartphone,
    title: "Web & Mobile",
    description: "Access your health anywhere, anytime",
  },
  {
    icon: TrendingUp,
    title: "Actionable Guidance",
    description: "Daily plans you can actually follow",
  },
];

export function ValueStrip() {
  return (
    <section className="py-16 border-y border-[var(--color-border)] bg-[var(--color-surface)]/50">
      <Container>
        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12"
        >
          {valueProps.map((item) => (
            <motion.div
              key={item.title}
              variants={createItemVariants()}
              className="flex flex-col items-center text-center"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] mb-4">
                <item.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                {item.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </Container>
    </section>
  );
}
