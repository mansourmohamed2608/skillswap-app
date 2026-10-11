'use client';

import { motion } from 'framer-motion';
import { fadeUp } from '@/lib/motion';
import { cn } from '@/lib/utils';

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  return (
    <motion.div
      className={cn(className)}
      initial={false}
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={fadeUp}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}
