import React from "react";
import Marquee from "@/components/ui/Marquee";
import { ShieldCheck, FileCheck2, Building2 } from "lucide-react";

/**
 * TrustSection — landing-page social-proof strip.
 *
 * Per LAUNCH_PLAN.md §17 + the founder's truth-in-claims principle:
 *
 *   • Numerical stats ("50,000+ transactions / 150+ areas / 5 markets") were
 *     pulled on 27 Apr 2026. The actual database holds tens of records, not
 *     tens of thousands — those numbers were aspirational, and shipping them
 *     publicly would constitute false advertising.
 *
 *   • Until the DDA/DLD live feed is allowlisted and we backfill real
 *     transaction history (~50K+ rows), this strip shows three QUALITATIVE
 *     trust pillars instead of fake metrics. Each one we can substantiate:
 *
 *       1. Verified registry data — true (we're an approved DDA app)
 *       2. Independent — true (Delaware C-Corp, no brokerage affiliation,
 *          no agent commissions, no off-plan kickbacks)
 *       3. Live in Dubai · expanding globally — true (Dubai is in production,
 *          London / Singapore / Madrid / US queued)
 *
 *   • The press/coverage marquee is kept (empty by default) — first real
 *     outlet swap-in happens the moment we land any.
 *
 *   • Real numerical stats can come back here once the DDA backfill lands.
 *     Track in LAUNCH_PLAN.md §14.
 */
export default function TrustSection() {
  const pillars = [
    {
      icon: <FileCheck2 className="w-6 h-6 text-emerald-400" />,
      title: "Verified registry data",
      body:
        "Built on official transaction registries and licensed market data — not scraped listings.",
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-emerald-400" />,
      title: "Independent",
      body:
        "Delaware C-Corp software company. No brokerage affiliations. No agent commissions. No off-plan kickbacks.",
    },
    {
      icon: <Building2 className="w-6 h-6 text-emerald-400" />,
      title: "Live in Dubai · global next",
      body:
        "Dubai market live now. London, Singapore, Madrid and the US queued for 2026.",
    },
  ];

  // Press / coverage outlets — start empty for launch; add as they land.
  // Plain text by design (no third-party wordmarks without permission).
  const press: string[] = [
    // e.g. "Arabian Business", "Forbes Middle East", "TechCrunch", "PropTech Today"
  ];

  return (
    <section className="py-24 relative overflow-hidden bg-background/50 backdrop-blur-sm border-y border-white/5">
      <div className="container mx-auto px-4">
        {/* Trust pillars (replaces the old numerical stats strip) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-20 max-w-5xl mx-auto">
          {pillars.map((p, i) => (
            <div
              key={i}
              className="flex flex-col items-start text-left p-7 rounded-2xl bg-white/5 border border-white/10 hover:border-emerald-500/30 transition-all duration-500 group"
            >
              <div className="mb-5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 group-hover:scale-110 transition-transform duration-500">
                {p.icon}
              </div>
              <h3 className="text-base font-semibold text-white mb-2 tracking-tight">
                {p.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Press strip / fallback trust line */}
        {press.length > 0 ? (
          <div className="flex flex-col items-center">
            <p className="text-sm font-medium text-muted-foreground mb-8 text-center uppercase tracking-[0.2em]">
              As featured in
            </p>
            <div className="relative w-full overflow-hidden">
              <Marquee className="py-4" pauseOnHover pauseOnClick repeat={4}>
                {press.map((outlet, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-center mx-8 grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  >
                    <span className="text-xl md:text-2xl font-bold tracking-tighter text-white/85 whitespace-nowrap">
                      {outlet}
                    </span>
                  </div>
                ))}
              </Marquee>
              <div className="absolute inset-y-0 left-0 w-24 bg-gradient-to-r from-background to-transparent z-10" />
              <div className="absolute inset-y-0 right-0 w-24 bg-gradient-to-l from-background to-transparent z-10" />
            </div>
          </div>
        ) : (
          // Quiet, honest fallback while press is still being earned. The
          // three qualitative pillars above already do the trust-building
          // work; this is just a single line of supporting copy.
          <div className="flex flex-col items-center max-w-3xl mx-auto text-center">
            <p className="text-xs font-medium text-muted-foreground/80 uppercase tracking-[0.25em]">
              A US-incorporated company standing behind every claim · Dubai-built · Globally aware
            </p>
          </div>
        )}
      </div>

      {/* Decorative Orbs */}
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full -z-10" />
      <div className="absolute top-1/2 right-0 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full -z-10" />
    </section>
  );
}
