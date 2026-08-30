"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Eye,
  Server,
  Key,
  FileCheck,
  UserCheck,
  Trash2,
} from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";

const privacyFeatures = [
  {
    icon: Lock,
    title: "End-to-End Encryption",
    description: "Your data is encrypted in transit and at rest using industry-standard AES-256 encryption.",
  },
  {
    icon: Eye,
    title: "No Data Selling",
    description: "We never sell your personal or health data to advertisers, data brokers, or third parties.",
  },
  {
    icon: UserCheck,
    title: "You Own Your Data",
    description: "Your health data belongs to you. Export anytime or delete your account and data completely.",
  },
  {
    icon: Key,
    title: "Secure Authentication",
    description: "OAuth 2.0 with PKCE for secure sign-in. No passwords stored on our servers.",
  },
  {
    icon: Server,
    title: "Minimal Data Collection",
    description: "We collect only what's necessary to provide the service. No tracking pixels or ads.",
  },
  {
    icon: FileCheck,
    title: "Transparent Practices",
    description: "Clear privacy policy, easy-to-understand terms, and no hidden clauses.",
  },
];

export function Privacy() {
  return (
    <section className="py-24 lg:py-32 bg-[var(--color-surface)]/30">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Content */}
          <div>
            <SectionHeader
              eyebrow="Privacy & Security"
              title="Your health data stays private"
              description="We believe your personal health information is sensitive and deserves strong protection. AIVO is built with privacy-first principles."
              badge="No Medical Data Selling"
              badgeVariant="default"
              className="text-left mb-0"
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-8 space-y-6"
            >
              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-success)]/10 text-[var(--color-success)] shrink-0">
                  <Shield className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-foreground)] mb-2">
                    Health Data Protection
                  </h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Your health metrics, meal logs, and AI conversations are protected with the same care 
                    we&apos;d want for our own data. We follow security best practices and continuously audit our systems.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-semibold text-[var(--color-foreground)] mb-2">
                    Full Data Control
                  </h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Want to leave? Download all your data anytime in JSON or CSV format. 
                    Request complete account deletion and we&apos;ll remove everything within 30 days.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Column - Feature Grid */}
          <motion.div
            variants={staggerContainerVariants}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            {privacyFeatures.map((feature) => (
              <motion.div key={feature.title} variants={createItemVariants()}>
                <Card className="p-5 h-full hover:border-[var(--color-border-hover)] transition-colors">
                  <feature.icon className="w-6 h-6 text-[var(--color-primary)] mb-3" />
                  <h4 className="font-medium text-[var(--color-foreground)] mb-1">
                    {feature.title}
                  </h4>
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-12 p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
        >
          <p className="text-sm text-[var(--color-muted-foreground)] text-center">
            <strong className="text-[var(--color-foreground)]">Important:</strong>{" "}
            While we implement strong security measures, no system is completely invulnerable. 
            We encourage users to enable two-factor authentication and use strong OAuth provider credentials. 
            Review our full{" "}
            <a href="/privacy" className="text-[var(--color-primary)] hover:underline">
              Privacy Policy
            </a>{" "}
            and{" "}
            <a href="/health-data" className="text-[var(--color-primary)] hover:underline">
              Health Data Policy
            </a>{" "}
            for complete details.
          </p>
        </motion.div>
      </Container>
    </section>
  );
}
