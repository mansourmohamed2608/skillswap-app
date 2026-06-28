'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { fadeUp, useReducedMotionFallback } from '@/lib/motion';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduced = useReducedMotion();
  const variants = useReducedMotionFallback(reduced ?? false, fadeUp);

  return (
    <motion.div
      className={cn(className)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={variants}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
