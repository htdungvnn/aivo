"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { MuscleDashboard } from "@/components/body/MuscleActivationChart";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SkipLink } from "@/components/accessibility";
import {
  Activity,
  ArrowRight,
  Dumbbell,
  Cloud,
  Database,
  GitGraph,
  Globe,
  Server,
  Zap,
} from "lucide-react";
import { motion } from "framer-motion";
import FeatureCard, { fadeInUp, staggerContainer } from "@/components/landing/FeatureCard";
import TechStackCard from "@/components/landing/TechStackCard";
import { featureCardsConfig } from "@/data/feature-cards";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, loading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  // Memoize static data
  const trustIndicators = useMemo(() => [
    "Powered by Cloudflare",
    "Real-time Sync",
    "End-to-end Encrypted",
    "HIPAA Compliant"
  ], []);

  const techStackItems = useMemo(() => [
    {
      name: "Hono",
      description: "Ultra-lightweight edge framework for high-performance APIs",
      icon: <Globe className="w-6 h-6 text-white" />,
      badge1: { label: "Edge Native", className: "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30" },
      badge2: { label: "~3KB", className: "bg-slate-700/50 text-gray-400 hover:bg-slate-700/70" },
    },
    {
      name: "Rust WASM",
      description: "Near-native performance for complex fitness calculations",
      icon: <Zap className="w-6 h-6 text-white" />,
      badge1: { label: "Compute", className: "bg-orange-500/20 text-orange-400 hover:bg-orange-500/30" },
      badge2: { label: "~50% tokens saved", className: "bg-slate-700/50 text-gray-400 hover:bg-slate-700/70" },
    },
    {
      name: "D1 SQL",
      description: "Serverless relational database with zero-config",
      icon: <Database className="w-6 h-6 text-white" />,
      badge1: { label: "SQLite-compatible", className: "bg-blue-500/20 text-blue-400 hover:bg-blue-500/30" },
      badge2: { label: "HA built-in", className: "bg-slate-700/50 text-gray-400 hover:bg-slate-700/70" },
    },
    {
      name: "R2 Storage",
      description: "Zero-egress object storage for media and backups",
      icon: <Server className="w-6 h-6 text-white" />,
      badge1: { label: "S3-compatible", className: "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30" },
      badge2: { label: "$0 egress", className: "bg-slate-700/50 text-gray-400 hover:bg-slate-700/70" },
    },
    {
      name: "Drizzle ORM",
      description: "Type-safe queries with built-in migration system",
      icon: <GitGraph className="w-6 h-6 text-white" />,
      badge1: { label: "TypeScript", className: "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30" },
      badge2: { label: "Migrations", className: "bg-slate-700/50 text-gray-400 hover:bg-slate-700/70" },
    }
  ], []);

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
      {/* Skip to main content link for accessibility */}
      <SkipLink targetId="main-content" />

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-slate-950/80 backdrop-blur-lg border-b border-blue-500/10" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Activity className="w-8 h-8 text-cyan-400" aria-hidden="true" />
                <div className="absolute -inset-1 bg-cyan-400/20 rounded-full blur-sm" aria-hidden="true" />
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
                aria-label="Sign in to your account"
              >
                Sign In
              </Button>
              <Button
                size="sm"
                onClick={() => router.push("/login")}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40"
                aria-label="Get started with AIVO for free"
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main id="main-content" role="main" tabIndex={-1}>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 px-4 sm:px-6 lg:px-8" aria-labelledby="hero-title">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeInUp}
              className="text-center mb-16"
            >
              <Badge variant="outline" className="mb-6 gap-2 px-4 py-2 border-cyan-500/30 text-cyan-400 bg-cyan-500/10">
                <Activity className="w-4 h-4" aria-hidden="true" />
                AI-Powered Fitness Intelligence
              </Badge>
              <h1 id="hero-title" className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-tight mb-6">
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
                  aria-label="Start your free AI body analysis"
                >
                  Start Free Analysis
                  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                </Button>
                <Button
                  variant="outline"
                  size="lg"
                  className="border-slate-600 bg-slate-800/50 hover:bg-slate-700/50"
                  aria-label="Watch a demo of AIVO platform"
                >
                  <Activity className="w-5 h-5 mr-2" aria-hidden="true" />
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
              {trustIndicators.map((item) => (
                <motion.div key={item} variants={fadeInUp} className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
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
              {featureCardsConfig.map((config) => (
                <FeatureCard
                  key={config.id}
                  config={config}
                  isExpanded={expandedCard === config.id}
                  onToggle={setExpandedCard}
                />
              ))}
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
              {techStackItems.map((item) => (
                <TechStackCard
                  key={item.name}
                  name={item.name}
                  description={item.description}
                  icon={item.icon}
                  badge1={item.badge1}
                  badge2={item.badge2}
                />
              ))}
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

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 bg-slate-900/30 py-12 px-4 sm:px-6 lg:px-8" role="contentinfo">
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
