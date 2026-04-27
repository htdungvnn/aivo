"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SkipLinkProps {
  targetId: string;
  className?: string;
}

export function SkipLink({ targetId, className }: SkipLinkProps) {
  return (
    <a
      href={`#${targetId}`}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50",
        "px-4 py-2 bg-cyan-500 text-white font-semibold rounded",
        "focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2",
        className
      )}
    >
      Skip to main content
    </a>
  );
}

// Focus trap for modals and dialogs
export function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLElement>) {
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) {
      return;
    }

    // Store the currently focused element
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the container
    containerRef.current.focus();

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener("keydown", handleTabKey);

    return () => {
      document.removeEventListener("keydown", handleTabKey);
      // Restore focus
      previousFocusRef.current?.focus();
    };
  }, [isActive, containerRef]);
}

// Announce live regions for screen readers
export function LiveAnnouncer({ message, priority = "polite" }: { message: string; priority?: "polite" | "assertive" }) {
  const announcerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (announcerRef.current && message) {
      announcerRef.current.textContent = message;
      // Clear after announcement
      const timer = setTimeout(() => {
        if (announcerRef.current) {
          announcerRef.current.textContent = "";
        }
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div
      ref={announcerRef}
      role="status"
      aria-live={priority}
      aria-atomic="true"
      className="sr-only"
    />
  );
}

// Reduced motion hook
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}

// Icon with proper accessibility
interface AccessibleIconProps {
  children: React.ReactNode;
  label: string;
  className?: string;
}

export function AccessibleIcon({ children, label, className }: AccessibleIconProps) {
  return (
    <span className={className} aria-hidden="true">
      {children}
      <span className="sr-only">{label}</span>
    </span>
  );
}

// Import useState for the hook
import { useState } from "react";
