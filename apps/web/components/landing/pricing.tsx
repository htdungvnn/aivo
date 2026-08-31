"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Check, X, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/container";
import { SectionHeader } from "@/components/ui/section-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authNav } from "@aivo/marketing-config";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";
import Link from "next/link";
import { useTranslations } from "next-intl";

interface PlanFeatures {
  name: string;
  included: boolean;
}

interface PricingPlanData {
  id: string;
  name: string;
  tagline: string;
  price: {
    monthly: number | null;
    yearly: number | null;
    lifetime?: number;
  };
  features: PlanFeatures[];
  highlighted?: boolean;
  recommended?: boolean;
  disabled?: boolean;
}

function PricingCard({ plan, billingPeriod }: { plan: PricingPlanData; billingPeriod: "monthly" | "yearly" }) {
  const t = useTranslations("pricing");
  
  const price = billingPeriod === "yearly" ? plan.price.yearly : plan.price.monthly;
  const isLifetime = billingPeriod === "yearly" && plan.price.lifetime !== undefined;
  const displayPrice = isLifetime ? plan.price.lifetime : price;

  const formatPrice = (p: number | null | undefined) => {
    if (p === null || p === undefined) return "Contact";
    if (p === 0) return t("free.price");
    return `$${p}`;
  };

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
            {t("pro.popular")}
          </Badge>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-[var(--color-foreground)] mb-2">
          {t(`${plan.id}.name`)}
        </h3>
        <p className="text-sm text-[var(--color-muted-foreground)] mb-6">
          {t(`${plan.id}.description`)}
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
                    {isLifetime ? "" : billingPeriod === "yearly" ? `/${t("yearly").toLowerCase().replace(" ", "")}` : `/${t("monthly").toLowerCase().slice(0, 2)}`}
                  </span>
                )}
              </div>
              {isLifetime && (
                <p className="text-xs text-[var(--color-muted-foreground)] mt-1">
                  {t("pro.lifetime", { defaultValue: "One-time payment, lifetime access" })}
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
          {t(`${plan.id}.cta`)}
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
  const t = useTranslations("pricing");

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
        {t("monthly")}
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
        {t("yearly")}
        <span className="absolute -top-2 -right-2">
          {period === "yearly" && (
            <Badge variant="success" size="sm">
              {t("yearlyDiscount")}
            </Badge>
          )}
        </span>
      </button>
    </div>
  );
}

export function Pricing() {
  const t = useTranslations("pricing");
  const [billingPeriod, setBillingPeriod] = React.useState<"monthly" | "yearly">("monthly");

  // Get features from translations
  const freeFeatures = t.raw("free.features") as string[];
  const proFeatures = t.raw("pro.features") as string[];
  const teamFeatures = t.raw("team.features") as string[];

  const plans: PricingPlanData[] = [
    {
      id: "free",
      name: t("free.name"),
      tagline: t("free.description"),
      price: { monthly: 0, yearly: 0 },
      features: freeFeatures.map((name) => ({ name, included: true })),
      highlighted: false,
    },
    {
      id: "pro",
      name: t("pro.name"),
      tagline: t("pro.description"),
      price: { monthly: 8, yearly: 79 },
      features: proFeatures.map((name) => ({ name, included: true })),
      highlighted: true,
      recommended: true,
    },
    {
      id: "team",
      name: t("team.name"),
      tagline: t("team.description"),
      price: { monthly: null, yearly: null },
      features: teamFeatures.map((name) => ({ name, included: true })),
      highlighted: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 lg:py-32 relative">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/5 via-transparent to-transparent" />

      <Container className="relative z-10">
        <SectionHeader
          eyebrow="Pricing"
          title={t("title")}
          description={t("subtitle")}
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
          {plans.map((plan: PricingPlanData) => (
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
