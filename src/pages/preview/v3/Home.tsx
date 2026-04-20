import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Search,
  Bell,
  MessageCircle,
  ArrowUpRight,
  ArrowDownRight,
  Building2,
  MapPin,
  Layers3,
  MoreHorizontal,
  TrendingUp,
} from "lucide-react";

/**
 * V3 Home — "Portfolio balance" pattern adapted for real estate. Hero
 * number is committed capital, currency pills become market tabs
 * (Dubai / Abu Dhabi / Global), quick actions map to RealSight verbs.
 */

const markets = [
  { id: "dxb", flag: "🇦🇪", label: "DXB", value: "AED 1.24M", active: true },
  { id: "auh", flag: "🇦🇪", label: "AUH", value: "AED 420K" },
  { id: "glb", flag: "🌍", label: "GLB", value: "$380K" },
];

const signals = [
  {
    tag: "Today",
    items: [
      {
        icon: <Layers3 className="h-4 w-4" />,
        accent: "bg-gradient-to-br from-[#2d5cff] to-[#7a5cff]",
        title: "Sobha Hartland II · 2BR",
        meta: "Deal Signal · Score 92",
        amount: "AED 2.85M",
        delta: "+18% yield",
        deltaColor: "text-[#2effc0]",
      },
      {
        icon: <Building2 className="h-4 w-4" />,
        accent: "bg-white/10",
        title: "Emaar Beachfront",
        meta: "New launch · 14 units",
        amount: "AED 4.2M",
        delta: "Prime",
        deltaColor: "text-white/70",
      },
    ],
  },
  {
    tag: "Yesterday",
    items: [
      {
        icon: <MapPin className="h-4 w-4" />,
        accent: "bg-white/10",
        title: "Business Bay · Studio",
        meta: "Resale · Below market",
        amount: "AED 1.1M",
        delta: "−6% vs. avg",
        deltaColor: "text-[#ff7a8a]",
      },
      {
        icon: <Building2 className="h-4 w-4" />,
        accent: "bg-white/10",
        title: "DAMAC Lagoons Villa",
        meta: "Payment plan · Q3",
        amount: "AED 3.6M",
        delta: "Trending",
        deltaColor: "text-[#2effc0]",
      },
    ],
  },
];

