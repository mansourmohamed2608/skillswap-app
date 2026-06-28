'use client';

import type { Variants, Transition } from 'framer-motion';

export const spring: Transition = { type: 'spring', stiffness: 380, damping: 32 };

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: spring },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.35 } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
};

export const scaleTap = { whileTap: { scale: 0.97 }, whileHover: { scale: 1.02 } };

export function useReducedMotionFallback(reduced: boolean, variants: Variants): Variants {
  if (!reduced) return variants;
  return {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.01 } },
  };
}
