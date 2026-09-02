"use client";

import * as React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Smartphone, Sparkles, TrendingUp, Activity, Heart, Flame, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Badge } from "@/components/ui/badge";
import { authNav } from "@aivo/marketing-config";
import { fadeInUpVariants, staggerContainerVariants, createItemVariants } from "@/lib/animations";
import { useTranslations } from "next-intl";

export function Hero() {
  const t = useTranslations("hero");
  const commonT = useTranslations("common");

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
              <span>{t("badge")}</span>
            </Badge>
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={createItemVariants(0.1)}
            className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight text-[var(--color-foreground)] mb-6"
          >
            {t("headline")}{" "}
            <span className="text-gradient">{t("headlinePart")}</span>
            <br />
            {t("headlineSubtext")}
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            variants={createItemVariants(0.2)}
            className="text-lg sm:text-xl text-[var(--color-muted-foreground)] max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {t("subheadline")}
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={createItemVariants(0.3)}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
          >
            <Link href={authNav.signUp.href}>
              <Button size="xl" className="gap-2 group">
                {t("ctaPrimary")}
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="#features">
              <Button variant="outline" size="xl">
                {t("ctaSecondary")}
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
              <span>{t("trustPrivacy")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-[var(--color-primary)]" />
              <span>{t("trustSync")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[var(--color-accent)]" />
              <span>{t("trustAI")}</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Health Dashboard Preview */}
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
                  app.aivo.com/dashboard
                </div>
              </div>
            </div>
            
            {/* Health Dashboard Content */}
            <div className="relative aspect-[16/10] bg-[var(--color-background)] p-6 overflow-hidden">
              <HealthDashboardPreview />
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

// Health Dashboard Preview Component
function HealthDashboardPreview() {
  return (
    <div className="h-full flex flex-col gap-4">
      {/* Header Stats Row */}
      <div className="grid grid-cols-4 gap-3">
        {/* Readiness Score */}
        <div className="col-span-1 bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[var(--color-muted-foreground)]">Readiness</span>
            <Activity className="w-4 h-4 text-[var(--color-success)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--color-foreground)] mb-1">87</div>
          <div className="text-xs text-[var(--color-success)]">+12% vs avg</div>
          {/* Mini Ring Chart */}
          <div className="mt-2 relative w-full h-16">
            <svg viewBox="0 0 100 50" className="w-full h-full">
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="var(--color-muted)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="var(--color-success)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray="125.6"
                strokeDashoffset="16.3"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-medium text-[var(--color-foreground)]">87%</span>
            </div>
          </div>
        </div>

        {/* Calories */}
        <div className="col-span-1 bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[var(--color-muted-foreground)]">Calories</span>
            <Flame className="w-4 h-4 text-[var(--color-accent)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--color-foreground)] mb-1">1,847</div>
          <div className="text-xs text-[var(--color-muted-foreground)]">of 2,400 goal</div>
          {/* Progress Bar */}
          <div className="mt-3 h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[var(--color-accent)] to-[var(--color-primary)] rounded-full" style={{ width: '77%' }} />
          </div>
        </div>

        {/* Sleep */}
        <div className="col-span-1 bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[var(--color-muted-foreground)]">Sleep</span>
            <Moon className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--color-foreground)] mb-1">7h 32m</div>
          <div className="text-xs text-[var(--color-success)]">Quality: Excellent</div>
          {/* Sleep Stages */}
          <div className="mt-3 flex gap-1 h-8">
            <div className="w-[15%] h-full bg-[var(--color-muted)] rounded-sm" />
            <div className="w-[25%] h-full bg-[var(--color-primary)] rounded-sm" />
            <div className="w-[30%] h-full bg-[var(--color-primary)]/70 rounded-sm" />
            <div className="w-[20%] h-full bg-[var(--color-accent)] rounded-sm" />
            <div className="w-[10%] h-full bg-[var(--color-muted)] rounded-sm" />
          </div>
        </div>

        {/* Heart Rate */}
        <div className="col-span-1 bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-[var(--color-muted-foreground)]">Heart Rate</span>
            <Heart className="w-4 h-4 text-[var(--color-error)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--color-foreground)] mb-1">68 <span className="text-sm font-normal text-[var(--color-muted-foreground)]">bpm</span></div>
          <div className="text-xs text-[var(--color-success)]">Resting HRV: 45ms</div>
          {/* Heart Rate Line Chart */}
          <div className="mt-3 h-8">
            <svg viewBox="0 0 100 30" className="w-full h-full" preserveAspectRatio="none">
              <path
                d="M0 20 Q10 15 15 18 T25 15 T35 22 T45 12 T55 18 T65 15 T75 20 T85 15 T100 18"
                fill="none"
                stroke="var(--color-error)"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0" style={{ height: '180px' }}>
        {/* Weekly Activity Chart */}
        <div className="col-span-2 bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-[var(--color-foreground)]">Weekly Activity</span>
            <TrendingUp className="w-4 h-4 text-[var(--color-success)]" />
          </div>
          <div className="flex-1 min-h-0 relative">
            <WeeklyActivityChart />
          </div>
        </div>

        {/* AI Coach Preview */}
        <div className="col-span-1 bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-accent)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-[var(--color-foreground)]">AI Coach</span>
          </div>
          <div className="flex-1 bg-[var(--color-muted)]/30 rounded-lg p-3 text-xs text-[var(--color-muted-foreground)] leading-relaxed">
            <p className="mb-2">Based on your readiness score and sleep data, I recommend a moderate workout today. 💪</p>
            <p>Your recovery is excellent! Consider adding 10 minutes of light stretching.</p>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 h-6 bg-[var(--color-primary)]/10 rounded-full" />
            <div className="w-6 h-6 bg-[var(--color-accent)]/10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

// Weekly Activity Bar Chart
function WeeklyActivityChart() {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const values = [65, 80, 45, 90, 70, 55, 30];
  const maxValue = Math.max(...values);
  
  return (
    <div className="h-full w-full relative flex items-stretch">
      {days.map((day, i) => {
        const value = values[i] ?? 0;
        const heightPercent = (value / maxValue) * 100;
        return (
          <div key={day} className="flex-1 flex flex-col justify-end items-center">
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${heightPercent}%` }}
              transition={{ duration: 0.8, delay: i * 0.1 }}
              className={`w-4/5 rounded-t-sm ${
                i === 3 ? 'bg-gradient-to-t from-[var(--color-primary)] to-[var(--color-accent)]' : 'bg-[var(--color-primary)]/60'
              }`}
            />
            <span className="text-[10px] text-[var(--color-muted-foreground)] mt-2">{day}</span>
          </div>
        );
      })}
    </div>
  );
}
