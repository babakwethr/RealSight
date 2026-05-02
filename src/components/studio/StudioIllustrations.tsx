/**
 * StudioIllustrations — four on-brand 2D illustrations for the Studio
 * card grid. Pure SVG + CSS gradients + Framer Motion. No external
 * assets, no fonts, no third-party dependencies.
 *
 * Each illustration:
 *   - Visually communicates what the tool does
 *   - Uses the V3 brand palette (mint / gold / violet / cobalt)
 *   - Animates on parent's `whileHover` via Framer Motion variants
 *   - Sits inside a glass-panel card at any size (uses viewBox + `w-full h-full`)
 *
 * Animation pattern: each illustration declares its own `variants`
 * with `rest` and `hover` states. The parent <ToolCard> sets
 * `whileHover="hover"` and `initial="rest"`, and motion children
 * subscribe via `variants={{}}` + `animate` inheritance.
 */

import { motion } from 'framer-motion';
import type { StudioIllustrationId, StudioTone } from '@/data/studioTools';
import { TONE_PALETTE } from '@/data/studioTools';

export interface StudioIllustrationProps {
  id: StudioIllustrationId;
  tone: StudioTone;
}

export function StudioIllustration({ id, tone }: StudioIllustrationProps) {
  const palette = TONE_PALETTE[tone];

  switch (id) {
    case 'presentation': return <PresentationArt accent={palette.accent} />;
    case 'social':       return <SocialArt accent={palette.accent} />;
    case 'video':        return <VideoArt accent={palette.accent} />;
    case 'matcher':      return <MatcherArt accent={palette.accent} />;
  }
}

// ──────────────────────────────────────────────────────────────────────
// 01 · PresentationArt — stacked slide cards, top slide shows chart bars
// ──────────────────────────────────────────────────────────────────────

function PresentationArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 240 140" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="pres-slide-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"  stopColor="#1A2540" />
          <stop offset="100%" stopColor="#0E1830" />
        </linearGradient>
        <radialGradient id="pres-glow" cx="0.5" cy="1.05" r="0.7">
          <stop offset="0%"  stopColor={accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Mint glow under the stack */}
      <ellipse cx="120" cy="125" rx="78" ry="14" fill="url(#pres-glow)" />

      {/* Bottom slide */}
      <motion.g
        variants={{ rest: { rotate: -3, x: -10, y: 4 }, hover: { rotate: -7, x: -22, y: 8 } }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: '120px 90px' }}
      >
        <rect x="62" y="38" width="116" height="74" rx="8" fill="url(#pres-slide-grad)" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
        <rect x="72" y="50" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.18)" />
        <rect x="72" y="58" width="60" height="2" rx="1" fill="rgba(255,255,255,0.10)" />
      </motion.g>

      {/* Middle slide */}
      <motion.g
        variants={{ rest: { rotate: 0, x: 0, y: 0 }, hover: { rotate: 0, x: 0, y: -1 } }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: '120px 80px' }}
      >
        <rect x="62" y="32" width="116" height="74" rx="8" fill="url(#pres-slide-grad)" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        <rect x="72" y="44" width="50" height="3" rx="1.5" fill="rgba(255,255,255,0.20)" />
        <rect x="72" y="52" width="70" height="2" rx="1" fill="rgba(255,255,255,0.10)" />
      </motion.g>

      {/* Top slide — features chart bars + sparkle */}
      <motion.g
        variants={{ rest: { rotate: 3, x: 10, y: -4 }, hover: { rotate: 5, x: 22, y: -10 } }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: '120px 70px' }}
      >
        <rect x="62" y="26" width="116" height="74" rx="8" fill="url(#pres-slide-grad)" stroke={accent} strokeOpacity="0.35" strokeWidth="1" />
        {/* Title bar */}
        <rect x="72" y="36" width="38" height="3" rx="1.5" fill="rgba(255,255,255,0.85)" />
        {/* Chart bars */}
        <rect x="72" y="62" width="8"  height="28" rx="1.5" fill={accent} fillOpacity="0.85" />
        <rect x="84" y="54" width="8"  height="36" rx="1.5" fill={accent} fillOpacity="0.55" />
        <rect x="96" y="68" width="8"  height="22" rx="1.5" fill={accent} fillOpacity="0.70" />
        <rect x="108" y="46" width="8" height="44" rx="1.5" fill={accent} />
        <rect x="120" y="58" width="8" height="32" rx="1.5" fill={accent} fillOpacity="0.65" />
        {/* Sparkle accent */}
        <motion.g
          variants={{ rest: { scale: 1, opacity: 0.85 }, hover: { scale: 1.25, opacity: 1 } }}
          transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ transformOrigin: '160px 60px' }}
        >
          <path d="M160 50 L162 58 L170 60 L162 62 L160 70 L158 62 L150 60 L158 58 Z" fill={accent} />
        </motion.g>
      </motion.g>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 02 · SocialArt — phone with floating social tiles around it
// ──────────────────────────────────────────────────────────────────────

function SocialArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 240 140" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="social-phone-grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1A2540" />
          <stop offset="100%" stopColor="#0B1322" />
        </linearGradient>
        <radialGradient id="social-glow" cx="0.5" cy="1" r="0.6">
          <stop offset="0%"  stopColor={accent} stopOpacity="0.45" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Glow under phone */}
      <ellipse cx="120" cy="120" rx="60" ry="10" fill="url(#social-glow)" />

      {/* Floating tile — top-left (square / IG feed) */}
      <motion.g
        variants={{ rest: { x: 0, y: 0, opacity: 0.85 }, hover: { x: -10, y: -6, opacity: 1 } }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <rect x="42" y="34" width="34" height="34" rx="6"
              fill="rgba(255,255,255,0.04)"
              stroke={accent} strokeOpacity="0.55" strokeWidth="1" />
        <circle cx="50" cy="42" r="2.5" fill={accent} fillOpacity="0.7" />
        <rect x="48" y="50" width="22" height="14" rx="2" fill={accent} fillOpacity="0.18" />
      </motion.g>

      {/* Floating tile — top-right (story 9:16) */}
      <motion.g
        variants={{ rest: { x: 0, y: 0, opacity: 0.85 }, hover: { x: 10, y: -8, opacity: 1 } }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }}
      >
        <rect x="170" y="22" width="22" height="40" rx="4"
              fill="rgba(255,255,255,0.04)"
              stroke={accent} strokeOpacity="0.55" strokeWidth="1" />
        <rect x="174" y="28" width="14" height="3" rx="1.5" fill={accent} fillOpacity="0.7" />
        <rect x="174" y="35" width="10" height="2" rx="1" fill="rgba(255,255,255,0.25)" />
      </motion.g>

      {/* Floating tile — bottom-right (LinkedIn 16:9) */}
      <motion.g
        variants={{ rest: { x: 0, y: 0, opacity: 0.85 }, hover: { x: 10, y: 6, opacity: 1 } }}
        transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
      >
        <rect x="158" y="80" width="42" height="24" rx="4"
              fill="rgba(255,255,255,0.04)"
              stroke={accent} strokeOpacity="0.55" strokeWidth="1" />
        <rect x="163" y="85" width="22" height="3" rx="1.5" fill={accent} fillOpacity="0.7" />
        <rect x="163" y="91" width="32" height="2" rx="1" fill="rgba(255,255,255,0.20)" />
        <rect x="163" y="96" width="20" height="2" rx="1" fill="rgba(255,255,255,0.12)" />
      </motion.g>

      {/* Phone — centred */}
      <motion.g
        variants={{ rest: { y: 0 }, hover: { y: -2 } }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        {/* Phone body */}
        <rect x="98" y="22" width="44" height="84" rx="9"
              fill="url(#social-phone-grad)"
              stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
        {/* Phone notch */}
        <rect x="114" y="26" width="12" height="2" rx="1" fill="rgba(255,255,255,0.15)" />
        {/* Phone screen content — branded "post" preview */}
        <rect x="103" y="32" width="34" height="40" rx="3"
              fill={accent} fillOpacity="0.18" />
        <rect x="106" y="38" width="20" height="2.5" rx="1.25" fill={accent} fillOpacity="0.85" />
        <rect x="106" y="44" width="28" height="1.5" rx="0.75" fill="rgba(255,255,255,0.30)" />
        <rect x="106" y="48" width="24" height="1.5" rx="0.75" fill="rgba(255,255,255,0.25)" />
        {/* "Brand" pill */}
        <rect x="106" y="80" width="28" height="6" rx="3" fill={accent} fillOpacity="0.7" />
        {/* Action line at bottom */}
        <line x1="103" y1="97" x2="137" y2="97" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        {/* Home indicator */}
        <rect x="113" y="100" width="14" height="1.5" rx="0.75" fill="rgba(255,255,255,0.25)" />
      </motion.g>
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 03 · VideoArt — film frame with play triangle + aperture rings
// ──────────────────────────────────────────────────────────────────────

function VideoArt({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 240 140" className="w-full h-full" aria-hidden>
      <defs>
        <radialGradient id="video-glow" cx="0.5" cy="0.5" r="0.55">
          <stop offset="0%"  stopColor={accent} stopOpacity="0.45" />
          <stop offset="60%" stopColor={accent} stopOpacity="0.1" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </radialGradient>
        <linearGradient id="video-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"  stopColor="#1A2540" />
          <stop offset="100%" stopColor="#0B1322" />
        </linearGradient>
      </defs>

      {/* Aperture rings — pulse outward on hover */}
      <motion.circle
        cx="120" cy="70" r="46"
        fill="none" stroke={accent} strokeOpacity="0.18" strokeWidth="1"
        variants={{ rest: { scale: 1, opacity: 0.18 }, hover: { scale: 1.18, opacity: 0 } }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatType: 'loop' }}
        style={{ transformOrigin: '120px 70px' }}
      />
      <motion.circle
        cx="120" cy="70" r="38"
        fill="none" stroke={accent} strokeOpacity="0.28" strokeWidth="1"
        variants={{ rest: { scale: 1, opacity: 0.28 }, hover: { scale: 1.18, opacity: 0 } }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], repeat: Infinity, repeatType: 'loop', delay: 0.2 }}
        style={{ transformOrigin: '120px 70px' }}
      />

      {/* Soft glow */}
      <circle cx="120" cy="70" r="40" fill="url(#video-glow)" />

      {/* Film frame — rounded with "perforation" notches on left/right */}
      <motion.g
        variants={{ rest: { scale: 1 }, hover: { scale: 1.04 } }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: '120px 70px' }}
      >
        {/* Frame body */}
        <rect x="76" y="36" width="88" height="68" rx="8"
              fill="url(#video-frame)"
              stroke={accent} strokeOpacity="0.5" strokeWidth="1" />
        {/* Perforations — subtle film aesthetic */}
        {[44, 56, 68, 80, 92].map(y => (
          <g key={y}>
            <rect x="80" y={y} width="3" height="4" rx="0.8" fill="rgba(255,255,255,0.10)" />
            <rect x="157" y={y} width="3" height="4" rx="0.8" fill="rgba(255,255,255,0.10)" />
          </g>
        ))}
        {/* Play triangle */}
        <path d="M112 56 L112 84 L138 70 Z" fill={accent} />
      </motion.g>

      {/* Scanline sweep — only on hover */}
      <motion.line
        x1="78" x2="162" y1="42" y2="42"
        stroke={accent} strokeOpacity="0.6" strokeWidth="1"
        variants={{ rest: { y1: 36, y2: 36, opacity: 0 }, hover: { y1: 102, y2: 102, opacity: [0, 0.8, 0] } }}
        transition={{ duration: 1.2, ease: 'linear', repeat: Infinity, repeatType: 'loop' }}
      />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────
