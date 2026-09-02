"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Heart,
  Target,
  Zap,
  Shield,
  Cpu,
  Brain,
  Sparkles,
  Users,
  Globe,
  Code,
  Lightbulb,
  Layers,
  Bot,
  TrendingUp,
  Award,
  Mail,
  MapPin,
  Calendar,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";

// Custom social icons as inline SVGs
function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  );
}

function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
    </svg>
  );
}

// Founder/CTO Profile
const founderProfile = {
  name: "Hoang Tien Dung",
  titles: ["Founder", "Chief Technology Officer"],
  location: "Vietnam",
  email: "dung@aivo.app",
  bio: "With over a decade of experience in software engineering and AI development, I founded AIVO with a simple mission: make personalized health coaching accessible to everyone through the power of AI. I believe technology should enhance human health, not replace the human connection that makes wellness journeys meaningful.",
  longBio: `Building AIVO has been an incredible journey of combining my passion for technology with my belief that everyone deserves access to quality health guidance. As both the founder and CTO, I oversee everything from system architecture to AI model development.

My background spans distributed systems, machine learning, and health technology. I built AIVO's entire tech stack from the ground up using modern technologies like Cloudflare Workers, WebAssembly, and React Native to create a truly cross-platform experience.

The most exciting part? Watching our AI models learn and adapt to each user's unique health patterns, providing insights that were previously only available through expensive personal trainers or nutritionists.`,
  expertise: [
    { name: "AI/ML Engineering", level: 95 },
    { name: "System Architecture", level: 90 },
    { name: "Cloudflare Workers", level: 92 },
    { name: "TypeScript/React", level: 95 },
    { name: "Mobile Development", level: 85 },
    { name: "Health Tech", level: 88 },
  ],
  social: {
    linkedin: "#",
    twitter: "#",
    github: "#",
  },
  avatar: "HTD",
};

// AI Features
const aiFeatures = [
  {
    icon: Brain,
    title: "AI Coach",
    description: "Your personal wellness assistant available 24/7 to answer questions, provide motivation, and offer personalized health guidance.",
    details: ["Natural language conversations", "Personalized responses", "Evidence-based advice"],
  },
  {
    icon: Camera,
    title: "AI Pose Detection",
    description: "Real-time exercise form analysis using WebAssembly-powered computer vision to prevent injuries.",
    details: ["Real-time feedback", "Form correction", "Injury prevention"],
  },
  {
    icon: Sparkles,
    title: "AI Nutrition Analysis",
    description: "Snap a photo of your meal and get instant nutritional insights powered by advanced image recognition.",
    details: ["Food recognition", "Macro calculation", "Meal planning"],
  },
  {
    icon: TrendingUp,
    title: "Predictive Analytics",
    description: "AI analyzes your health patterns to predict trends and provide proactive recommendations.",
    details: ["Trend prediction", "Early warnings", "Personalized insights"],
  },
  {
    icon: Heart,
    title: "Readiness Score",
    description: "Machine learning algorithms combine multiple health metrics to calculate your daily readiness score.",
    details: ["Multi-metric analysis", "Sleep optimization", "Activity planning"],
  },
  {
    icon: Layers,
    title: "Adaptive Learning",
    description: "The AI continuously learns from your behavior and feedback to provide increasingly personalized guidance.",
    details: ["Pattern recognition", "Preference learning", "Dynamic adjustment"],
  },
];

// Technology Stack
const techStack = [
  {
    category: "AI & Machine Learning",
    items: [
      { name: "TensorFlow.js", description: "Client-side ML inference" },
      { name: "MediaPipe", description: "Pose detection & tracking" },
      { name: "Custom LLMs", description: "Health domain fine-tuned models" },
      { name: "WebAssembly", description: "High-performance ML workloads" },
    ],
  },
  {
    category: "Frontend & Mobile",
    items: [
      { name: "Next.js 16", description: "React meta-framework" },
      { name: "React Native", description: "Cross-platform mobile" },
      { name: "Expo SDK 57", description: "Mobile development" },
      { name: "Framer Motion", description: "Animations" },
    ],
  },
  {
    category: "Backend & Infrastructure",
    items: [
      { name: "Cloudflare Workers", description: "Edge computing" },
      { name: "Hono Framework", description: "Lightweight API" },
      { name: "Turborepo", description: "Monorepo management" },
      { name: "TypeScript", description: "Type safety" },
    ],
  },
];

