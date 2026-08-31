"use client";

import * as React from "react";
import Link from "next/link";
import { Zap, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { useTranslations } from "next-intl";

const iconMap: Record<string, typeof X> = {
  twitter: X,
  instagram: X,
  facebook: X,
  linkedin: X,
};

export function Footer() {
  const t = useTranslations("footer");
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]/50">
      <Container>
        {/* Main Footer */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-8 lg:gap-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-primary)]">
                <Zap className="w-5 h-5 text-[var(--color-primary-foreground)]" />
              </div>
              <span className="text-xl font-bold text-[var(--color-foreground)]">
                AIVO
              </span>
            </Link>
            <p className="text-sm text-[var(--color-muted-foreground)] mb-6 max-w-xs">
              AI-powered health, fitness, and nutrition coaching. Your personal wellness guide, available 24/7.
            </p>

            {/* Social Links */}
            <div className="flex items-center gap-4">
              {[
                { platform: "twitter", url: "https://twitter.com/aivoapp", label: "Follow AIVO on Twitter" },
                { platform: "instagram", url: "https://instagram.com/aivoapp", label: "Follow AIVO on Instagram" },
                { platform: "facebook", url: "https://facebook.com/aivoapp", label: "Follow AIVO on Facebook" },
                { platform: "linkedin", url: "https://linkedin.com/company/aivoapp", label: "Follow AIVO on LinkedIn" },
              ].map((link) => {
                const Icon = iconMap[link.platform] || X;
                return (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    className="flex items-center justify-center w-9 h-9 rounded-lg bg-[var(--color-elevated)] border border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[var(--color-border-hover)] transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="font-semibold text-[var(--color-foreground)] mb-4">
              {t("product")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="#features" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  {t("product")}
                </Link>
              </li>
              <li>
                <Link href="#pricing" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  Pricing
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  {t("mobileApp")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  {t("changelog")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-[var(--color-foreground)] mb-4">
              {t("company")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="#" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  {t("careers")}
                </Link>
              </li>
              <li>
                <Link href="#" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-[var(--color-foreground)] mb-4">
              {t("legal")}
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  {t("cookies")}
                </Link>
              </li>
              <li>
                <Link href="/health-data" className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                  {t("healthData")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-tertiary)]">
            &copy; {currentYear} {t("copyright")}
          </p>
          <div className="flex items-center gap-6 text-sm text-[var(--color-tertiary)]">
            <Link
              href="/privacy"
              className="hover:text-[var(--color-foreground)] transition-colors"
            >
              {t("privacy")}
            </Link>
            <Link
              href="/terms"
              className="hover:text-[var(--color-foreground)] transition-colors"
            >
              {t("terms")}
            </Link>
            <Link
              href="/cookies"
              className="hover:text-[var(--color-foreground)] transition-colors"
            >
              {t("cookies")}
            </Link>
          </div>
        </div>

        {/* Health Disclaimer */}
        <div className="py-6 border-t border-[var(--color-border)]">
          <p className="text-xs text-[var(--color-tertiary)] text-center max-w-3xl mx-auto">
            <strong>Medical Disclaimer:</strong> AIVO provides wellness guidance and does not 
            diagnose medical conditions, provide medical treatment, or replace professional 
            healthcare advice. Always consult a qualified healthcare professional for medical 
            concerns. Individual results may vary.
          </p>
        </div>
      </Container>
    </footer>
  );
}
