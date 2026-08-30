"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Smartphone, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { authNav } from "../../../packages/design-system/src";
import { fadeInUpVariants, staggerContainerVariants, createItemVariants } from "@/lib/animations";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center pt-20 pb-16 overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/5 via-transparent to-transparent" />
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(var(--color-foreground) 1px, transparent 1px), linear-gradient(90deg, var(--color-foreground) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <Container className="relative z-10">
        <motion.div
          initial="initial"
          animate="animate"
          variants={staggerContainerVariants}
          className="text-center max-w-4xl mx-auto"
        >
          {/* Badge */}
          <motion.div variants={createItemVariants()} className="mb-6">
            <Badge variant="primary" className="gap-2">
              <Sparkles className="w-3 h-3" />
              <span>AI-Powered Health Coaching</span>
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={createItemVariants(0.1)}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-[var(--color-foreground)] mb-6"
          >
            Your Personal{" "}
            <span className="text-gradient">AI Health Coach</span>
            <br />
            Available 24/7
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={createItemVariants(0.2)}
            className="text-lg sm:text-xl text-[var(--color-muted-foreground)] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Transform your health with personalized AI guidance, smart nutrition tracking, 
            adaptive workouts, and weekly insights — all in one beautiful app.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={createItemVariants(0.3)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link href={authNav.signUp.href}>
              <Button size="xl" className="gap-2 group">
                Start Free Today
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="xl">
                See How It Works
              </Button>
            </Link>
          </motion.div>

          {/* Trust Signals */}
          <motion.div
            variants={createItemVariants(0.4)}
            className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--color-tertiary)]"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[var(--color-success)]" />
              <span>Privacy-first design</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[var(--color-primary)]" />
              <span>Web & mobile sync</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
              <span>AI-powered insights</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Product Preview */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative mt-16 lg:mt-24"
        >
          {/* Glow Effect */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-background)] via-transparent to-transparent z-10 pointer-events-none" />
          
          <div className="relative rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-xl)] overflow-hidden">
            {/* Browser Chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-[var(--color-elevated)] border-b border-[var(--color-border)]">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-[var(--color-error)]/60" />
                <div className="w-3 h-3 rounded-full bg-[var(--color-warning)]/60" />
                <div className="w-3 h-3 rounded-full bg-[var(--color-success)]/60" />
              </div>
              <div className="flex-1 mx-4">
                <div className="h-6 rounded-md bg-[var(--color-surface)] px-4 text-xs text-[var(--color-muted-foreground)] flex items-center">
                  app.aivo.com
                </div>
              </div>
            </div>
            
            {/* Dashboard Preview */}
            <div className="relative aspect-[16/10] bg-[var(--color-surface)]">
              <Image
                src="https://picsum.photos/seed/aivo-dashboard/1400/875"
                alt="AIVO Dashboard Preview"
                fill
                className="object-cover opacity-80"
                priority
              />
              
              {/* Overlay gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/10 via-transparent to-[var(--color-accent)]/10" />
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