export default function V3Home() {
  return (
    <div className="relative px-5 text-white">
      {/* Top row */}
      <div className="flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2d5cff] to-[#7a5cff] p-[2px]">
            <div className="w-full h-full rounded-full bg-[#0a0f2e] flex items-center justify-center text-[12px] font-bold">
              BN
            </div>
          </div>
          <div>
            <p className="text-[11px] text-white/50 font-medium leading-none">
              Good evening
            </p>
            <p className="text-[15px] font-semibold leading-tight mt-0.5">
              Babak Nivi
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IconBtn>
            <MessageCircle className="h-4 w-4" />
          </IconBtn>
          <IconBtn dot>
            <Bell className="h-4 w-4" />
          </IconBtn>
        </div>
      </div>

      {/* Search pill */}
      <button className="w-full h-11 rounded-full bg-white/5 border border-white/10 flex items-center gap-2.5 px-4 text-[14px] text-white/50 mb-5 backdrop-blur-md">
        <Search className="h-4 w-4" />
        Search Dubai projects, neighborhoods…
      </button>

      {/* Market pills */}
      <div className="flex items-center gap-2 mb-5">
        {markets.map((m) => (
          <button
            key={m.id}
            className={`flex items-center gap-2 px-3 py-2 rounded-2xl border transition ${
              m.active
                ? "bg-white/10 border-white/20 shadow-[0_8px_24px_rgba(45,92,255,0.25)]"
                : "bg-white/[0.03] border-white/[0.08]"
            }`}
          >
            <span className="text-[15px]">{m.flag}</span>
            <div className="text-left">
              <p className="text-[9px] tracking-wider text-white/50 font-semibold leading-none">
                {m.label}
              </p>
              <p className="text-[11px] font-bold text-white leading-tight mt-0.5">
                {m.value}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Hero balance */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-1"
      >
        <p className="text-[11px] tracking-[0.2em] uppercase text-white/45 font-semibold">
          Committed Capital
        </p>
      </motion.div>
      <div className="flex items-end justify-between mb-6">
        <h1 className="text-[44px] font-black tracking-tight leading-none">
          <span className="text-white/70 text-[22px] align-top relative top-2 mr-1">
            AED
          </span>
          2,084,760
          <span className="text-white/50 text-[22px] align-top relative top-2 ml-1">
            .00
          </span>
        </h1>
        <div className="flex items-center gap-1 text-[#2effc0] text-[12px] font-bold mb-1">
          <TrendingUp className="h-3.5 w-3.5" />
          +14.2%
        </div>
      </div>

      {/* Card carousel (mini) */}
      <div className="flex items-center gap-2 mb-7">
        <MiniCard active color="linear-gradient(135deg,#2d5cff,#7a5cff)" />
        <MiniCard color="linear-gradient(135deg,#0e1a3a,#1a2a6b)" />
        <MiniCard color="rgba(255,255,255,0.1)" plus />
      </div>

      {/* Quick actions row */}
      <div className="grid grid-cols-4 gap-2.5 mb-7">
        <QuickAction label="Browse" icon={<Building2 className="h-5 w-5" />} />
        <QuickAction
          label="Analyze"
          icon={<Layers3 className="h-5 w-5" />}
          highlight
          to="/preview/v3/deal-analyzer"
        />
        <QuickAction label="Compare" icon={<ArrowUpRight className="h-5 w-5" />} />
        <QuickAction label="More" icon={<MoreHorizontal className="h-5 w-5" />} />
      </div>

      {/* Signals panel — mimics "transactions" section from reference */}
      <div className="relative rounded-t-[28px] -mx-5 px-5 pt-5 pb-2 bg-white/[0.04] backdrop-blur-xl border-t border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[17px] font-bold text-white">Live Signals</h2>
          <Link
            to="/preview/v3/radar"
            className="text-[13px] text-white/70 font-semibold"
          >
            View all
          </Link>
        </div>

        {signals.map((group) => (
          <div key={group.tag} className="mb-5">
            <p className="text-[11px] text-white/45 font-semibold mb-2.5 tracking-wide">
              {group.tag}
            </p>
            <div className="space-y-2.5">
              {group.items.map((item, idx) => (
                <motion.div
                  key={idx}
                  whileTap={{ scale: 0.98 }}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-white/[0.04] border border-white/[0.06]"
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${item.accent}`}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-white truncate">
                      {item.title}
                    </p>
                    <p className="text-[11px] text-white/50 truncate">
                      {item.meta}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-bold text-white">
                      {item.amount}
                    </p>
                    <p className={`text-[11px] font-semibold ${item.deltaColor}`}>
                      {item.delta}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ BITS ------------------------------ */

function IconBtn({
  children,
  dot,
}: {
  children: React.ReactNode;
  dot?: boolean;
}) {
  return (
    <button className="relative w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/80 backdrop-blur-md">
      {children}
      {dot && (
        <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#ff7a8a] ring-2 ring-[#0a0f2e]" />
      )}
    </button>
  );
}

function MiniCard({
  color,
  active,
  plus,
}: {
  color: string;
  active?: boolean;
  plus?: boolean;
}) {
  return (
    <div
      className={`relative w-14 h-9 rounded-lg overflow-hidden ${
        active ? "ring-2 ring-white/60" : ""
      }`}
      style={{ background: color }}
    >
      {!plus && (
        <svg viewBox="0 0 56 36" className="absolute inset-0 w-full h-full">
          <g stroke="white" strokeWidth="1.2" opacity="0.7">
            <line x1="28" y1="8" x2="28" y2="28" />
            <line x1="18" y1="14" x2="38" y2="22" />
            <line x1="38" y1="14" x2="18" y2="22" />
          </g>
        </svg>
      )}
      {plus && (
        <span className="absolute inset-0 flex items-center justify-center text-white/70 text-lg">
          +
        </span>
      )}
    </div>
  );
}

function QuickAction({
  label,
  icon,
  highlight,
  to,
}: {
  label: string;
  icon: React.ReactNode;
  highlight?: boolean;
  to?: string;
}) {
  const content = (
    <motion.div
      whileTap={{ scale: 0.95 }}
      className="flex flex-col items-center gap-1.5 py-3.5 rounded-2xl bg-white/[0.06] border border-white/[0.08] backdrop-blur-md"
    >
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${
          highlight
            ? "bg-gradient-to-br from-[#2effc0] to-[#18d6a4] text-black shadow-[0_6px_18px_rgba(24,214,164,0.45)]"
            : "bg-white/10"
        }`}
      >
        {icon}
      </div>
      <span className="text-[11px] font-semibold text-white/80 tracking-wide">
        {label}
      </span>
    </motion.div>
  );
  if (to) return <Link to={to}>{content}</Link>;
  return <button>{content}</button>;
}

// Prevent tree-shaking of ArrowDownRight if unused in this build
void ArrowDownRight;