// Core Values
const values = [
  {
    icon: Heart,
    title: "Health First",
    description: "Every feature starts with one question: will this help people live healthier lives?",
  },
  {
    icon: Shield,
    title: "Privacy by Design",
    description: "End-to-end encryption, HIPAA compliance, and you own your data always.",
  },
  {
    icon: Sparkles,
    title: "AI with Purpose",
    description: "AI that augments human expertise, never replaces professional healthcare.",
  },
  {
    icon: Globe,
    title: "Accessibility",
    description: "Quality health guidance shouldn't require wealth or proximity to specialists.",
  },
];

// Stats
const stats = [
  { value: "10K+", label: "Active Users" },
  { value: "50+", label: "Countries" },
  { value: "1M+", label: "Meals Tracked" },
  { value: "100K+", label: "Workouts Analyzed" },
];

// Custom Camera icon
function Camera({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
      <circle cx="12" cy="13" r="4"/>
    </svg>
  );
}

interface ValueCardProps {
  value: typeof values[0];
  index: number;
}

function ValueCard({ value, index }: ValueCardProps) {
  const Icon = value.icon;
  return (
    <motion.div variants={createItemVariants()}>
      <Card className="p-6 h-full hover:border-[var(--color-border-hover)] transition-all duration-300 text-center">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] mx-auto mb-4">
          <Icon className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2">
          {value.title}
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)] leading-relaxed">
          {value.description}
        </p>
      </Card>
    </motion.div>
  );
}

interface AIActivityCardProps {
  feature: typeof aiFeatures[0];
  index: number;
}

