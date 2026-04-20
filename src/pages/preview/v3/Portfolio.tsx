import { motion } from "framer-motion";
import { Building2, TrendingUp, Eye, MapPin } from "lucide-react";

const holdings = [
  {
    name: "Marina Vista · 2BR",
    developer: "Emaar",
    price: "AED 2.85M",
    yield: "7.5%",
    change: "+12.4%",
    color: "linear-gradient(135deg,#2d5cff,#7a5cff)",
  },
  {
    name: "Hartland II · Apt 1802",
    developer: "Sobha",
    price: "AED 1.62M",
    yield: "6.8%",
    change: "+8.9%",
    color: "linear-gradient(135deg,#18d6a4,#2d5cff)",
  },
  {
    name: "DAMAC Lagoons Villa",
    developer: "DAMAC",
    price: "AED 3.60M",
    yield: "5.2%",
    change: "+4.1%",
    color: "linear-gradient(135deg,#ff9a5a,#ff5a7a)",
  },
];

export default function V3Portfolio() {
  return (
    <div className="text-white px-5 pt-2 pb-8">
      {/* Title */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-white/50 font-semibold tracking-wide uppercase">
            Portfolio
          </p>
          <h1 className="text-[26px] font-black leading-tight">My Holdings</h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Eye className="h-4 w-4" />
        </button>
      </div>

      {/* Performance card */}
      <motion.div
        initial={{ y: 8, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative rounded-[28px] p-5 overflow-hidden mb-5"
        style={{
          background:
            "linear-gradient(135deg,#0f1635 0%, #1a2a6b 55%, #2d5cff 100%)",
        }}
      >
        <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-[#18d6a4]/20 blur-[60px]" />
        <p className="text-white/60 text-[12px] font-semibold">Portfolio Value</p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-[40px] font-black leading-none">
            <span className="text-white/60 text-[18px] mr-1 align-top relative top-2">
              AED
            </span>
            8.07M
          </span>
          <div className="ml-auto flex items-center gap-1 mb-1 px-2.5 py-1 rounded-full bg-[#18d6a4]/20 border border-[#18d6a4]/40">
            <TrendingUp className="h-3.5 w-3.5 text-[#2effc0]" />
            <span className="text-[#2effc0] text-[11px] font-bold">+9.8%</span>
          </div>
        </div>

        {/* Mini chart */}
        <div className="mt-5">
          <svg viewBox="0 0 320 60" className="w-full h-[60px]">
            <defs>
              <linearGradient id="pf-line" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0%" stopColor="#2effc0" />
                <stop offset="100%" stopColor="#9ab4ff" />
              </linearGradient>
              <linearGradient id="pf-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2effc0" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#2effc0" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 48 L20 40 L40 42 L60 32 L80 36 L100 28 L120 22 L140 28 L160 18 L180 22 L200 12 L220 16 L240 8 L260 14 L280 6 L300 10 L320 2 L320 60 L0 60 Z"
              fill="url(#pf-fill)"
            />
            <path
              d="M0 48 L20 40 L40 42 L60 32 L80 36 L100 28 L120 22 L140 28 L160 18 L180 22 L200 12 L220 16 L240 8 L260 14 L280 6 L300 10 L320 2"
              fill="none"
              stroke="url(#pf-line)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>
          <div className="flex items-center justify-between mt-2 text-[10px] text-white/40 font-semibold">
            {["1M", "3M", "6M", "1Y", "ALL"].map((p, i) => (
              <button
                key={p}
                className={`px-2.5 py-1 rounded-full ${
                  i === 3
                    ? "bg-white/10 text-white"
                    : "hover:text-white/70"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2.5 mb-6">
        <StatCard label="Properties" value="3" />
        <StatCard label="Avg. Yield" value="6.5%" accent />
        <StatCard label="Occupancy" value="94%" />
      </div>

      {/* Holdings */}
      <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/50 mb-3">
        Units
      </p>
      <div className="space-y-2.5">
        {holdings.map((h, i) => (
          <motion.div
            key={i}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
          >
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ background: h.color }}
            >
              <Building2 className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white truncate">
                {h.name}
              </p>
              <div className="flex items-center gap-1.5 text-[11px] text-white/50">
                <MapPin className="h-3 w-3" /> {h.developer} · yield {h.yield}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[14px] font-bold text-white">{h.price}</p>
              <p className="text-[11px] font-semibold text-[#2effc0]">
                {h.change}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] px-3 py-3">
      <p className="text-[10px] text-white/50 font-semibold tracking-wide">
        {label}
      </p>
      <p
        className={`text-[20px] font-black mt-0.5 ${
          accent ? "text-[#2effc0]" : "text-white"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
