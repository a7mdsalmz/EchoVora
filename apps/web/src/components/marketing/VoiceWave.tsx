"use client";

import { motion } from "framer-motion";

export function VoiceWave({ className }: { className?: string }) {
  return (
    <div className={className}>
      <svg viewBox="0 0 1200 320" className="h-full w-full">
        <defs>
          <linearGradient id="ev-wave" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="var(--purple)" stopOpacity="0.9" />
            <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--accent2)" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="ev-glow" cx="50%" cy="50%" r="60%">
            <stop offset="0%" stopColor="var(--accent2)" stopOpacity="0.22" />
            <stop offset="55%" stopColor="var(--accent)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="var(--purple)" stopOpacity="0" />
          </radialGradient>
          <filter id="ev-blur" x="-20%" y="-40%" width="140%" height="180%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
        </defs>

        <circle cx="620" cy="160" r="140" fill="url(#ev-glow)" filter="url(#ev-blur)" />
        <circle cx="620" cy="160" r="220" fill="url(#ev-glow)" opacity="0.7" filter="url(#ev-blur)" />

        <motion.path
          d="M0 170 C 120 120, 220 240, 340 170 S 560 120, 680 170 S 900 240, 1020 170 S 1120 120, 1200 170"
          fill="none"
          stroke="url(#ev-wave)"
          strokeWidth="6"
          strokeLinecap="round"
          initial={{ pathLength: 0.2, opacity: 0.4 }}
          animate={{ pathLength: [0.2, 1, 0.4], opacity: [0.4, 1, 0.55] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.path
          d="M0 170 C 120 200, 220 80, 340 170 S 560 220, 680 170 S 900 80, 1020 170 S 1120 220, 1200 170"
          fill="none"
          stroke="url(#ev-wave)"
          strokeWidth="2"
          strokeOpacity="0.75"
          strokeLinecap="round"
          initial={{ pathLength: 0.1, opacity: 0.25 }}
          animate={{ pathLength: [0.1, 1, 0.3], opacity: [0.25, 0.7, 0.3] }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut", delay: 0.6 }}
        />

        <motion.circle
          cx="620"
          cy="160"
          r="54"
          fill="none"
          stroke="var(--accent2)"
          strokeOpacity="0.45"
          strokeWidth="2"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: [0.9, 1.18, 1.34], opacity: [0, 0.55, 0] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
        />
        <motion.circle
          cx="620"
          cy="160"
          r="86"
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.35"
          strokeWidth="2"
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: [0.85, 1.22, 1.45], opacity: [0, 0.5, 0] }}
          transition={{ duration: 4.1, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
        />
      </svg>
    </div>
  );
}

