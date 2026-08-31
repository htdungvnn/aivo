"use client";

import * as React from "react";
import Link from "next/link";
import { Menu, X, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { mainNav, authNav } from "@repo/design-system";
import { cn } from "@/lib/utils";
import { staggerContainerVariants, createItemVariants } from "@/lib/animations";
import type { NavItem } from "@repo/design-system";
import { useTranslations, useLocale } from "next-intl";
import { LanguageSwitcher } from "@/components/shared/language-switcher";

export function Navigation() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const t = useTranslations("nav");
  const locale = useLocale();

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Navigation items with translations
  const navItems: NavItem[] = [
    { id: "features", label: t("features"), href: "#features" },
    { id: "how-it-works", label: t("howItWorks"), href: "#how-it-works" },
    { id: "pricing", label: t("pricing"), href: "#pricing" },
    { id: "faq", label: t("faq"), href: "#faq" },
  ];

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[var(--color-background)]/95 backdrop-blur-md border-b border-[var(--color-border)] shadow-[var(--shadow-sm)]"
          : "bg-transparent"
      )}
    >
      <Container>
        <nav className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-foreground)] hover:text-[var(--color-primary)] transition-colors"
          >
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--color-primary)]">
              <Zap className="w-5 h-5 text-[var(--color-primary-foreground)]" />
            </div>
            <span className="text-xl font-bold tracking-tight">AIVO</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navItems.map((item: NavItem) => (
              <Link
                key={item.id}
                href={item.href}
                className="text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop CTA & Language */}
          <div className="hidden lg:flex items-center gap-4">
            <LanguageSwitcher />
            <Link href={authNav.signIn.href}>
              <Button variant="ghost" size="sm">
                {authNav.signIn.label}
              </Button>
            </Link>
            <Link href={authNav.signUp.href}>
              <Button size="sm">
                {authNav.signUp.label}
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            aria-label={isOpen ? t("closeMenu") : t("openMenu")}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </nav>
      </Container>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden bg-[var(--color-surface)] border-b border-[var(--color-border)]"
          >
            <Container className="py-4">
              <motion.div
                variants={staggerContainerVariants}
                initial="initial"
                animate="animate"
                className="flex flex-col gap-4"
              >
                {navItems.map((item: NavItem) => (
                  <motion.div key={item.id} variants={createItemVariants()}>
                    <Link
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className="text-base font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors py-2 block"
                    >
                      {item.label}
                    </Link>
                  </motion.div>
                ))}
                <div className="flex flex-col gap-3 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex justify-center">
                    <LanguageSwitcher />
                  </div>
                  <Link href={authNav.signIn.href} onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full">
                      {authNav.signIn.label}
                    </Button>
                  </Link>
                  <Link href={authNav.signUp.href} onClick={() => setIsOpen(false)}>
                    <Button className="w-full">
                      {authNav.signUp.label}
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </Container>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
