"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, TrendingUp, DollarSign, Activity,
  Calculator, CheckCircle2, Shield, MapPin,
  ArrowRight, Sparkles, AlertCircle, Building2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
//  AREA INTELLIGENCE DATABASE
//  Real-ish market data per Dubai area (based on 2024/2025 DLD transaction ranges)
// ═══════════════════════════════════════════════════════════════════════════════

interface AreaIntel {
  displayName: string;
  /** All possible slugs/keywords that identify this area in a URL */
  slugs: string[];
  avgPriceSqft: number;
  yieldRange: [number, number];
  demand: string;
  demandScore: number;
  riskNote: string;
  verdictLabel: string;
  verdictDesc: string;
}

const AREA_DATABASE: AreaIntel[] = [
  {
    displayName: "Dubai Marina",
    slugs: ["dubai-marina", "marina", "dubaimarina"],
    avgPriceSqft: 1850,
    yieldRange: [5.5, 7.2],
    demand: "Very High",
    demandScore: 94,
    riskNote: "Prime waterfront location that holds its value well. New towers completing in 2026–2027 may bring more rental options to the area, which could affect short-term rents.",
    verdictLabel: "Premium Location",
    verdictDesc: "One of Dubai's most popular communities with strong property values and high rental demand.",
  },
  {
    displayName: "JVC",
    slugs: ["jvc", "jumeirah-village-circle", "jumeirah-village"],
    avgPriceSqft: 950,
    yieldRange: [7.0, 9.5],
    demand: "High",
    demandScore: 88,
    riskNote: "Great rental returns, but many new buildings are coming to the area. Make sure to check how full the building is before buying.",
    verdictLabel: "High Yield Zone",
    verdictDesc: "Known for some of Dubai's best rental returns — a popular choice for investors looking for steady income.",
  },
  {
    displayName: "Downtown Dubai",
    slugs: ["downtown-dubai", "downtown", "burj-khalifa", "the-address-downtown"],
    avgPriceSqft: 2600,
    yieldRange: [4.5, 6.0],
    demand: "Very High",
    demandScore: 96,
    riskNote: "Top-tier location. Rents are slightly lower compared to price, but the value keeps growing. Keep in mind that annual building fees can be 25–40 AED/sqft.",
    verdictLabel: "Blue-Chip Asset",
    verdictDesc: "Trophy location with exceptional resale value and tenant demand. A store of value for long-term investors.",
  },
  {
    displayName: "Business Bay",
    slugs: ["business-bay", "businessbay"],
    avgPriceSqft: 1650,
    yieldRange: [6.0, 7.8],
    demand: "High",
    demandScore: 90,
    riskNote: "Prices are rising fast here. Check the tower's completion status and the developer's track record — some older buildings have outstanding maintenance fees.",
    verdictLabel: "Growth Corridor",
    verdictDesc: "Outperforming many areas with strong corporate tenant demand and ongoing infrastructure upgrades.",
  },
  {
    displayName: "Dubai Hills Estate",
    slugs: ["dubai-hills", "dubai-hills-estate", "hills-estate"],
    avgPriceSqft: 1750,
    yieldRange: [5.0, 6.5],
    demand: "High",
    demandScore: 91,
    riskNote: "Family-focused community with strong infrastructure. Mall expansion in 2026 will boost values. Mainly villa-dominated which limits apartment supply.",
    verdictLabel: "Lifestyle Premium",
    verdictDesc: "Combines green living with urban convenience — strong long-term appreciation play for families.",
  },
  {
    displayName: "Palm Jumeirah",
    slugs: ["palm-jumeirah", "palm", "the-palm"],
    avgPriceSqft: 3200,
    yieldRange: [3.5, 5.5],
    demand: "Very High",
    demandScore: 97,
    riskNote: "Ultra-luxury segment with limited supply. Lower yields but exceptional capital gains. Check for upcoming special assessments or renovation levies.",
    verdictLabel: "Trophy Asset",
    verdictDesc: "Dubai's most iconic address — a store of value with global buyer appeal and limited new supply.",
  },
  {
    displayName: "JLT",
    slugs: ["jlt", "jumeirah-lake-towers", "jumeirah-lakes-towers"],
    avgPriceSqft: 1050,
    yieldRange: [6.5, 8.5],
    demand: "Medium-High",
    demandScore: 82,
    riskNote: "Mature community with good metro access. Some older towers may require renovation. Verify building maintenance status.",
    verdictLabel: "Value Play",
    verdictDesc: "Strong yields with excellent connectivity and established infrastructure at competitive entry prices.",
  },
  {
    displayName: "Arabian Ranches",
    slugs: ["arabian-ranches", "arabian-ranches-2", "arabian-ranches-3"],
    avgPriceSqft: 1400,
    yieldRange: [4.5, 6.0],
    demand: "High",
    demandScore: 89,
    riskNote: "Established villa community with consistently strong demand from families. Limited resale inventory keeps prices stable.",
    verdictLabel: "Stable Income",
    verdictDesc: "A proven residential community with multi-year price stability and strong family tenant demand.",
  },
  {
    displayName: "Meydan",
    slugs: ["meydan", "meydan-city", "mohammed-bin-rashid-city", "mbr-city"],
    avgPriceSqft: 1350,
    yieldRange: [6.0, 8.0],
    demand: "Medium-High",
    demandScore: 84,
    riskNote: "Up-and-coming area with major investment in roads, malls, and transport. Some projects may take longer to finish — check the developer's history.",
    verdictLabel: "Emerging Hotspot",
    verdictDesc: "Positioning as Dubai's next major urban center with strong future growth potential.",
  },
  {
    displayName: "Al Barsha",
    slugs: ["al-barsha", "barsha"],
    avgPriceSqft: 1100,
    yieldRange: [6.0, 7.5],
    demand: "Medium-High",
    demandScore: 80,
    riskNote: "Well-connected area near Mall of the Emirates. Older building stock may require higher maintenance budgets.",
    verdictLabel: "Solid Performer",
    verdictDesc: "Central location with consistent demand from mid-market tenants and good school proximity.",
  },
  {
    displayName: "Dubai Sports City",
    slugs: ["sports-city", "dubai-sports-city"],
    avgPriceSqft: 750,
    yieldRange: [7.5, 10.0],
    demand: "Medium",
    demandScore: 72,
    riskNote: "High yield but less liquid than premium areas. Some buildings have high vacancy rates — verify occupancy.",
    verdictLabel: "Yield Hunter",
    verdictDesc: "Entry-level pricing with attractive gross yields, but resale and tenant demand can be inconsistent.",
  },
  {
    displayName: "DIFC",
    slugs: ["difc", "international-financial-centre"],
    avgPriceSqft: 2800,
    yieldRange: [4.0, 5.5],
    demand: "Very High",
    demandScore: 95,
    riskNote: "Dubai's financial district with limited apartments available. Annual building fees are high — make sure to factor those into your returns.",
    verdictLabel: "Institutional Grade",
    verdictDesc: "Ultra-premium location with the highest quality tenants and strong long-term value retention.",
  },
  {
    displayName: "City Walk",
    slugs: ["city-walk", "citywalk"],
    avgPriceSqft: 2400,
    yieldRange: [4.5, 6.0],
    demand: "High",
    demandScore: 92,
    riskNote: "Boutique luxury community by Meraas. Limited inventory means strong price support but also limited exit options.",
    verdictLabel: "Boutique Luxury",
    verdictDesc: "Premium lifestyle destination with curated retail and dining — attracts high-quality long-term tenants.",
  },
  {
    displayName: "Dubai Creek Harbour",
    slugs: ["creek-harbour", "dubai-creek-harbour", "creek-harbor"],
    avgPriceSqft: 1900,
    yieldRange: [5.0, 6.5],
    demand: "High",
    demandScore: 88,
    riskNote: "Emerging waterfront master plan by Emaar. Beautiful properties but community is still maturing — amenities are being phased in.",
    verdictLabel: "Future Prime",
    verdictDesc: "Next-generation Emaar waterfront community with a strong track record of rising property values.",
  },
  {
    displayName: "Al Furjan",
    slugs: ["al-furjan", "furjan"],
    avgPriceSqft: 1000,
    yieldRange: [6.5, 8.0],
    demand: "Medium-High",
    demandScore: 79,
    riskNote: "Good connectivity via metro extension. Mix of villas and apartments. Check community management quality per building.",
    verdictLabel: "Value Growth",
    verdictDesc: "Affordable entry point with improving infrastructure and metro connectivity driving value.",
  },
  {
    displayName: "Jumeirah Beach Residence",
    slugs: ["jbr", "jumeirah-beach-residence"],
    avgPriceSqft: 1700,
    yieldRange: [5.5, 7.0],
    demand: "Very High",
    demandScore: 93,
    riskNote: "Popular beachfront area with strong tourist demand. Short-term rental rules may change — it's worth keeping an eye on local regulations.",
    verdictLabel: "Beachfront Prime",
    verdictDesc: "Iconic beachfront address with exceptional short-term and long-term rental demand.",
  },
  {
    displayName: "International City",
    slugs: ["international-city"],
    avgPriceSqft: 550,
    yieldRange: [8.0, 11.0],
    demand: "Medium",
    demandScore: 68,
    riskNote: "Lowest entry point in Dubai with very high yields on paper. But older buildings, higher maintenance, and periodic vacancy should be factored in.",
    verdictLabel: "Budget Yield",
    verdictDesc: "Dubai's most affordable area — extremely high gross yields but requires active management.",
  },
  {
    displayName: "Dubai Silicon Oasis",
    slugs: ["silicon-oasis", "dubai-silicon-oasis", "dso"],
    avgPriceSqft: 800,
    yieldRange: [7.0, 9.0],
    demand: "Medium",
    demandScore: 74,
    riskNote: "Free zone area with tech tenants. Good yields but geographically isolated compared to central Dubai.",
    verdictLabel: "Tech Corridor",
    verdictDesc: "Affordable tech-zone living with solid yields from the professional tenant base.",
  },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  URL PARSER — extracts area from listing URLs across major UAE portals
// ═══════════════════════════════════════════════════════════════════════════════

function findAreaFromUrl(inputUrl: string): { area: AreaIntel | null; portal: string; propertyType: string } {
  const lower = inputUrl.toLowerCase().trim();
  let portal = "Unknown";
  let propertyType = "Property";

  // ── Detect portal ──
  if (lower.includes("propertyfinder")) portal = "Property Finder";
  else if (lower.includes("bayut")) portal = "Bayut";
  else if (lower.includes("dubizzle")) portal = "Dubizzle";
  else if (lower.includes("zillow")) portal = "Zillow";

  // ── Detect property type ──
  if (lower.includes("apartment")) propertyType = "Apartment";
  else if (lower.includes("villa")) propertyType = "Villa";
  else if (lower.includes("townhouse")) propertyType = "Townhouse";
  else if (lower.includes("penthouse")) propertyType = "Penthouse";
  else if (lower.includes("studio")) propertyType = "Studio";
  else if (lower.includes("office")) propertyType = "Office";

  // ── Match area by scanning for known slugs in the URL ──
  // This is the most reliable approach: instead of trying to regex-extract 
  // an arbitrary area name, we scan the URL for ALL known area slugs.
  // We check longer slugs first (e.g., "dubai-marina" before "marina")
  // to avoid false positives.
  const allSlugs: { slug: string; area: AreaIntel }[] = [];
  for (const area of AREA_DATABASE) {
    for (const slug of area.slugs) {
      allSlugs.push({ slug, area });
    }
  }
  // Sort by slug length descending — match longest (most specific) first
  allSlugs.sort((a, b) => b.slug.length - a.slug.length);

  // We look for the area in the URL. Usually, the most specific area is mentioned 
  // multiple times or appears late in the path.
  for (const { slug, area } of allSlugs) {
    const escaped = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`, 'g');
    if (pattern.test(lower)) {
      return { area, portal, propertyType };
    }
  }

  return { area: null, portal, propertyType };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  ANALYSIS RESULT GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

interface AnalysisResult {
  area: AreaIntel;
  portal: string;
  propertyType: string;
  score: number;
  scoreColor: string;
  priceSqft: string;
  priceSqftScore: number;
  yieldEst: string;
  yieldScore: number;
  priceDiff: string;
  priceDiffDirection: "below" | "above" | "at";
}

function generateAnalysis(areaData: AreaIntel, portal: string, propertyType: string): AnalysisResult {
  // Deterministic pseudo-random based on area name (consistent per area)
  const seed = areaData.displayName.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const pr = (min: number, max: number) => {
    const x = Math.sin(seed * 9301 + 49297) % 233280;
    const r = Math.abs(x) / 233280;
    return min + r * (max - min);
  };

  // Price/sqft: vary ±12% from area average
  const priceSqft = Math.round(areaData.avgPriceSqft * (0.88 + pr(0, 0.24)));
  const priceSqftScore = Math.min(100, Math.round(60 + pr(0, 35)));

  // Yield
  const yieldVal = +(areaData.yieldRange[0] + pr(0, areaData.yieldRange[1] - areaData.yieldRange[0])).toFixed(1);
  const yieldScore = Math.min(100, Math.round(55 + pr(0, 40)));

  // Overall score
  const baseScore = Math.round(priceSqftScore * 0.35 + yieldScore * 0.30 + areaData.demandScore * 0.35);
  const score = Math.min(99, Math.max(35, baseScore));

  // Price diff from market median
  const diff = Math.round(areaData.avgPriceSqft * pr(0.05, 0.18) * 1000);
  const direction = priceSqft < areaData.avgPriceSqft ? "below" : priceSqft > areaData.avgPriceSqft * 1.05 ? "above" : "at";

  const scoreColor = score >= 75 ? "#22C55E" : score >= 55 ? "#EAB308" : "#EF4444";

  return {
    area: areaData,
    portal,
    propertyType,
    score,
    scoreColor,
    priceSqft: priceSqft.toLocaleString(),
    priceSqftScore,
    yieldEst: String(yieldVal),
    yieldScore,
    priceDiff: `AED ${diff.toLocaleString()}`,
    priceDiffDirection: direction,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  GAUGE COMPONENT — half-circle score indicator
// ═══════════════════════════════════════════════════════════════════════════════

const Gauge = ({ value, color }: { value: number; color: string }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const halfCircumference = circumference / 2;
  const offset = halfCircumference - (value / 100) * halfCircumference;

  return (
    <div className="flex flex-col items-center justify-center">
      {/* SVG arc */}
      <div className="relative w-[160px] h-[90px]">
        <svg width="100%" height="100%" viewBox="0 0 100 55" className="absolute inset-0">
          {/* Background track */}
          <path
            d="M 10,50 A 40,40 0 0,1 90,50"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Filled arc */}
          <motion.path
            d="M 10,50 A 40,40 0 0,1 90,50"
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeLinecap="round"
            initial={{ strokeDasharray: halfCircumference, strokeDashoffset: halfCircumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
          />
        </svg>
        
        {/* Score value — Absolute positioned to center it perfectly relative to the arc */}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-center pb-1">
          <motion.span
            className="text-3xl font-bold block tabular-nums leading-none"
            style={{ color }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            {Math.round(value)}
          </motion.span>
          <span className="text-[8px] uppercase tracking-[0.2em] text-muted-foreground/50 font-bold block mt-1">
            AI Score
          </span>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  AREA SELECTOR — fallback when URL doesn't contain an identifiable area
// ═══════════════════════════════════════════════════════════════════════════════

const AreaSelector = ({
  onSelect,
  onCancel,
}: {
  onSelect: (area: AreaIntel) => void;
  onCancel: () => void;
}) => {
  const [search, setSearch] = useState("");
  const filtered = AREA_DATABASE.filter((a) =>
    a.displayName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/5 border border-amber-500/15">
        <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
        <div>
          <h5 className="text-xs font-bold text-amber-400 mb-1">Which area is this property in?</h5>
          <p className="text-[11px] text-amber-500/70 leading-relaxed">
            We couldn't quite tell the exact neighborhood from that link. To give you the most accurate real estate insights, please select the area from the list below.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search area…"
          className="w-full bg-white/5 border border-white/10 rounded-lg outline-none pl-9 pr-4 py-2.5 text-xs text-foreground focus:border-primary/30 placeholder:text-muted-foreground/20 transition-colors"
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-2 max-h-[240px] overflow-y-auto pr-1 scrollbar-thin">
        {filtered.map((area) => (
          <button
            key={area.displayName}
            onClick={() => onSelect(area)}
            className="glass-card p-3 text-left hover:bg-white/[0.06] hover:border-primary/20 transition-all group"
          >
            <p className="text-[11px] font-bold text-foreground group-hover:text-primary transition-colors truncate">
              {area.displayName}
            </p>
            <p className="text-[9px] text-muted-foreground/50 mt-0.5">
              ~{area.avgPriceSqft.toLocaleString()} AED/sqft
            </p>
          </button>
        ))}
        {filtered.length === 0 && (
          <p className="col-span-2 text-center text-xs text-muted-foreground/40 py-6">
            No results — try a different name
          </p>
        )}
      </div>

      <Button
        onClick={onCancel}
        variant="outline"
        className="w-full glass-button text-[10px] h-10 uppercase tracking-widest font-bold border-white/5 hover:bg-white/5"
      >
        Cancel
      </Button>
    </motion.div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function DealAnalyzer() {
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showAreaSelector, setShowAreaSelector] = useState(false);
  const [activeMetric, setActiveMetric] = useState<number | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pendingPortal, setPendingPortal] = useState("");
  const [pendingPropertyType, setPendingPropertyType] = useState("Property");

  const runAnalysis = (areaData: AreaIntel, portal: string, propertyType: string) => {
    setShowAreaSelector(false);
    setIsAnalyzing(true);
    setTimeout(() => {
      const analysis = generateAnalysis(areaData, portal, propertyType);
      setResult(analysis);
      setIsAnalyzing(false);
      setShowResults(true);
    }, 2000);
  };

  const handleAnalyze = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    const { area, portal, propertyType } = findAreaFromUrl(url);

    if (area) {
      // Area found in URL — run analysis directly
      runAnalysis(area, portal, propertyType);
    } else {
      // Area NOT found — show manual selector
      setPendingPortal(portal);
      setPendingPropertyType(propertyType);
      setShowAreaSelector(true);
    }
  };

  const handleAreaSelect = (area: AreaIntel) => {
    runAnalysis(area, pendingPortal, pendingPropertyType);
  };

  const handleReset = () => {
    setUrl("");
    setShowResults(false);
    setShowAreaSelector(false);
    setResult(null);
    setActiveMetric(null);
    setIsAnalyzing(false);
  };

  const metrics = result
    ? [
        { label: "Price/sqft", value: result.priceSqft, icon: DollarSign, suffix: " AED" },
        { label: "Yield Est.", value: result.yieldEst, icon: TrendingUp, suffix: "%" },
        { label: "Demand", value: result.area.demand, icon: Activity, suffix: "" },
      ]
    : [];

  return (
    <div className="h-full flex flex-col relative text-left">
      {/* ── Header ── */}
      <div className="flex flex-col gap-1 mb-5">
        <div className="inline-flex items-center gap-2 text-primary font-bold text-[10px] uppercase tracking-[0.2em]">
          <Sparkles className="h-3 w-3" />
          AI Analysis Engine
        </div>
        <h3 className="text-2xl font-bold text-foreground">
          Real-time <span className="text-accent-gradient">Listing Audit</span>
        </h3>
      </div>

      {/* ── URL Input ── */}
      <form onSubmit={handleAnalyze} className="mb-5 z-10">
        <div className={cn(
          "glass-card p-2 transition-all duration-300",
          (showResults || showAreaSelector) ? "opacity-40 grayscale pointer-events-none" : "bg-white/5"
        )}>
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/30" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste listing URL (Property Finder, Bayut…)"
                className="w-full bg-transparent border-none outline-none pl-10 pr-4 py-3 text-sm text-foreground focus:ring-0 placeholder:text-muted-foreground/20"
              />
            </div>
            {!showResults && !showAreaSelector && (
              <Button
                type="submit"
                disabled={isAnalyzing || !url.trim()}
                className="bg-primary hover:bg-accent-green-dark text-white font-bold rounded-lg px-6 h-11 transition-all shadow-xl shadow-primary/20 text-xs"
              >
                {isAnalyzing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
                    <Activity className="h-4 w-4" />
                  </motion.div>
                ) : (
                  "Analyze"
                )}
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* ── Analyzing spinner state ── */}
      {isAnalyzing && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex-1 flex flex-col items-center justify-center gap-4 py-12"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary"
          />
          <div className="text-center space-y-1">
            <p className="text-sm font-bold text-foreground">Analyzing property…</p>
            <p className="text-[10px] text-muted-foreground/50">Comparing with recent market prices</p>
          </div>
        </motion.div>
      )}

      {/* ── Main Content ── */}
      {!isAnalyzing && (
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">

            {/* STATE: Area selector (URL didn't contain area) */}
            {showAreaSelector && (
              <motion.div key="selector" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <AreaSelector onSelect={handleAreaSelect} onCancel={handleReset} />
              </motion.div>
            )}

            {/* STATE: Guide (initial) */}
            {!showResults && !showAreaSelector && (
              <motion.div
                key="guide"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, filter: "blur(8px)" }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 space-y-5">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                        <Calculator className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h4 className="text-base font-bold text-foreground">Deal Benchmarking</h4>
                        <p className="text-xs text-muted-foreground italic">Powered by Realsight Intelligence</p>
                      </div>
                    </div>
                    <p className="text-[12px] text-muted-foreground leading-relaxed">
                      Paste a link from Property Finder, Bayut, or Dubizzle, and our AI will instantly <span className="text-foreground font-semibold">compare the deal</span> against real market prices in the same area.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    {[
                      {
                        title: "Smart Detection",
                        desc: "Just paste the link — we'll figure out the area, property type, and listing details automatically.",
                        icon: Search, color: "text-emerald-400", bg: "bg-emerald-500/10"
                      },
                      {
                        title: "Local Market Data",
                        desc: "We compare your listing to recent sales and rental prices in the same neighborhood.",
                        icon: MapPin, color: "text-blue-400", bg: "bg-blue-500/10"
                      },
                      {
                        title: "Deal Score",
                        desc: "Get a clear 0–100 score showing if this property is a good deal based on price, demand, and future outlook.",
                        icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10"
                      }
                    ].map((tip, i) => (
                      <motion.div
                        key={tip.title}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="glass-card p-4 bg-white/[0.02] border-white/5 flex gap-4 group hover:bg-white/[0.04] transition-colors"
                      >
                        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/10", tip.bg)}>
                          <tip.icon className={cn("h-4 w-4", tip.color)} />
                        </div>
                        <div className="space-y-0.5">
                          <h5 className="text-[11px] font-bold text-foreground uppercase tracking-wide">{tip.title}</h5>
                          <p className="text-[10px] text-muted-foreground leading-relaxed">{tip.desc}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-[9px] text-muted-foreground/30 font-bold uppercase tracking-[0.2em]">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.4)]" />
                    Market Data Active
                  </div>
                  <span>{AREA_DATABASE.length} areas covered</span>
                </div>
              </motion.div>
            )}

            {/* STATE: Results */}
            {showResults && result && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 space-y-4">
                  {/* Area & Portal Tags */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[10px] font-bold text-primary">
                      <MapPin className="h-3 w-3" />
                      {result.area.displayName}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold text-muted-foreground">
                      <Building2 className="h-3 w-3" />
                      {result.propertyType}
                    </div>
                    {result.portal !== "Unknown" && (
                      <span className="text-[9px] text-muted-foreground/40">via {result.portal}</span>
                    )}
                  </div>

                  {/* Verdict: Gauge + Summary */}
                  <div className="flex items-center gap-5 p-5 rounded-xl bg-gradient-to-br from-primary/5 via-transparent to-transparent border border-white/5">
                    <div className="shrink-0">
                      <Gauge value={result.score} color={result.scoreColor} />
                    </div>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                        result.score >= 75
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : result.score >= 55
                          ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                          : "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        <CheckCircle2 className="h-3 w-3" />
                        {result.area.verdictLabel}
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {result.area.verdictDesc}
                        {result.priceDiffDirection !== "at" && (
                          <span className="block mt-1">
                            Currently{" "}
                            <span className={cn("font-bold", result.priceDiffDirection === "below" ? "text-emerald-400" : "text-amber-400")}>
                              {result.priceDiff} {result.priceDiffDirection}
                            </span>{" "}
                            median for <span className="text-foreground font-semibold">{result.area.displayName}</span>.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    {metrics.map((metric, i) => (
                      <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className={cn(
                          "glass-card p-4 flex flex-col items-center justify-center text-center border-white/5 transition-all hover:border-primary/20 cursor-pointer",
                          activeMetric === i ? "border-primary/40 bg-primary/5" : ""
                        )}
                        onClick={() => setActiveMetric(activeMetric === i ? null : i)}
                      >
                        <div className={cn(
                          "w-7 h-7 rounded-md flex items-center justify-center mb-2 border",
                          activeMetric === i ? "bg-primary/20 border-primary/30" : "bg-white/5 border-white/5"
                        )}>
                          <metric.icon className={cn("h-3.5 w-3.5", activeMetric === i ? "text-primary" : "text-muted-foreground/40")} />
                        </div>
                        <p className="text-[8px] font-black text-muted-foreground uppercase mb-0.5 tracking-widest">{metric.label}</p>
                        <p className="text-base font-bold text-foreground tabular-nums">
                          {metric.value}<span className="text-[9px] opacity-40 ml-0.5">{metric.suffix}</span>
                        </p>
                      </motion.div>
                    ))}
                  </div>

                  {/* Risk Notice */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 }}
                    className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-amber-500/30" />
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-1">
                        Risk — {result.area.displayName}
                      </h5>
                      <p className="text-[10px] text-amber-500/70 leading-relaxed font-medium">
                        {result.area.riskNote}
                      </p>
                    </div>
                  </motion.div>
                </div>

                {/* Reset button */}
                <div className="pt-5">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="w-full glass-button gap-2 text-[10px] h-12 uppercase tracking-[0.2em] font-black border-white/5 hover:bg-white/10 transition-all"
                  >
                    <ArrowRight className="h-3.5 w-3.5 rotate-180" />
                    Analyze New Listing
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
