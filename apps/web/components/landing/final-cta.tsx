"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Shield, Heart } from "lucide-react";
import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { authNav } from "@aivo/marketing-config";

export function FinalCTA() {
  return (
    <section className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/10 via-[var(--color-primary)]/5 to-transparent" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[var(--color-primary)]/10 rounded-full blur-3xl" />
      </div>

      <Container className="relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="max-w-3xl mx-auto text-center"
        >
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--color-elevated)] border border-[var(--color-border)] mb-8">
            <Sparkles className="w-4 h-4 text-[var(--color-primary)]" />
            <span className="text-sm font-medium text-[var(--color-foreground)]">
              Start your wellness journey today
            </span>
          </div>

          {/* Headline */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--color-foreground)] mb-6 tracking-tight">
            Your health transformation{" "}
            <span className="text-gradient">starts now</span>
          </h2>

          {/* Subheadline */}
          <p className="text-lg sm:text-xl text-[var(--color-muted-foreground)] max-w-2xl mx-auto mb-10 leading-relaxed">
            Join thousands of people who have discovered a better way to manage their health. 
            It takes less than 5 minutes to get started.
          </p>

          {/* CTA */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link href={authNav.signUp.href}>
              <Button size="xl" className="gap-2 group">
                Get Started Free
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button variant="outline" size="xl">
                View Pricing
              </Button>
            </Link>
          </div>

          {/* Trust Signals */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-tertiary)]">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--color-success)]" />
              <span>Free plan available</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
              <span>No credit card required</span>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
