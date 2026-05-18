/**
 * DiversifyBanner — surfaced on the Portfolio page once UK and US markets
 * went live. Encourages UAE-concentrated investors to explore the newly
 * available markets without nagging them on every load (dismissable).
 *
 * Logic: shows when holdings.length > 0 AND the user has not dismissed it.
 * Dismiss is persisted to localStorage under `realsight.diversify-banner.v1`
 * so it stays hidden across sessions.
 *
 * Once Phase 4.5 ships true per-market holdings, this banner can refine
 * its trigger condition (only show when 100% of holdings are in one market).
 * For v1 the simpler "show to anyone with holdings" rule is fine — every
 * existing investor is UAE-concentrated by definition.
 */
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Globe, X, ArrowRight } from 'lucide-react';

const STORAGE_KEY = 'realsight.diversify-banner.v1';

interface DiversifyBannerProps {
  /** Only show if the investor has at least one holding. */
  hasHoldings: boolean;
}

export function DiversifyBanner({ hasHoldings }: DiversifyBannerProps) {
  const [dismissed, setDismissed] = useState(true); // assume dismissed until we read storage

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setDismissed(window.localStorage.getItem(STORAGE_KEY) === 'true');
  }, []);

  if (dismissed || !hasHoldings) return null;

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // localStorage can throw in private mode — banner just won't persist.
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden backdrop-blur-md border border-violet-400/20 bg-gradient-to-br from-violet-500/[0.08] via-emerald-500/[0.05] to-transparent p-5">
      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 p-1 rounded-md text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-start gap-4">
        <div className="shrink-0 mt-0.5 p-2 rounded-xl bg-violet-500/10 border border-violet-400/20">
          <Globe className="h-5 w-5 text-violet-400" />
        </div>
        <div className="flex-1 min-w-0 pr-8">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-400/80 mb-1">
            New markets · diversify
          </p>
          <h3 className="text-base md:text-lg font-bold text-foreground mb-1" style={{ letterSpacing: '-0.01em' }}>
            UK and US markets are live.
          </h3>
          <p className="text-sm text-white/60 max-w-xl">
            Your portfolio is currently UAE-concentrated. Explore London via
            HM Land Registry data, or 20 US metros via Case-Shiller HPI — both
            powered by official government registries.
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <Link
              to="/market/uk"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-400/25 text-violet-200 hover:bg-violet-500/25 transition-colors"
            >
              🇬🇧 Explore UK
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              to="/market/us"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-violet-500/15 border border-violet-400/25 text-violet-200 hover:bg-violet-500/25 transition-colors"
            >
              🇺🇸 Explore US
              <ArrowRight className="h-3 w-3" />
            </Link>
            <Link
              to="/off-plan"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-400/25 text-amber-200 hover:bg-amber-500/25 transition-colors"
            >
              🌏 Off-plan · UAE · Bali · Phuket
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
