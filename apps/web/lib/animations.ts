/**
 * Animation utilities for Framer Motion
 */

import type { Variants, Transition } from "framer-motion";

// Custom easing presets
export const EASING = {
  outExpo: [0.16, 1, 0.3, 1] as const,
  outBack: [0.34, 1.56, 0.64, 1] as const,
  spring: [0.175, 0.885, 0.32, 1.275] as const,
} as const;

// Animation durations
export const DURATION = {
  fast: 0.15,
  normal: 0.3,
  slow: 0.5,
  slower: 0.7,
} as const;

// Common fade in up animation
export const fadeInUpVariants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

// Stagger container
export const staggerContainerVariants: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

// Fade in scale variants
export const fadeInScaleVariants: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
};

// Slide in from right
export const slideInRightVariants: Variants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
};

// Create a transition with custom easing
export function createTransition(
  duration: number = 0.5,
  ease: readonly [number, number, number, number] = EASING.outExpo
): Transition {
  return {
    duration,
    ease,
  };
}

// Create item variants with stagger
export function createItemVariants(delay: number = 0): Variants {
  return {
    initial: { opacity: 0, y: 30 },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: EASING.outExpo,
        delay,
      },
    },
  };
}
