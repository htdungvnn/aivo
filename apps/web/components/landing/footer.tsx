"use client";

import * as React from "react";
import Link from "next/link";
import { Zap, X } from "lucide-react";
import { Container } from "@/components/ui/container";
import { footerNav, socialLinks, type SocialLink, type NavSection, type NavItem } from "../../../packages/design-system/src";

const iconMap: Record<string, typeof X> = {
  twitter: X,
  instagram: X,
  facebook: X,
  linkedin: X,
};

export function Footer() {
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
              {socialLinks.map((link: SocialLink) => {
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

          {/* Navigation Columns */}
          {footerNav.map((section: NavSection) => (
            <div key={section.id}>
              <h4 className="font-semibold text-[var(--color-foreground)] mb-4">
                {section.title}
              </h4>
              <ul className="space-y-3">
                {section.items.map((item: NavItem) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="text-sm text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="py-6 border-t border-[var(--color-border)] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-[var(--color-tertiary)]">
            &copy; {currentYear} AIVO. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-[var(--color-tertiary)]">
            <Link
              href="/privacy"
              className="hover:text-[var(--color-foreground)] transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="hover:text-[var(--color-foreground)] transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/cookies"
              className="hover:text-[var(--color-foreground)] transition-colors"
            >
              Cookies
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
