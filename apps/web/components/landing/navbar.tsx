"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "./button";
import { Container } from "./container";
import { CloseIcon, MenuIcon } from "./icons";

const NAV_LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#ai-coach", label: "AI Coach" },
  { href: "#nutrition", label: "Nutrition" },
] as const;

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || menuOpen
          ? "border-b border-hairline bg-ink/80 backdrop-blur-xl"
          : "border-b border-transparent"
      }`}
    >
      <Container>
        <nav
          aria-label="Main"
          className="flex h-16 items-center justify-between gap-4 sm:h-20"
        >
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
          >
            <span
              aria-hidden="true"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-sm font-black text-primary-ink"
            >
              A
            </span>
            AIVO
          </Link>

          <ul className="hidden items-center gap-8 lg:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/sign-in"
              className="rounded-full px-4 py-2 text-sm font-medium text-text-secondary transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Sign In
            </Link>
            <Button href="/sign-up" size="md">
              Start Free
            </Button>
          </div>

          <div className="flex items-center gap-2 lg:hidden">
            <Button href="/sign-up" size="sm" className="h-10 px-4">
              Start Free
            </Button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-hairline bg-white/5 text-text transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {menuOpen ? <CloseIcon /> : <MenuIcon />}
            </button>
          </div>
        </nav>
      </Container>

      {menuOpen ? (
        <div id="mobile-menu" className="border-t border-hairline bg-ink/95 backdrop-blur-xl lg:hidden">
          <Container>
            <ul className="flex flex-col py-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className="block rounded-lg px-2 py-3 text-base font-medium text-text-secondary transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/sign-in"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-2 py-3 text-base font-medium text-text-secondary transition-colors duration-200 hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Sign In
                </Link>
              </li>
              <li className="px-2 py-2">
                <Button href="/sign-up" size="md" className="w-full">
                  Start Free
                </Button>
              </li>
            </ul>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
