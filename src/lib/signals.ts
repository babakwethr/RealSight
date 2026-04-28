/**
 * signals.ts — area-level "opportunity signal" classifier.
 *
 * Extracted from src/pages/OpportunitySignals.tsx so the live ticker
 * (and any future surface) can reuse the classification logic without
 * duplicating it. The shape is stable — anything depending on `Signal`
 * keeps working unchanged.
 */
export type SignalType = 'all' | 'high-yield' | 'growth' | 'undervalued' | 'low-risk';

export interface Signal {
  area: string;
  signal: string;
  type: SignalType;
  risk: string;
  desc: string;
  yield: string;
  growth: string;
  confidence: number;
  pricePerSqft: number;
  demandScore: number;
}

export const SIGNAL_TYPES: { id: SignalType; label: string }[] = [
  { id: 'all',         label: 'All Signals' },
  { id: 'high-yield',  label: 'High Rental Yield' },
  { id: 'growth',      label: 'Growth Corridor' },
  { id: 'undervalued', label: 'Undervalued' },
  { id: 'low-risk',    label: 'Low Risk' },
];

/**
 * Classify a DLD area row into a signal, or return null if no pattern matches.
 * Pure function — no side effects, no fetching. Pass any object that has the
 * dld_areas columns we read.
 */
export function classifyArea(area: {
  name: string;
  avg_price_per_sqft_current?: number | null;
  avg_price_per_sqft_12m_ago?: number | null;
  rental_yield_avg?: number | null;
  demand_score?: number | null;
  transaction_volume_30d?: number | null;
}): Signal | null {
  const past = area.avg_price_per_sqft_12m_ago ?? 0;
  const yoyGrowth = past > 0
    ? (((area.avg_price_per_sqft_current ?? 0) - past) / past) * 100
    : 0;

  const rentalYield = area.rental_yield_avg ?? 0;
  const demand = area.demand_score ?? 0;
  const volume = area.transaction_volume_30d ?? 0;
  const pps = area.avg_price_per_sqft_current ?? 0;

  let signalType: SignalType;
  let signalLabel: string;
  let risk: string;
  let desc: string;
  let confidence: number;

  if (rentalYield >= 6.5) {
    signalType = 'high-yield';
    signalLabel = 'High Rental Yield';
    risk = demand >= 60 ? 'Low Risk' : 'Medium Risk';
    desc = `Strong rental returns at ${rentalYield.toFixed(1)}% yield — ${volume >= 100 ? 'high liquidity area' : 'growing investor interest'}.`;
    confidence = Math.min(95, Math.round(50 + rentalYield * 4 + (demand / 10)));
  } else if (yoyGrowth >= 10) {
    signalType = 'growth';
    signalLabel = 'Growth Corridor';
    risk = yoyGrowth > 20 ? 'Medium Risk' : 'Low Risk';
    desc = `Strong capital appreciation at ${yoyGrowth.toFixed(1)}% YoY — ${demand >= 70 ? 'sustained demand driving prices' : 'early growth phase'}.`;
    confidence = Math.min(95, Math.round(40 + yoyGrowth * 2 + (demand / 10)));
  } else if (pps <= 1200 && demand >= 40) {
    signalType = 'undervalued';
    signalLabel = 'Undervalued';
    risk = 'Low Risk';
    desc = `Below-average price per sqft at AED ${pps} with ${demand >= 60 ? 'strong' : 'growing'} demand — potential upside.`;
    confidence = Math.min(90, Math.round(50 + (80 - Math.min(80, pps / 20)) + (demand / 10)));
  } else if (demand >= 75 && volume >= 100 && yoyGrowth >= 0 && yoyGrowth <= 10) {
    signalType = 'low-risk';
    signalLabel = 'Low Risk';
    risk = 'Very Low Risk';
    desc = `Stable blue-chip area with high demand (${demand}/100) and consistent transaction volume.`;
    confidence = Math.min(95, Math.round(60 + demand / 5 + volume / 50));
  } else if (rentalYield >= 5 && yoyGrowth >= 5) {
    signalType = 'growth';
    signalLabel = 'Growth Corridor';
    risk = 'Medium Risk';
    desc = `Balanced growth and yield profile — ${yoyGrowth.toFixed(1)}% appreciation with ${rentalYield.toFixed(1)}% yield.`;
    confidence = Math.min(90, Math.round(40 + rentalYield * 3 + yoyGrowth * 2));
  } else {
    return null;
  }

  return {
    area: area.name,
    signal: signalLabel,
    type: signalType,
    risk,
    desc,
    yield: `${rentalYield.toFixed(1)}%`,
    growth: `${yoyGrowth > 0 ? '+' : ''}${yoyGrowth.toFixed(1)}%`,
    confidence: Math.max(50, Math.min(95, confidence)),
    pricePerSqft: pps,
    demandScore: demand,
  };
}
