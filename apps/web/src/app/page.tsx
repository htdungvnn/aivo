"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { MuscleDashboard } from "@/components/body/MuscleActivationChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bot,
  Brain,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Cloud,
  Database,
  Dumbbell,
  GitGraph,
  Globe,
  Quote,
  Server,
  Shield,
  Star,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

// Detailed content for each feature card
const featureDetails: Record<string, {
  benefits: string[];
  specs: { label: string; value: string }[];
  useCases: string[];
}> = {
  edgeAuth: {
    benefits: [
      "Zero-knowledge proofs for privacy-preserving authentication",
      "Behavioral biometrics continuously verify user identity",
      "Geographic-based risk assessment blocks suspicious logins",
      "Hardware-backed keys for phishing-resistant MFA",
      "SOC 2 Type II certified infrastructure"
    ],
    specs: [
      { label: "Auth Latency", value: "< 50ms global" },
      { label: "Uptime SLA", value: "99.99%" },
      { label: "Encryption", value: "AES-256-GCM" },
      { label: "Compliance", value: "GDPR, HIPAA, SOC2" }
    ],
    useCases: [
      "Healthcare providers requiring HIPAA compliance",
      "Enterprise teams with SSO requirements",
      "High-security applications with sensitive health data",
      "Global apps needing low-latency auth worldwide"
    ]
  },
  aiInsight: {
    benefits: [
      "Real-time body composition analysis from a single photo",
      "Muscle group activation heatmaps with 95% accuracy",
      "Progress tracking with AI-generated insights",
      "Personalized recommendations based on your unique physiology",
      "3D body model generation from 2D inputs"
    ],
    specs: [
      { label: "Analysis Time", value: "< 3 seconds" },
      { label: "Accuracy", value: "95%+" },
      { label: "Data Points", value: "600+ muscle points" },
      { label: "Models", value: "Custom CNN + ViT" }
    ],
    useCases: [
      "Track muscle growth and fat loss over time",
      "Identify muscular imbalances for injury prevention",
      "Optimize training focus based on weak points",
      "Share progress with trainers for coaching"
    ]
  },
  scheduler: {
    benefits: [
      "50% reduction in AI token usage through smart batching",
      "Recovery-aware scheduling adapts to your fatigue levels",
      "Progressive overload automatically incorporated",
      "Equipment and time constraints respected",
      "Seamless calendar integration with Google/Apple Calendar"
    ],
    specs: [
      { label: "Optimization", value: "Rust WASM engine" },
      { label: "Schedule Generation", value: "< 500ms" },
      { label: "Token Savings", value: "~50%" },
      { label: "Calendar Sync", value: "Real-time" }
    ],
    useCases: [
      "Busy professionals needing efficient workout planning",
      "Athletes managing multiple training modalities",
      "Gyms creating personalized programs at scale",
      "Anyone wanting to maximize results with minimal AI cost"
    ]
  },
  tracking: {
    benefits: [
      "Millisecond-precision sync across all devices",
      "Offline-first architecture works without connectivity",
      "Real-time collaboration with trainers and teammates",
      "Comprehensive analytics dashboard with trend analysis",
      "Export data to CSV, JSON, or PDF formats"
    ],
    specs: [
      { label: "Sync Speed", value: "< 100ms" },
      { label: "Offline Support", value: "7 days" },
      { label: "Data Resolution", value: "1ms precision" },
      { label: "Storage", value: "Unlimited" }
    ],
    useCases: [
      "Monitor daily fitness metrics and recovery",
      "Share workouts with training partners",
      "Analyze long-term trends and plateaus",
      "Prepare for competitions with precise tracking"
    ]
  },
  retention: {
    benefits: [
      "AI analyzes user behavior to predict churn risk",
      "Personalized push notifications with 40%+ open rates",
      "Adaptive challenges match user fitness levels",
      "Social features including leaderboards and groups",
      "Achievement system with 100+ badges"
    ],
    specs: [
      { label: "Engagement Boost", value: "+156% retention" },
      { label: "Notification AI", value: "GPT-4 powered" },
      { label: "Badges Available", value: "100+" },
      { label: "Social Features", value: "Full suite" }
    ],
    useCases: [
      "Fitness apps reducing monthly churn",
      "Gyms increasing member retention",
      "Corporate wellness programs boosting participation",
      "Coaches keeping clients motivated long-term"
    ]
  }
};

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (!loading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [loading, isAuthenticated, router]);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-cyan-400 text-lg font-medium">Loading AIVO...</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-lg border-b border-blue-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="w-8 h-8 text-cyan-400" />
                <div className="absolute -inset-1 bg-cyan-400/20 rounded-full blur-sm" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                AIVO
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-300 hover:text-cyan-400 transition-colors text-sm font-medium">
                Features
              </a>
              <a href="#tech-stack" className="text-gray-300 hover:text-cyan-400 transition-colors text-sm font-medium">
                Tech Stack
              </a>
              <a href="#pricing" className="text-gray-300 hover:text-cyan-400 transition-colors text-sm font-medium">
                Pricing
              </a>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/login")}
                className="text-gray-300 hover:text-white"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/login")}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-6 gap-2 px-4 py-2 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
              <Zap className="w-4 h-4" />
              AI-Powered Fitness Intelligence
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
              <span className="bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                Body Insight
              </span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Powered by AI
              </span>
            </h1>
            <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed mb-8">
              Unlock your body&apos;s full potential with AI-driven analysis, real-time tracking, and personalized
              fitness plans. Experience the future of health technology built on Cloudflare&apos;s edge network.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                onClick={() => router.push("/login")}
                className="group bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40"
              >
                Start Free Analysis
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="border-slate-600 bg-slate-800/50 hover:bg-slate-700/50"
              >
                <Activity className="w-5 h-5 mr-2" />
                Watch Demo
              </Button>
            </div>
          </motion.div>

          {/* Hero Visual - Interactive Muscle Activation Dashboard */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeInUp}
            className="relative max-w-4xl mx-auto"
          >
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900/20 to-purple-900/20 border border-blue-500/20 shadow-2xl">
              <MuscleDashboard />
            </div>
          </motion.div>

          {/* Trust Indicators */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="mt-16 flex flex-wrap justify-center items-center gap-8 text-gray-500"
          >
            {["Powered by Cloudflare", "Real-time Sync", "End-to-end Encrypted", "HIPAA Compliant"].map((item) => (
              <motion.div key={item} variants={fadeInUp} className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                <span className="text-sm font-medium">{item}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Feature Showcase */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">The </span>
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                Core 5
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Five powerful pillars working in harmony to transform your fitness journey
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          >
            {/* Feature 1: Edge Auth */}
            <motion.div variants={fadeInUp}>
              <Card
                className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 hover:border-emerald-500/50 transition-all overflow-hidden h-full cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === 'edgeAuth' ? null : 'edgeAuth')}
              >
                <CardContent className="pt-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Shield className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Edge Auth</h3>
                    <p className="text-gray-400 leading-relaxed mb-4">
                      Military-grade security with Cloudflare Turnstile. Zero-trust authentication at the edge,
                      protecting your health data with biometric verification and behavioral analysis.
                    </p>
                    <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium group-hover:gap-3 transition-all">
                      <span>{expandedCard === 'edgeAuth' ? 'Show less' : 'Learn more'}</span>
                      {expandedCard === 'edgeAuth' ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>

                    {/* Expandable Content */}
                    {expandedCard === 'edgeAuth' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-emerald-500/20 overflow-hidden"
                      >
                        <div className="space-y-6">
                          {/* Key Benefits */}
                          <div>
                            <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Key Benefits
                            </h4>
                            <ul className="space-y-2">
                              {featureDetails.edgeAuth.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Specs Grid */}
                          <div className="grid grid-cols-2 gap-4">
                            {featureDetails.edgeAuth.specs.map((spec, idx) => (
                              <div key={idx} className="bg-emerald-500/5 rounded-lg p-3">
                                <div className="text-xs text-emerald-400/70 uppercase tracking-wider">{spec.label}</div>
                                <div className="text-white font-semibold mt-1">{spec.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Use Cases */}
                          <div>
                            <h4 className="text-emerald-400 font-semibold mb-3 flex items-center gap-2">
                              <Quote className="w-4 h-4" />
                              Ideal For
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {featureDetails.edgeAuth.useCases.map((useCase, idx) => (
                                <Badge key={idx} variant="outline" className="border-emerald-500/30 text-emerald-300 bg-emerald-500/10">
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

            {/* Feature 2: AI Body Insight */}
            <motion.div variants={fadeInUp}>
              <Card
                className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 hover:border-cyan-500/50 transition-all overflow-hidden h-full cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === 'aiInsight' ? null : 'aiInsight')}
              >
                <CardContent className="pt-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Brain className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">AI Body Insight</h3>
                    <p className="text-gray-400 leading-relaxed mb-4">
                      Visualize your body composition through 2D vector heatmaps. Our AI analyzes muscle distribution,
                      fat percentage zones, and provides actionable insights with surgical precision.
                    </p>
                    <div className="flex items-center gap-2 text-cyan-400 text-sm font-medium group-hover:gap-3 transition-all">
                      <span>{expandedCard === 'aiInsight' ? 'Show less' : 'See demo'}</span>
                      {expandedCard === 'aiInsight' ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>

                    {/* Expandable Content */}
                    {expandedCard === 'aiInsight' && (
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
                            <h4 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Key Benefits
                            </h4>
                            <ul className="space-y-2">
                              {featureDetails.aiInsight.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-cyan-500 mt-0.5 flex-shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Specs Grid */}
                          <div className="grid grid-cols-2 gap-4">
                            {featureDetails.aiInsight.specs.map((spec, idx) => (
                              <div key={idx} className="bg-cyan-500/5 rounded-lg p-3">
                                <div className="text-xs text-cyan-400/70 uppercase tracking-wider">{spec.label}</div>
                                <div className="text-white font-semibold mt-1">{spec.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Use Cases */}
                          <div>
                            <h4 className="text-cyan-400 font-semibold mb-3 flex items-center gap-2">
                              <Quote className="w-4 h-4" />
                              Ideal For
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {featureDetails.aiInsight.useCases.map((useCase, idx) => (
                                <Badge key={idx} variant="outline" className="border-cyan-500/30 text-cyan-300 bg-cyan-500/10">
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

            {/* Feature 3: AI Smart Scheduler */}
            <motion.div variants={fadeInUp}>
              <Card
                className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 hover:border-purple-500/50 transition-all overflow-hidden h-full cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === 'scheduler' ? null : 'scheduler')}
              >
                <CardContent className="pt-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Calendar className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">AI Smart Scheduler</h3>
                    <p className="text-gray-400 leading-relaxed mb-4">
                      Rust-powered optimization engine creates personalized workout schedules. Save 50% on AI tokens
                      while getting hyper-personalized plans that adapt to your recovery and progress.
                    </p>
                    <div className="flex items-center gap-2 text-purple-400 text-sm font-medium group-hover:gap-3 transition-all">
                      <span>{expandedCard === 'scheduler' ? 'Show less' : 'Optimization demo'}</span>
                      {expandedCard === 'scheduler' ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>

                    {/* Expandable Content */}
                    {expandedCard === 'scheduler' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-purple-500/20 overflow-hidden"
                      >
                        <div className="space-y-6">
                          {/* Key Benefits */}
                          <div>
                            <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Key Benefits
                            </h4>
                            <ul className="space-y-2">
                              {featureDetails.scheduler.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 flex-shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Specs Grid */}
                          <div className="grid grid-cols-2 gap-4">
                            {featureDetails.scheduler.specs.map((spec, idx) => (
                              <div key={idx} className="bg-purple-500/5 rounded-lg p-3">
                                <div className="text-xs text-purple-400/70 uppercase tracking-wider">{spec.label}</div>
                                <div className="text-white font-semibold mt-1">{spec.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Use Cases */}
                          <div>
                            <h4 className="text-purple-400 font-semibold mb-3 flex items-center gap-2">
                              <Quote className="w-4 h-4" />
                              Ideal For
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {featureDetails.scheduler.useCases.map((useCase, idx) => (
                                <Badge key={idx} variant="outline" className="border-purple-500/30 text-purple-300 bg-purple-500/10">
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

            {/* Feature 4: Status Tracking */}
            <motion.div variants={fadeInUp}>
              <Card
                className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 hover:border-blue-500/50 transition-all overflow-hidden h-full cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === 'tracking' ? null : 'tracking')}
              >
                <CardContent className="pt-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <BarChart3 className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Status Tracking</h3>
                    <p className="text-gray-400 leading-relaxed mb-4">
                      Real-time dashboard syncing across Web and Mobile. Track metrics, visualize trends,
                      and monitor your fitness journey with millisecond-precision data updates.
                    </p>
                    <div className="flex items-center gap-2 text-blue-400 text-sm font-medium group-hover:gap-3 transition-all">
                      <span>{expandedCard === 'tracking' ? 'Show less' : 'View dashboard'}</span>
                      {expandedCard === 'tracking' ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>

                    {/* Expandable Content */}
                    {expandedCard === 'tracking' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-blue-500/20 overflow-hidden"
                      >
                        <div className="space-y-6">
                          {/* Key Benefits */}
                          <div>
                            <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Key Benefits
                            </h4>
                            <ul className="space-y-2">
                              {featureDetails.tracking.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Specs Grid */}
                          <div className="grid grid-cols-2 gap-4">
                            {featureDetails.tracking.specs.map((spec, idx) => (
                              <div key={idx} className="bg-blue-500/5 rounded-lg p-3">
                                <div className="text-xs text-blue-400/70 uppercase tracking-wider">{spec.label}</div>
                                <div className="text-white font-semibold mt-1">{spec.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Use Cases */}
                          <div>
                            <h4 className="text-blue-400 font-semibold mb-3 flex items-center gap-2">
                              <Quote className="w-4 h-4" />
                              Ideal For
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {featureDetails.tracking.useCases.map((useCase, idx) => (
                                <Badge key={idx} variant="outline" className="border-blue-500/30 text-blue-300 bg-blue-500/10">
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

            {/* Feature 5: Retention Engine */}
            <motion.div variants={fadeInUp}>
              <Card
                className="group relative bg-gradient-to-br from-slate-900/80 to-slate-800/80 border-slate-700/50 hover:border-orange-500/50 transition-all overflow-hidden h-full cursor-pointer"
                onClick={() => setExpandedCard(expandedCard === 'retention' ? null : 'retention')}
              >
                <CardContent className="pt-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="relative">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                      <Bot className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-3">Retention Engine</h3>
                    <p className="text-gray-400 leading-relaxed mb-4">
                      AI-powered gamification with memory graph technology. Personalized nudges, achievement systems,
                      and adaptive challenges keep users engaged and coming back for more.
                    </p>
                    <div className="flex items-center gap-2 text-orange-400 text-sm font-medium group-hover:gap-3 transition-all">
                      <span>{expandedCard === 'retention' ? 'Show less' : 'Learn strategy'}</span>
                      {expandedCard === 'retention' ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </div>

                    {/* Expandable Content */}
                    {expandedCard === 'retention' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="mt-6 pt-6 border-t border-orange-500/20 overflow-hidden"
                      >
                        <div className="space-y-6">
                          {/* Key Benefits */}
                          <div>
                            <h4 className="text-orange-400 font-semibold mb-3 flex items-center gap-2">
                              <Star className="w-4 h-4" />
                              Key Benefits
                            </h4>
                            <ul className="space-y-2">
                              {featureDetails.retention.benefits.map((benefit, idx) => (
                                <li key={idx} className="flex items-start gap-2 text-gray-300 text-sm">
                                  <CheckCircle2 className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                                  <span>{benefit}</span>
                                </li>
                              ))}
                            </ul>
                          </div>

                          {/* Specs Grid */}
                          <div className="grid grid-cols-2 gap-4">
                            {featureDetails.retention.specs.map((spec, idx) => (
                              <div key={idx} className="bg-orange-500/5 rounded-lg p-3">
                                <div className="text-xs text-orange-400/70 uppercase tracking-wider">{spec.label}</div>
                                <div className="text-white font-semibold mt-1">{spec.value}</div>
                              </div>
                            ))}
                          </div>

                          {/* Use Cases */}
                          <div>
                            <h4 className="text-orange-400 font-semibold mb-3 flex items-center gap-2">
                              <Quote className="w-4 h-4" />
                              Ideal For
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {featureDetails.retention.useCases.map((useCase, idx) => (
                                <Badge key={idx} variant="outline" className="border-orange-500/30 text-orange-300 bg-orange-500/10">
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
          </motion.div>
        </div>
      </section>

      {/* Tech Stack Section */}
      <section id="tech-stack" className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/5 to-transparent" />
        <div className="max-w-7xl mx-auto relative">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="text-center mb-16"
          >
            <Badge variant="outline" className="mb-6 gap-2 px-4 py-2 border-purple-500/30 text-purple-400 bg-purple-500/10">
              <Cloud className="w-4 h-4" />
              Cloudflare Cost-Saver Architecture
            </Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              <span className="text-white">Built for </span>
              <span className="bg-gradient-to-r from-emerald-400 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                Scale & Savings
              </span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Our serverless-first architecture delivers enterprise-grade performance at a fraction of the cost.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6"
          >
            {/* Hono */}
            <motion.div variants={fadeInUp}>
              <Card className="group relative bg-slate-900/60 border-slate-700/30 hover:border-emerald-500/50 transition-all h-full">
                <CardContent className="pt-6">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-white mb-2">Hono</h4>
                  <p className="text-sm text-gray-400">Ultra-lightweight edge framework for high-performance APIs</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30">
                      Edge Native
                    </Badge>
                    <Badge variant="secondary" className="bg-slate-700/50 text-gray-400 hover:bg-slate-700/70">
                      ~3KB
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Rust WASM */}
            <motion.div variants={fadeInUp}>
              <Card className="group relative bg-slate-900/60 border-slate-700/30 hover:border-orange-500/50 transition-all h-full">
                <CardContent className="pt-6">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 className="w-6 h-6 text-orange-400" />
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center mb-4">
                    <Zap className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-white mb-2">Rust WASM</h4>
                  <p className="text-sm text-gray-400">Near-native performance for complex fitness calculations</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-orange-500/20 text-orange-400 hover:bg-orange-500/30">
                      Compute
                    </Badge>
                    <Badge variant="secondary" className="bg-slate-700/50 text-gray-400 hover:bg-slate-700/70">
                      ~50% tokens saved
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* D1 Database */}
            <motion.div variants={fadeInUp}>
              <Card className="group relative bg-slate-900/60 border-slate-700/30 hover:border-blue-500/50 transition-all h-full">
                <CardContent className="pt-6">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-white mb-2">D1 SQL</h4>
                  <p className="text-sm text-gray-400">Serverless relational database with zero-config</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30">
                      SQLite-compatible
                    </Badge>
                    <Badge variant="secondary" className="bg-slate-700/50 text-gray-400 hover:bg-slate-700/70">
                      HA built-in
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* R2 Storage */}
            <motion.div variants={fadeInUp}>
              <Card className="group relative bg-slate-900/60 border-slate-700/30 hover:border-amber-500/50 transition-all h-full">
                <CardContent className="pt-6">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center mb-4">
                    <Server className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-white mb-2">R2 Storage</h4>
                  <p className="text-sm text-gray-400">Zero-egress object storage for media and backups</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-amber-500/20 text-amber-400 hover:bg-amber-500/30">
                      S3-compatible
                    </Badge>
                    <Badge variant="secondary" className="bg-slate-700/50 text-gray-400 hover:bg-slate-700/70">
                      $0 egress
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Drizzle ORM */}
            <motion.div variants={fadeInUp}>
              <Card className="group relative bg-slate-900/60 border-slate-700/30 hover:border-purple-500/50 transition-all h-full">
                <CardContent className="pt-6">
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <CheckCircle2 className="w-6 h-6 text-purple-400" />
                  </div>
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center mb-4">
                    <GitGraph className="w-6 h-6 text-white" />
                  </div>
                  <h4 className="font-bold text-white mb-2">Drizzle ORM</h4>
                  <p className="text-sm text-gray-400">Type-safe queries with built-in migration system</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="secondary" className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30">
                      TypeScript
                    </Badge>
                    <Badge variant="secondary" className="bg-slate-700/50 text-gray-400 hover:bg-slate-700/70">
                      Migrations
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Cost Comparison */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="mt-16 relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-emerald-500/5 rounded-2xl blur-xl" />
            <Card className="relative bg-slate-900/80 border-slate-700/50">
              <CardContent className="pt-6">
                <h3 className="text-2xl font-bold text-white mb-8 text-center">
                  Cloudflare vs Traditional Cloud
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-slate-700/50">
                        <th className="text-left py-4 px-4 text-gray-400 font-medium">Service</th>
                        <th className="text-center py-4 px-4 text-gray-400 font-medium">Cloudflare</th>
                        <th className="text-center py-4 px-4 text-gray-400 font-medium">AWS/GCP</th>
                        <th className="text-center py-4 px-4 text-emerald-400 font-medium">Savings</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm">
                      <tr className="border-b border-slate-800/50">
                        <td className="py-4 px-4 text-white">Compute (per 1M requests)</td>
                        <td className="py-4 px-4 text-center text-cyan-400">$0.50</td>
                        <td className="py-4 px-4 text-center text-gray-400">$3.50</td>
                        <td className="py-4 px-4 text-center text-emerald-400 font-bold">85%</td>
                      </tr>
                      <tr className="border-b border-slate-800/50">
                        <td className="py-4 px-4 text-white">Database (per GB)</td>
                        <td className="py-4 px-4 text-center text-cyan-400">$0.25</td>
                        <td className="py-4 px-4 text-center text-gray-400">$0.75</td>
                        <td className="py-4 px-4 text-center text-emerald-400 font-bold">66%</td>
                      </tr>
                      <tr className="border-b border-slate-800/50">
                        <td className="py-4 px-4 text-white">Storage (egress)</td>
                        <td className="py-4 px-4 text-center text-cyan-400">$0.00</td>
                        <td className="py-4 px-4 text-center text-gray-400">$0.09</td>
                        <td className="py-4 px-4 text-center text-emerald-400 font-bold">100%</td>
                      </tr>
                      <tr>
                        <td className="py-4 px-4 text-white">Global Latency</td>
                        <td className="py-4 px-4 text-center text-cyan-400">&lt;50ms</td>
                        <td className="py-4 px-4 text-center text-gray-400">100-300ms</td>
                        <td className="py-4 px-4 text-center text-emerald-400 font-bold">2-6x faster</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeInUp}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-blue-500/20 to-purple-500/20 blur-2xl" />
            <Card className="relative bg-gradient-to-br from-slate-900/90 to-slate-800/90 border-cyan-500/30">
              <CardContent className="pt-6 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Transform Your Fitness Journey?
                </h2>
                <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
                  Join thousands of users who have already unlocked their body&apos;s full potential with AIVO&apos;s
                  AI-powered insights. Start free, no credit card required.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    onClick={() => router.push("/login")}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-xl shadow-cyan-500/25 hover:shadow-cyan-500/40"
                  >
                    Get Started Free
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-slate-600 bg-slate-800/50 hover:bg-slate-700/50"
                  >
                    <Dumbbell className="w-5 h-5 mr-2" />
                    Schedule Demo
                  </Button>
                </div>
                <p className="mt-6 text-sm text-gray-500">
                  Free tier includes: 5 AI analyses, basic tracking, mobile app access
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-slate-900/30 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Activity className="w-6 h-6 text-cyan-400" />
              <div className="absolute -inset-1 bg-cyan-400/20 rounded-full blur-sm" />
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              AIVO
            </span>
          </div>
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-cyan-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Terms</a>
            <a href="#" className="hover:text-cyan-400 transition-colors">Contact</a>
          </div>
          <p className="text-sm text-gray-600">
            © 2025 AIVO. Built on Cloudflare.
          </p>
        </div>
      </footer>
    </div>
  );
}
