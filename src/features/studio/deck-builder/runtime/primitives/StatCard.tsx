import type { ReactNode } from 'react';

interface StatCardProps {
  label: string;
  value: ReactNode;
  sub?: string;
  /** Highlight with the template accent (gold in Cinematic Gold). */
  accent?: boolean;
}

/**
 * Three-up footer row stat tile. Border-left accent with optional
 * gold variant. Lifted verbatim from the reference deck.
 */
export function StatCard({ label, value, sub, accent }: StatCardProps) {
  return (
    <div
      className={`flex flex-col gap-2.5 border-l-2 ${
        accent ? 'border-gold' : 'border-bone/20'
      } pl-5`}
    >
      <span className="text-xs uppercase tracking-widest text-bone/60">{label}</span>
      <span
        className={`font-serif text-4xl leading-none lg:text-5xl ${
          accent ? 'text-gold' : 'text-bone'
        }`}
      >
        {value}
      </span>
      {sub ? <span className="text-sm text-bone/70">{sub}</span> : null}
    </div>
  );
}
