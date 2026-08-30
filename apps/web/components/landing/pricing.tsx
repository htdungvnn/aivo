"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, X, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  pricingPlans,
  formatPrice,
  getYearlySavings,
  authNav,
  type PricingPlan,
} from "../../../packages/design-system/src";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";
import Link from "next/link";

interface PricingCardProps {
  plan: PricingPlan;
  billingPeriod: "monthly" | "yearly";
}

function PricingCard({ plan, billingPeriod }: PricingCardProps) {
  const price =
    billingPeriod === "yearly"
      ? plan.price.yearly
      : plan.price.monthly;
  const isLifetime = billingPeriod === "yearly" && plan.price.lifetime !== undefined;
  const displayPrice = isLifetime ? plan.price.lifetime : price;
  const yearlySavings =
    plan.id === "pro" && billingPeriod === "yearly"
      ? getYearlySavings(plan.price.monthly!, plan.price.yearly!)
      : 0;

  return (
    <Card
      variant={plan.highlighted ? "elevated" : "default"}
      className={`relative p-8 ${
        plan.recommended
          ? "border-[var(--color-primary)] shadow-[var(--shadow-lg)] ring-1 ring-[var(--color-primary)]/20"
          : ""
      }`}
    >
      {/* Recommended Badge */}
      {plan.recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge variant="primary" className="gap-1">
            <Sparkles className="w-3 h-3" />
            Recommended
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
          {plan.name}
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-6">
          {plan.tagline}
        </p>

        {/* Price */}
        <div className="mb-4">
          {displayPrice !== null ? (
            <>
              <div className="flex items-center justify-center gap-1">
                <span className="text-4xl font-bold text-[var(--color-foreground)]">
                  {formatPrice(displayPrice)}
                </span>
                {displayPrice !== 0 && (
                  <span className="text-[var(--color-muted-foreground)]">
                    {isLifetime
                      ? ""
                      : billingPeriod === "yearly"
                        ? "/year"
                        : "/mo"}
                  </span>
                )}
              </div>
              {yearlySavings > 0 && billingPeriod === "yearly" && (
                <p className="text-xs text-[var(--color-success)] mt-1">
                  Save {yearlySavings}% vs monthly
                </p>
              )}
              {isLifetime && (
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  One-time payment, lifetime access
                </p>
              )}
            </>
          ) : (
            <span className="text-4xl font-bold text-[var(--color-foreground)]">
              Contact Us
            </span>
          )}
        </div>
      </div>

      {/* CTA */}
      <Link href={authNav.signUp.href} className="block mb-8">
        <Button
          className="w-full"
          variant={plan.recommended ? "default" : "outline"}
          size="lg"
          disabled={plan.disabled}
        >
          {plan.cta}
        </Button>
      </Link>

      {/* Features */}
      <ul className="space-y-4">
        {plan.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            {feature.included ? (
              <Check className="w-5 h-5 text-[var(--color-success)] shrink-0 mt-0.5" />
            ) : (
              <X className="w-5 h-5 text-[var(--color-tertiary)] shrink-0 mt-0.5" />
            )}
            <div className="flex-1">
              <span
                className={`text-sm ${
                  feature.included
                    ? "text-[var(--color-foreground)]"
                    : "text-[var(--color-tertiary)]"
                }`}
              >
                {feature.name}
              </span>
              {feature.description && (
                <p className="text-xs text-[var(--color-muted-foreground)] mt-0.5">
                  {feature.description}
                </p>
              )}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function BillingToggle({
  period,
  onChange,
}: {
  period: "monthly" | "yearly";
  onChange: (period: "monthly" | "yearly") => void;
}) {
  return (
    <div className="flex items-center justify-center gap-4 mb-12">
      <button
        type="button"
        onClick={() => onChange("monthly")}
        className={`text-sm font-medium transition-colors ${
          period === "monthly"
            ? "text-[var(--color-foreground)]"
            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("yearly")}
        className={`relative px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
          period === "yearly"
            ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)]"
            : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        }`}
      >
        Yearly
        <span className="absolute -top-2 -right-2">
          {period === "yearly" && (
            <Badge variant="success" size="sm">
              -25%
            </Badge>
          )}
        </span>
      </button>
    </div>
  );
}

export function Pricing() {
  const [billingPeriod, setBillingPeriod] = React.useState<"monthly" | "yearly">(
    "monthly"
  );

  return (
    <section id="pricing" className="py-24 lg:py-32 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/5 via-transparent to-transparent" />

      <Container className="relative z-10">
        <SectionHeader
          eyebrow="Pricing"
          title="Simple, transparent pricing"
          description="Start free, upgrade when you&apos;re ready. No hidden fees, cancel anytime."
          badge="Free to Start"
          badgeVariant="primary"
        />

        {/* Billing Toggle */}
        <BillingToggle period={billingPeriod} onChange={setBillingPeriod} />

        {/* Pricing Cards */}
        <motion.div
          variants={staggerContainerVariants}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true, margin: "-50px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto"
        >
          {pricingPlans.map((plan: PricingPlan) => (
            <motion.div key={plan.id} variants={createItemVariants()}>
              <PricingCard plan={plan} billingPeriod={billingPeriod} />
            </motion.div>
          ))}
        </motion.div>

        {/* Footer Note */}
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-center text-sm text-[var(--color-muted-foreground)] mt-12"
        >
          All prices in USD. Prices shown are per account. Taxes may apply based on your location.
        </motion.p>
      </Container>
    </section>
  );
}
