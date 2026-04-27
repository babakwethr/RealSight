/**
 * CoverageMap — stylized "global coverage" visual for the landing page.
 *
 * Per LAUNCH_PLAN.md §17: world map, Dubai pulsing live, others muted
 * "coming". We do this without pulling in a heavy mapping library — a
 * simple SVG with a low-fidelity world silhouette and 5 positioned pins
 * costs <2 KB and reads as more design-intentional than a real map
 * tile would.
 *
 * COMPETITIVE-MOAT NOTE: city positions are accurate enough to read,
 * deliberately abstract enough that we don't tip our hand on coverage
 * geometry (e.g. which sub-cities, what neighbourhood density). This
 * is a positioning device, not a feature spec.
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Pin {
  slug: string;
  name: string;
  /** Approximate equirectangular x% (0–100) */
  x: number;
  /** Approximate equirectangular y% (0–100, top→bottom) */
  y: number;
  status: 'live' | 'coming';
  hint: string;
}

// Coordinates roughly mapped from longitude/latitude onto a 100×50 canvas
// (equirectangular projection):
//   x = (lng + 180) / 360 * 100
//   y = (90 - lat)  / 180 * 100
// Then nudged slightly for visual balance on a heavily-stylized base.
const PINS: Pin[] = [
  { slug: 'us',        name: 'New York / Miami', x: 26, y: 38, status: 'coming', hint: 'Coming Q4 2026' },
  { slug: 'london',    name: 'London',           x: 47, y: 30, status: 'coming', hint: 'Coming Q3 2026' },
  { slug: 'spain',     name: 'Madrid',           x: 47, y: 38, status: 'coming', hint: 'Coming Q4 2026' },
  { slug: 'dubai',     name: 'Dubai',            x: 64, y: 44, status: 'live',   hint: 'Live now' },
  { slug: 'singapore', name: 'Singapore',        x: 79, y: 53, status: 'coming', hint: 'Coming Q3 2026' },
];

export function CoverageMap() {
  return (
    <div className="relative w-full max-w-5xl mx-auto aspect-[2/1] rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-black/60 via-black/40 to-primary/5">
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-transparent to-accent-blue/15 pointer-events-none" />

      {/* Low-fidelity dotted world silhouette */}
      <svg
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full opacity-40"
        aria-hidden="true"
      >
        {/* Dotted grid background — suggests a globe projection without
            committing to a specific cartographic accuracy claim. */}
        <defs>
          <pattern id="dot-grid" x="0" y="0" width="2" height="2" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="0.18" fill="rgba(255,255,255,0.18)" />
          </pattern>
        </defs>
        <rect x="0" y="0" width="100" height="50" fill="url(#dot-grid)" />

        {/* Loose continent blobs — hand-drawn feel, intentionally abstract.
            Reads as "earth" without pretending to be a cartographic source. */}
        <g fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" strokeWidth="0.15">
          {/* Americas */}
          <path d="M14,20 Q18,18 22,22 Q26,28 24,34 Q22,40 18,42 Q12,40 11,32 Q10,24 14,20 Z" />
          <path d="M22,38 Q26,40 28,44 Q26,48 22,46 Q19,42 22,38 Z" />
          {/* Europe + Africa */}
          <path d="M44,18 Q50,16 54,20 Q56,28 52,32 Q48,30 44,28 Q42,22 44,18 Z" />
          <path d="M48,30 Q54,32 56,38 Q54,44 50,46 Q46,44 46,38 Q47,33 48,30 Z" />
          {/* Asia */}
          <path d="M58,18 Q70,16 80,20 Q86,24 82,30 Q72,32 64,30 Q58,26 58,18 Z" />
          {/* SE Asia / Oceania */}
          <path d="M78,40 Q84,38 88,42 Q86,46 80,46 Q76,44 78,40 Z" />
          <path d="M84,30 Q88,30 90,34 Q88,38 84,36 Q82,32 84,30 Z" />
        </g>
      </svg>

      {/* City pins overlay */}
      <div className="absolute inset-0">
        {PINS.map((p, i) => (
          <Pin key={p.slug} pin={p} delay={i * 0.15} />
        ))}
      </div>

      {/* Bottom legend strip */}
      <div className="absolute bottom-0 left-0 right-0 px-5 py-3 bg-gradient-to-t from-black/70 to-transparent flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 text-[10px] text-white/55">
          <span className="flex items-center gap-1.5">
            <span className="relative flex">
              <span className="absolute inline-flex h-2 w-2 rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            Live
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-400/60" />
            Coming 2026
          </span>
        </div>
        <p className="text-[10px] text-white/40 italic hidden sm:block">
          One subscription · expanding markets
        </p>
      </div>
    </div>
  );
}

function Pin({ pin, delay }: { pin: Pin; delay: number }) {
  const isLive = pin.status === 'live';
  return (
    <Link
      to={isLive ? '/' : `/request-access?market=${pin.slug}`}
      className="absolute -translate-x-1/2 -translate-y-1/2 group"
      style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ delay, duration: 0.4, ease: 'easeOut' }}
        className="relative"
      >
        {/* Pulsing halo for live markets */}
        {isLive && (
          <span className="absolute inset-0 -m-3">
            <span className="block h-full w-full rounded-full bg-primary/40 animate-ping" />
          </span>
        )}

        {/* Pin dot */}
        <span
          className={cn(
            'relative block w-3 h-3 rounded-full border-2 transition-all',
            isLive
              ? 'bg-primary border-primary shadow-[0_0_12px_rgba(24,214,164,0.6)]'
              : 'bg-amber-400/70 border-amber-300/40',
          )}
        />

        {/* Label tooltip on hover */}
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 mt-2 px-2 py-1 rounded-md text-[10px] font-semibold whitespace-nowrap pointer-events-none transition-opacity',
            'opacity-0 group-hover:opacity-100',
            isLive ? 'bg-primary/15 text-primary border border-primary/25' : 'bg-amber-500/15 text-amber-200 border border-amber-500/25',
          )}
        >
          {pin.name} · {pin.hint}
        </span>
      </motion.div>
    </Link>
  );
}
