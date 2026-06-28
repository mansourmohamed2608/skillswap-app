'use client';

import { motion, useReducedMotion } from 'framer-motion';

const CHIPS = [
  { label: 'Design', x: 12, y: 8, delay: 0 },
  { label: 'Photo', x: 72, y: 4, delay: 0.4 },
  { label: 'Dev', x: 78, y: 68, delay: 0.8 },
];

export function HeroIllustration() {
  const reduced = useReducedMotion();

  return (
    <div className="relative mx-auto w-full max-w-[280px] sm:max-w-xs" aria-hidden="true">
      <svg viewBox="0 0 320 220" className="h-auto w-full" role="presentation">
        <defs>
          <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#739b7a" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#d4642f" stopOpacity="0.1" />
          </linearGradient>
          <filter id="heroShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.12" />
          </filter>
        </defs>

        <ellipse cx="160" cy="200" rx="120" ry="12" fill="#3f7752" opacity="0.08" />

        {/* Design skill card */}
        <g filter="url(#heroShadow)">
          <rect x="24" y="48" width="96" height="72" rx="14" fill="#fffdf0" stroke="#3f7752" strokeWidth="1.5" />
          <circle cx="48" cy="72" r="10" fill="#d4642f" opacity="0.7" />
          <circle cx="68" cy="68" r="10" fill="#3f7752" opacity="0.6" />
          <circle cx="88" cy="76" r="10" fill="#739b7a" opacity="0.55" />
          <text x="72" y="102" textAnchor="middle" fontSize="10" fill="#3f7752" fontWeight="600">Branding</text>
        </g>

        {/* Photography skill card */}
        <g filter="url(#heroShadow)">
          <rect x="200" y="48" width="96" height="72" rx="14" fill="#fffdf0" stroke="#d4642f" strokeWidth="1.5" />
          <rect x="220" y="64" width="56" height="36" rx="6" fill="#2d4a38" />
          <circle cx="248" cy="82" r="10" fill="#739b7a" stroke="#fff" strokeWidth="1.5" />
          <text x="248" y="102" textAnchor="middle" fontSize="10" fill="#d4642f" fontWeight="600">Photography</text>
        </g>

        {/* Connection line */}
        <motion.path
          d="M120 84 C150 84, 170 84, 200 84"
          stroke="#3f7752"
          strokeWidth="2"
          strokeDasharray="5 4"
          fill="none"
          animate={reduced ? undefined : { strokeDashoffset: [0, -18] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}
        />

        {/* Swap hub */}
        <motion.g
          animate={reduced ? undefined : { rotate: [0, 8, -8, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: '160px 84px' }}
        >
          <circle cx="160" cy="84" r="18" fill="#3f7752" />
          <path d="M152 84h16M160 76v16" stroke="#fffdf0" strokeWidth="2" strokeLinecap="round" />
          <path d="M154 80l6 4-6 4M166 80l-6 4 6 4" stroke="#fffdf0" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </motion.g>

        {/* User avatars */}
        <circle cx="72" cy="148" r="16" fill="#739b7a" opacity="0.25" />
        <circle cx="72" cy="148" r="10" fill="#3f7752" />
        <text x="72" y="152" textAnchor="middle" fontSize="9" fill="#fffdf0">A</text>

        <circle cx="248" cy="148" r="16" fill="#d4642f" opacity="0.2" />
        <circle cx="248" cy="148" r="10" fill="#d4642f" />
        <text x="248" y="152" textAnchor="middle" fontSize="9" fill="#fff">B</text>

        <motion.path
          d="M88 148 Q160 128 232 148"
          stroke="#739b7a"
          strokeWidth="1.5"
          fill="none"
          strokeDasharray="4 3"
          animate={reduced ? undefined : { opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 3, repeat: Infinity }}
        />

        <rect x="40" y="168" width="240" height="36" rx="12" fill="url(#heroGrad)" />
        <text x="160" y="190" textAnchor="middle" fontSize="10" fill="#3f7752" fontWeight="500">
          Skill exchange • Community swap
        </text>
      </svg>

      {CHIPS.map((chip) => (
        <motion.span
          key={chip.label}
          className="absolute rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#3f7752] shadow-sm"
          style={{ left: `${chip.x}%`, top: `${chip.y}%` }}
          animate={reduced ? undefined : { y: [0, -4, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, delay: chip.delay, ease: 'easeInOut' }}
        >
          {chip.label}
        </motion.span>
      ))}
    </div>
  );
}
