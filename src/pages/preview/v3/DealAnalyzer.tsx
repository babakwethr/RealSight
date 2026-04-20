import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import {
  X,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Wallet,
  Home,
  Percent,
  Zap,
  Building2,
} from "lucide-react";

/**
 * V3 Deal Analyzer — the star of the show.
 *
 * Layout pattern from reference (card on gradient + bottom detail sheet
 * with copyable fields), reinterpreted as an "analyze any deal" flow:
 *   - Hero card floats a glowing brand mark and the Deal Score
 *   - Below: the inputs that matter (price, rent, type) in a calm,
 *     copy-block style list, topped with an AI verdict band
 *   - Strong bottom CTA — "Run Deep Analysis".
 */

export default function V3DealAnalyzer() {
  const navigate = useNavigate();
  const [price, setPrice] = useState("2,850,000");
  const [rent, setRent] = useState("215,000");

  const yieldPct = (
    (Number(rent.replace(/,/g, "")) / Number(price.replace(/,/g, ""))) *
    100
  ).toFixed(2);

  return (
    <div className="relative text-white">
      {/* Header chrome */}
      <div className="flex items-center justify-between px-5 pt-2 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-[13px] font-bold tracking-[0.2em] uppercase text-white/70">
          Deal Analyzer
        </p>
        <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-[#2effc0]" />
        </button>
      </div>

      {/* Floating deal card */}
      <div className="px-5 pb-4">
        <motion.div
          initial={{ y: 12, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="relative rounded-[28px] overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg,#1a2a6b 0%, #2d5cff 45%, #7a5cff 100%)",
          }}
        >
          {/* Decorative brand mark */}
          <div className="absolute -right-4 -bottom-4 opacity-30">
            <svg viewBox="0 0 200 200" className="w-[220px] h-[220px]">
              <g stroke="white" strokeWidth="10" strokeLinecap="round">
                <line x1="100" y1="30" x2="100" y2="170" />
                <line x1="35" y1="65" x2="165" y2="135" />
                <line x1="165" y1="65" x2="35" y2="135" />
              </g>
            </svg>
          </div>

          <div className="relative p-5">
            <div className="flex items-center justify-between">
              <div className="px-2.5 py-1 rounded-full bg-white/15 text-[10px] font-bold tracking-wider uppercase">
                Dubai Marina · 2BR
              </div>
              <div className="text-[10px] font-semibold tracking-widest uppercase text-white/70">
                Live
              </div>
            </div>

            <p className="text-white/70 text-[12px] mt-6 font-medium">
              Deal Score
            </p>
            <div className="flex items-end gap-2">
              <span className="text-[62px] font-black leading-none tracking-tight">
                92
              </span>
              <span className="text-white/60 text-[18px] font-semibold pb-2">
                /100
              </span>
              <div className="ml-auto flex items-center gap-1 pb-3">
                <TrendingUp className="h-4 w-4 text-[#2effc0]" />
                <span className="text-[#2effc0] text-[12px] font-bold">
                  Strong Buy
                </span>
              </div>
            </div>

            {/* Score sparkline */}
            <div className="flex items-center gap-1 mt-4 h-6">
              {[12, 18, 14, 22, 19, 28, 26, 34, 30, 38, 42, 48, 46, 52, 60, 64, 72, 78, 82, 92].map(
                (v, i) => (
                  <div
                    key={i}
                    className="flex-1 rounded-sm"
                    style={{
                      height: `${Math.max(6, (v / 100) * 24)}px`,
                      background:
                        i > 15
                          ? "linear-gradient(180deg,#2effc0,#18d6a4)"
                          : "rgba(255,255,255,0.35)",
                    }}
                  />
                )
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* AI verdict band */}
      <div className="px-5 pb-4">
        <div className="flex items-start gap-3 p-3 rounded-2xl bg-[#18d6a4]/10 border border-[#18d6a4]/30">
          <div className="w-8 h-8 rounded-full bg-[#18d6a4] flex items-center justify-center shrink-0">
            <Zap className="h-4 w-4 text-black" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-[#2effc0]">
              RealSight AI · Verdict
            </p>
            <p className="text-[12.5px] text-white/80 leading-relaxed mt-0.5">
              Price is <strong className="text-white">6.4% below</strong> 30-day
              DLD median. Rental yield of{" "}
              <strong className="text-white">{yieldPct}%</strong> beats Marina
              avg. Liquidity score is high — 12 transactions/month.
            </p>
          </div>
        </div>
      </div>

      {/* Inputs list — "card info" style */}
      <div className="px-5 pb-6">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50 mb-3">
          Deal Inputs
        </p>
        <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] overflow-hidden backdrop-blur-md">
          <InputRow
            icon={<Wallet className="h-4 w-4" />}
            label="Purchase price"
            value={price}
            onChange={setPrice}
            prefix="AED"
          />
          <InputRow
            icon={<Home className="h-4 w-4" />}
            label="Annual rent"
            value={rent}
            onChange={setRent}
            prefix="AED"
          />
          <ReadRow
            icon={<Percent className="h-4 w-4" />}
            label="Gross yield"
            value={`${yieldPct}%`}
            accent
          />
          <ReadRow
            icon={<Building2 className="h-4 w-4" />}
            label="Area avg. yield"
            value="6.12%"
          />
        </div>
      </div>

      {/* Signals chips */}
      <div className="px-5 pb-6">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50 mb-3">
          Market Signals
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { label: "+18% YoY", tone: "green" },
              { label: "High demand", tone: "blue" },
              { label: "Low supply", tone: "violet" },
              { label: "Freehold", tone: "neutral" },
              { label: "Ready 2026", tone: "neutral" },
            ] as const
          ).map((s) => (
            <Chip key={s.label} label={s.label} tone={s.tone} />
          ))}
        </div>
      </div>

      {/* Strong bottom CTA */}
      <div className="px-5 pb-6">
        <motion.button
          whileTap={{ scale: 0.98 }}
          className="relative w-full h-[58px] rounded-full flex items-center justify-center gap-2 font-bold text-black text-[16px] overflow-hidden"
          style={{
            background:
              "linear-gradient(90deg,#2effc0 0%, #18d6a4 55%, #059669 100%)",
            boxShadow: "0 16px 40px -10px rgba(24,214,164,0.55)",
          }}
        >
          <Sparkles className="h-5 w-5" /> Run Deep Analysis
          <ArrowRight className="h-5 w-5" />
        </motion.button>
        <p className="text-center text-[11px] text-white/50 mt-3">
          Full 24-page report · DLD comps · scenario modeling
        </p>
      </div>
    </div>
  );
}

