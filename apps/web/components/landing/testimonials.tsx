"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Star, AlertCircle } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";
import { useTranslations } from "next-intl";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating
              ? "text-[var(--color-warning)] fill-[var(--color-warning)]"
              : "text-[var(--color-muted)]"
          }`}
        />
      ))}
    </div>
  );
}

interface TestimonialData {
  quote: string;
  author: string;
  role: string;
}

function TestimonialCard({
  quote,
  author,
  role,
}: TestimonialData) {
  return (
    <Card className="p-6 h-full flex flex-col hover:border-[var(--color-border-hover)] transition-colors">
      {/* Stars */}
      <div className="mb-4">
        <StarRating rating={5} />
      </div>

      {/* Content */}
      <blockquote className="text-[var(--color-muted-foreground)] leading-relaxed mb-6 flex-1">
        &ldquo;{quote}&rdquo;
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3 pt-4 border-t border-[var(--color-border)]">
        <Avatar fallback={author} size="sm" />
        <div>
          <p className="font-medium text-[var(--color-foreground)]">{author}</p>
          <p className="text-xs text-[var(--color-tertiary)]">{role}</p>
        </div>
      </div>
    </Card>
  );
}

export function Testimonials() {
  const t = useTranslations("testimonials");

  // Get testimonial items from translations
  const testimonialItems = t.raw("items") as TestimonialData[];

  return (
    <section className="py-24 lg:py-32 bg-[var(--color-surface)]/30">
      <Container>
        <SectionHeader
          eyebrow="Testimonials"
          title={t("title")}
          description={t("subtitle")}
        />

        {/* Testimonial Grid */}
        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {testimonialItems.map((item: TestimonialData, index: number) => (
            <motion.div key={index} variants={createItemVariants()}>
              <TestimonialCard {...item} />
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-[var(--color-tertiary)] mb-4">
            Join our growing community
          </p>
          <div className="flex items-center justify-center gap-8">
            <div>
              <p className="text-3xl font-bold text-[var(--color-foreground)]">
                10K+
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Active Users
              </p>
            </div>
            <div className="w-px h-12 bg-[var(--color-border)]" />
            <div>
              <p className="text-3xl font-bold text-[var(--color-foreground)]">
                4.8
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Average Rating
              </p>
            </div>
            <div className="w-px h-12 bg-[var(--color-border)]" />
            <div>
              <p className="text-3xl font-bold text-[var(--color-foreground)]">
                50+
              </p>
              <p className="text-sm text-[var(--color-muted-foreground)]">
                Countries
              </p>
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}
