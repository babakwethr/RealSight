import { motion } from "framer-motion";
import { Filter, Flame, TrendingUp, Building2 } from "lucide-react";

const tabs = ["Hot", "New", "Undervalued", "Off-market"];

const radarItems = [
  {
    dev: "Sobha",
    title: "Hartland II · 2BR",
    score: 96,
    yield: "7.8%",
    price: "AED 2.42M",
    trend: "+22%",
    hot: true,
  },
  {
    dev: "Emaar",
    title: "Marina Shores · Penthouse",
    score: 91,
    yield: "6.2%",
    price: "AED 7.80M",
    trend: "+16%",
  },
  {
    dev: "DAMAC",
    title: "Chelsea Residences · 1BR",
    score: 88,
    yield: "6.9%",
    price: "AED 1.35M",
    trend: "+14%",
  },
  {
    dev: "Nakheel",
    title: "Palm Beach Tower · 3BR",
    score: 85,
    yield: "5.4%",
    price: "AED 5.10M",
    trend: "+9%",
  },
];

export default function V3Radar() {
  return (
    <div className="text-white px-5 pt-2 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-white/50 font-semibold tracking-wide uppercase">
            Market Radar
          </p>
          <h1 className="text-[26px] font-black leading-tight">
            Live Opportunities
          </h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Filter className="h-4 w-4" />
        </button>
      </div>

      {/* Radar visual */}
      <div className="relative rounded-[28px] overflow-hidden mb-5 border border-white/10">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 50% 60%, rgba(24,214,164,0.35), rgba(45,92,255,0.15) 40%, rgba(10,13,32,0.9) 80%)",
          }}
        />
        <div className="relative p-5 pb-6">
          <div className="relative h-[200px] flex items-center justify-center">
            {/* rings */}
            {[40, 80, 120].map((r) => (
              <div
                key={r}
                className="absolute rounded-full border border-[#2effc0]/20"
                style={{ width: r * 2, height: r * 2 }}
              />
            ))}
            {/* sweep */}
            <motion.div
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute w-[240px] h-[240px]"
              style={{
                background:
                  "conic-gradient(from 0deg, rgba(46,255,192,0.6) 0deg, rgba(46,255,192,0) 60deg)",
                borderRadius: "50%",
                maskImage:
                  "radial-gradient(circle, black 58%, transparent 60%)",
              }}
            />
            {/* center mark */}
            <div className="relative w-3 h-3 rounded-full bg-[#2effc0] shadow-[0_0_20px_#2effc0]" />
            {/* blips */}
            {[
              { x: -70, y: -50, size: 8 },
              { x: 40, y: -80, size: 10 },
              { x: 90, y: 20, size: 6 },
              { x: -60, y: 60, size: 7 },
              { x: 20, y: 90, size: 9 },
            ].map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0.3, scale: 0.8 }}
                animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
                transition={{
                  duration: 2.4,
                  repeat: Infinity,
                  delay: i * 0.3,
                }}
                className="absolute rounded-full bg-[#2effc0] shadow-[0_0_14px_#2effc0]"
                style={{
                  width: b.size,
                  height: b.size,
                  transform: `translate(${b.x}px, ${b.y}px)`,
                }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1.5 text-[#2effc0]">
              <Flame className="h-4 w-4" />
              <span className="text-[12px] font-bold">
                12 hot signals nearby
              </span>
            </div>
            <span className="text-[10px] text-white/50 font-semibold tracking-widest uppercase">
              Dubai · Live
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-4 overflow-x-auto no-scrollbar">
        {tabs.map((t, i) => (
          <button
            key={t}
            className={`shrink-0 px-3.5 py-2 rounded-full text-[12px] font-semibold border ${
              i === 0
                ? "bg-white text-black border-white"
                : "bg-white/[0.04] border-white/[0.08] text-white/70"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2.5">
        {radarItems.map((it, i) => (
          <motion.div
            key={i}
            whileTap={{ scale: 0.98 }}
            className="relative flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
          >
            <div className="relative">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                style={{
                  background: "linear-gradient(135deg,#2d5cff,#7a5cff)",
                }}
              >
                <Building2 className="h-5 w-5" />
              </div>
              {it.hot && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#ff5a7a] flex items-center justify-center">
                  <Flame className="h-2.5 w-2.5 text-white" />
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-white truncate">
                {it.title}
              </p>
              <p className="text-[11px] text-white/50">
                {it.dev} · yield {it.yield}
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 justify-end">
                <span
                  className="text-[13px] font-black"
                  style={{
                    background:
                      "linear-gradient(90deg,#2effc0,#9ab4ff)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {it.score}
                </span>
                <span className="text-[10px] text-white/40 font-semibold">
                  /100
                </span>
              </div>
              <p className="text-[11px] text-white/60">{it.price}</p>
              <p className="text-[10px] text-[#2effc0] font-semibold flex items-center justify-end gap-0.5">
                <TrendingUp className="h-2.5 w-2.5" />
                {it.trend}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