/* ------------------------------ BITS ------------------------------ */

function InputRow({
  icon,
  label,
  value,
  onChange,
  prefix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  prefix?: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-[11px] text-white/50 leading-none">{label}</p>
        <div className="flex items-baseline gap-1.5 mt-1">
          {prefix && (
            <span className="text-[13px] font-semibold text-white/50">
              {prefix}
            </span>
          )}
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="bg-transparent outline-none text-[16px] font-bold text-white w-full"
          />
        </div>
      </div>
    </div>
  );
}

function ReadRow({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70">
        {icon}
      </div>
      <p className="text-[13px] text-white/60 flex-1">{label}</p>
      <p
        className={`text-[15px] font-bold ${
          accent ? "text-[#2effc0]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Chip({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "blue" | "violet" | "neutral";
}) {
  const map: Record<string, string> = {
    green: "bg-[#18d6a4]/15 text-[#2effc0] border-[#18d6a4]/30",
    blue: "bg-[#2d5cff]/15 text-[#9ab4ff] border-[#2d5cff]/30",
    violet: "bg-[#7a5cff]/15 text-[#c5b6ff] border-[#7a5cff]/30",
    neutral: "bg-white/[0.06] text-white/70 border-white/10",
  };
  return (
    <span
      className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border ${map[tone]}`}
    >
      {label}
    </span>
  );
}
