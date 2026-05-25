import { motion } from 'framer-motion';
import { SlideShell } from '../../../components/SlideShell';
import { CitationChip } from '../../../components/CitationChip';
import { useStaticMode } from '../../../static-mode';
import type { SlideProps, OffplanSplitData } from '../../../types';

interface SegProps {
  pct: number;
  klass: string;
  title: string;
  val: string;
}

function Seg({ pct, klass, title, val }: SegProps) {
  const isStatic = useStaticMode();
  const inner = (
    <div className="flex flex-col justify-center px-4">
      <span className="text-[11px] uppercase tracking-[0.16em] opacity-80">{title}</span>
      <span className="font-serif text-2xl leading-tight">{val}</span>
    </div>
  );
  return isStatic ? (
    <div className={klass} style={{ width: `${pct}%` }}>
      {inner}
    </div>
  ) : (
    <motion.div
      className={klass}
      style={{ width: `${pct}%` }}
      initial={{ width: 0 }}
      animate={{ width: `${pct}%` }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
    >
      {inner}
    </motion.div>
  );
}

interface SplitBarProps {
  caption: string;
  offPlanPct: number;
  secondaryPct: number;
}

function SplitBar({ caption, offPlanPct, secondaryPct }: SplitBarProps) {
  return (
    <div>
      <div className="mb-2 text-xs uppercase tracking-[0.22em] text-bone/60">{caption}</div>
      <div className="flex h-[68px] w-full overflow-hidden rounded-sm border border-bone/15">
        <Seg
          pct={offPlanPct}
          klass="flex h-full items-center overflow-hidden whitespace-nowrap bg-bone/15 text-bone/80"
          title="Off-Plan"
          val={`${offPlanPct.toFixed(1)}%`}
        />
        <Seg
          pct={secondaryPct}
          klass="flex h-full items-center overflow-hidden whitespace-nowrap bg-gold text-ink-900"
          title="Secondary"
          val={`${secondaryPct.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}

/**
 * Off-plan vs secondary split slide — two stacked split-bars showing
 * the cut by deal count and by deal value. Lifted from
 * `05-OffPlan.tsx`. Data-bearing — citation chip renders in the
 * footer "DLD · N deals" line.
 */
export function OffplanSplitSlide({
  isMobile,
  entry,
  branding,
  visual,
}: SlideProps<OffplanSplitData>) {
  const data = entry.data;
  if (!data) {
    return (
      <SlideShell
        isMobile={isMobile}
        photo={visual}
        scrim="heavy"
        logo={branding.logo_url}
        agencyName={branding.agency_name}
      >
        <div className="absolute inset-0 z-10 flex items-center justify-center text-bone/55">
          Data pending — off-plan-vs-secondary cached aggregate lands in Phase 2.
        </div>
      </SlideShell>
    );
  }

  return (
    <SlideShell
      isMobile={isMobile}
      photo={visual}
      scrim="heavy"
      logo={branding.logo_url}
      agencyName={branding.agency_name}
    >
      <div className="absolute left-12 top-10 z-10 text-xs uppercase tracking-[0.3em] text-gold">
        Off-plan vs Secondary
      </div>

      <div className="absolute left-12 right-12 top-[88px] z-10">
        <h2 className="max-w-3xl font-serif text-5xl leading-[1.05] text-bone">
          {entry.headline ?? ''}
        </h2>
      </div>

      <div className="absolute inset-x-12 top-[200px] z-10 space-y-6">
        <SplitBar
          caption={`Every Dubai sale ${data.window_label} — by number of deals`}
          offPlanPct={data.off_plan_pct_count}
          secondaryPct={data.secondary_pct_count}
        />
        <SplitBar
          caption="The same deals — by money spent (AED)"
          offPlanPct={data.off_plan_pct_value}
          secondaryPct={data.secondary_pct_value}
        />
      </div>

      {entry.body ? (
        <div className="absolute inset-x-12 top-[400px] z-10">
          <div className="rounded-sm border border-gold/35 bg-gold/[0.06] p-5 backdrop-blur-md">
            <p className="text-base leading-relaxed text-bone/85">{entry.body}</p>
          </div>
        </div>
      ) : null}

      <div className="absolute bottom-9 left-12 right-12 z-10 border-t border-bone/15 pt-4">
        <p className="mt-2 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-bone/45">
          DLD · {data.total_deals.toLocaleString('en-US')} sale deals · AED{' '}
          {data.total_value_bn}B · {data.window_label}
          <CitationChip citation={entry.citation} />
        </p>
      </div>
    </SlideShell>
  );
}
