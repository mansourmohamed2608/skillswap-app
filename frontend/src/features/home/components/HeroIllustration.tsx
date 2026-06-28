'use client';

import { motion, useReducedMotion } from 'framer-motion';

export function HeroIllustration() {
  const reduced = useReducedMotion();

  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-md" aria-hidden="true">
      <svg viewBox="0 0 400 300" className="h-full w-full" role="presentation">
        <defs>
          <linearGradient id="heroBg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#739b7a" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#d4642f" stopOpacity="0.15" />
          </linearGradient>
        </defs>
        <rect x="20" y="20" width="360" height="260" rx="24" fill="url(#heroBg)" />
        <motion.circle
          cx="120" cy="110" r="36"
          fill="#fffdf0" stroke="#3f7752" strokeWidth="2"
          animate={reduced ? undefined : { y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
        <text x="120" y="116" textAnchor="middle" fontSize="11" fill="#3f7752" fontWeight="600">Design</text>
        <motion.circle
          cx="280" cy="110" r="36"
          fill="#fffdf0" stroke="#d4642f" strokeWidth="2"
          animate={reduced ? undefined : { y: [0, 6, 0] }}
          transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        <text x="280" y="116" textAnchor="middle" fontSize="11" fill="#d4642f" fontWeight="600">Photo</text>
        <motion.path
          d="M156 110 H244"
          stroke="#3f7752"
          strokeWidth="2"
          strokeDasharray="6 4"
          animate={reduced ? undefined : { strokeDashoffset: [0, -20] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        />
        <circle cx="200" cy="110" r="14" fill="#3f7752" />
        <path d="M195 110h10M200 105v10" stroke="#fffdf0" strokeWidth="2" strokeLinecap="round" />
        <rect x="70" y="170" width="120" height="72" rx="12" fill="#fffdf0" stroke="#c8d5b9" />
        <text x="130" y="198" textAnchor="middle" fontSize="10" fill="#3f7752">I offer branding</text>
        <text x="130" y="218" textAnchor="middle" fontSize="10" fill="#739b7a">I need photography</text>
        <rect x="210" y="170" width="120" height="72" rx="12" fill="#fffdf0" stroke="#c8d5b9" />
        <text x="270" y="198" textAnchor="middle" fontSize="10" fill="#3f7752">Community swap</text>
        <text x="270" y="218" textAnchor="middle" fontSize="10" fill="#739b7a">Open for exchange</text>
      </svg>
    </div>
  );
}