// 04 · MatcherArt — central node + 4 satellites with connecting lines
// ──────────────────────────────────────────────────────────────────────

function MatcherArt({ accent }: { accent: string }) {
  // Centre + 4 satellites — mint hub, cobalt satellites
  const centre = { x: 120, y: 70 };
  const satellites = [
    { x: 60,  y: 40, label: 'top-left' },
    { x: 180, y: 36, label: 'top-right' },
    { x: 56,  y: 100, label: 'btm-left' },
    { x: 184, y: 102, label: 'btm-right' },
  ];

  return (
    <svg viewBox="0 0 240 140" className="w-full h-full" aria-hidden>
      <defs>
        <radialGradient id="match-hub-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%"  stopColor="#18D6A4" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#18D6A4" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Connection lines */}
      {satellites.map((s, i) => (
        <motion.line
          key={s.label}
          x1={centre.x} y1={centre.y}
          x2={s.x} y2={s.y}
          stroke={accent} strokeOpacity="0.45"
          strokeWidth="1" strokeDasharray="3 3"
          variants={{
            rest: { pathLength: 0.55, opacity: 0.45 },
            hover: { pathLength: 1, opacity: [0.45, 0.95, 0.7] },
          }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }}
        />
      ))}

      {/* Satellites */}
      {satellites.map((s, i) => (
        <motion.g
          key={`sat-${s.label}`}
          variants={{
            rest:  { scale: 1, opacity: 0.7 },
            hover: { scale: [1, 1.15, 1], opacity: 1 },
          }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1], delay: 0.1 + i * 0.07, repeat: Infinity, repeatType: 'mirror' }}
          style={{ transformOrigin: `${s.x}px ${s.y}px` }}
        >
          <circle cx={s.x} cy={s.y} r="6" fill={accent} fillOpacity="0.18" stroke={accent} strokeOpacity="0.7" strokeWidth="1" />
          <circle cx={s.x} cy={s.y} r="2" fill={accent} />
        </motion.g>
      ))}

      {/* Hub glow */}
      <circle cx={centre.x} cy={centre.y} r="26" fill="url(#match-hub-glow)" />

      {/* Hub — central mint node, larger */}
      <motion.g
        variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }}
        transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
        style={{ transformOrigin: `${centre.x}px ${centre.y}px` }}
      >
        <circle cx={centre.x} cy={centre.y} r="12" fill="#18D6A4" fillOpacity="0.18" stroke="#18D6A4" strokeWidth="1.5" />
        <circle cx={centre.x} cy={centre.y} r="5"  fill="#18D6A4" />
        <motion.circle
          cx={centre.x} cy={centre.y} r="14"
          fill="none" stroke="#18D6A4" strokeOpacity="0.4" strokeWidth="1"
          variants={{ rest: { scale: 1, opacity: 0.4 }, hover: { scale: 1.5, opacity: 0 } }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], repeat: Infinity }}
          style={{ transformOrigin: `${centre.x}px ${centre.y}px` }}
        />
      </motion.g>
    </svg>
  );
}