function AIActivityCard({ feature, index }: AIActivityCardProps) {
  const Icon = feature.icon;
  return (
    <motion.div variants={createItemVariants()}>
      <Card className="p-6 h-full hover:border-[var(--color-border-hover)] transition-all duration-300 group">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] mb-4 group-hover:bg-[var(--color-primary)] group-hover:text-[var(--color-primary-foreground)] transition-colors">
          <Icon className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--color-foreground)] mb-2 group-hover:text-[var(--color-primary)] transition-colors">
          {feature.title}
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-4">
          {feature.description}
        </p>
        <div className="space-y-2">
          {feature.details.map((detail) => (
            <div key={detail} className="flex items-center gap-2 text-xs text-[var(--color-tertiary)]">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
              {detail}
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}

interface TechCategoryProps {
  category: typeof techStack[0];
}

function TechCategory({ category }: TechCategoryProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-[var(--color-foreground)] uppercase tracking-wider">
        {category.category}
      </h4>
      <div className="space-y-3">
        {category.items.map((item) => (
          <div key={item.name} className="flex items-start gap-3">
            <Code className="w-4 h-4 text-[var(--color-primary)] mt-0.5" />
            <div>
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {item.name}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface ExpertiseBarProps {
  skill: { name: string; level: number };
  index: number;
}

function ExpertiseBar({ skill, index }: ExpertiseBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-[var(--color-foreground)]">
          {skill.name}
        </span>
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {skill.level}%
        </span>
      </div>
      <div className="h-2 bg-[var(--color-muted)] rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${skill.level}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, delay: index * 0.1 }}
          className="h-full bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] rounded-full"
        />
      </div>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
      {/* Hero Section */}
      <section className="pt-32 pb-20 lg:pt-40 lg:pb-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-[var(--color-primary)]/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-[var(--color-accent)]/5 rounded-full blur-3xl" />
        </div>

        <Container className="relative z-10">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <Badge variant="primary" className="mb-4">
                About the Founder
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-5xl lg:text-6xl mb-6">
                Meet <span className="text-[var(--color-primary)]">{founderProfile.name}</span>
              </h1>
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {founderProfile.titles.map((title) => (
                  <Badge key={title} variant="outline">
                    {title}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap justify-center gap-4 text-sm text-[var(--color-muted-foreground)]">
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {founderProfile.location}
                </div>
                <div className="flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  {founderProfile.email}
                </div>
              </div>
            </motion.div>

            {/* Founder Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] p-8 lg:p-12"
            >
              <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start">
                <div className="shrink-0">
                  <Avatar size="xl" fallback={founderProfile.avatar} className="w-32 h-32 text-2xl" />
                </div>
                <div className="flex-1 text-center lg:text-left">
                  <p className="text-lg text-[var(--color-foreground)] leading-relaxed mb-6">
                    {founderProfile.bio}
                  </p>
                  
                  {/* Social Links */}
                  <div className="flex items-center justify-center lg:justify-start gap-3">
                    {founderProfile.social.linkedin && (
                      <a
                        href={founderProfile.social.linkedin}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] transition-colors"
                      >
                        <LinkedInIcon className="w-5 h-5" />
                      </a>
                    )}
                    {founderProfile.social.twitter && (
                      <a
                        href={founderProfile.social.twitter}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] transition-colors"
                      >
                        <TwitterIcon className="w-5 h-5" />
                      </a>
                    )}
                    {founderProfile.social.github && (
                      <a
                        href={founderProfile.social.github}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] hover:bg-[var(--color-primary)] hover:text-[var(--color-primary-foreground)] transition-colors"
                      >
                        <GitHubIcon className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[var(--color-surface)]/50 border-y border-[var(--color-border)]">
        <Container>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <p className="text-4xl font-bold text-[var(--color-primary)] mb-2">
                  {stat.value}
                </p>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {stat.label}
                </p>
              </motion.div>
            ))}
          </div>
        </Container>
      </section>

      {/* About Story */}
      <section className="py-24 lg:py-32">
        <Container>
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-4">
                The Vision
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl mb-6">
                Building AIVO: A Personal Journey
              </h2>
              <div className="space-y-4 text-[var(--color-muted-foreground)]">
                {founderProfile.longBio.split('\n\n').map((paragraph, idx) => (
                  <p key={idx} className="text-base leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.div>
          </div>
        </Container>
      </section>

      {/* Expertise Section */}
      <section className="py-24 lg:py-32 bg-[var(--color-surface)]/30">
        <Container>
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12"
            >
              <Badge variant="primary" className="mb-4">
                Technical Expertise
              </Badge>
              <h2 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl">
                Skills & Technologies
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {founderProfile.expertise.map((skill, index) => (
                <ExpertiseBar key={skill.name} skill={skill} index={index} />
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* AI Features Section */}
      <section className="py-24 lg:py-32">
        <Container>
          <SectionHeader
            eyebrow="AI Powering AIVO"
            title="Cutting-Edge AI Technology"
            description="Built from the ground up with advanced AI/ML capabilities to deliver truly personalized health coaching."
            badge="AI-First"
            badgeVariant="primary"
            className="mb-16"
          />

          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {aiFeatures.map((feature, index) => (
              <AIActivityCard key={feature.title} feature={feature} index={index} />
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Tech Stack Section */}
      <section className="py-24 lg:py-32 bg-[var(--color-surface)]/30">
        <Container>
          <SectionHeader
            eyebrow="Under the Hood"
            title="Modern Tech Stack"
            description="Built with the best tools for performance, scalability, and developer experience."
            className="mb-16"
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {techStack.map((category) => (
              <TechCategory key={category.category} category={category} />
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-12 max-w-2xl mx-auto"
          >
            <Card className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-[var(--color-accent)]" />
                <span className="font-semibold text-[var(--color-foreground)]">
                  Powered by Cloudflare
                </span>
              </div>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Global edge network for lightning-fast performance, Workers for serverless computing, 
                KV for data storage, and Queues for async processing. Built for scale.
              </p>
            </Card>
          </motion.div>
        </Container>
      </section>

      {/* Core Values */}
      <section className="py-24 lg:py-32">
        <Container>
          <SectionHeader
            eyebrow="Our Philosophy"
            title="What We Believe"
            description="Every decision starts with these core principles."
            className="mb-16"
          />

          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {values.map((value, index) => (
              <ValueCard key={value.title} value={value} index={index} />
            ))}
          </motion.div>
        </Container>
      </section>

      {/* Contact CTA */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--color-primary)]/5 rounded-full blur-3xl" />
        </div>

        <Container className="relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center"
          >
            <Badge variant="accent" className="mb-4">
              Get in Touch
            </Badge>
            <h2 className="text-3xl font-bold tracking-tight text-[var(--color-foreground)] sm:text-4xl mb-6">
              Let&apos;s Connect
            </h2>
            <p className="text-lg text-[var(--color-muted-foreground)] mb-8">
              Interested in AIVO, health technology, or just want to say hello? 
              I&apos;d love to hear from you.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a
                href="mailto:dung@aivo.app"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] font-medium hover:opacity-90 transition-opacity"
              >
                <Mail className="w-4 h-4" />
                Email Me
              </a>
              <a
                href={founderProfile.social.linkedin}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-[var(--color-border)] text-[var(--color-foreground)] font-medium hover:bg-[var(--color-surface)] transition-colors"
              >
                <LinkedInIcon className="w-4 h-4" />
                LinkedIn
              </a>
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  );
}
