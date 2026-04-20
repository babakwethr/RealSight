import {
  Settings,
  ChevronRight,
  Shield,
  CreditCard,
  Bell,
  Globe,
  LifeBuoy,
  LogOut,
  Sparkles,
  Crown,
} from "lucide-react";

const rows = [
  { icon: <CreditCard className="h-4 w-4" />, label: "Billing & plan", sub: "Portfolio Pro · Renews May 14" },
  { icon: <Shield className="h-4 w-4" />, label: "Security", sub: "Face ID enabled · 2FA on" },
  { icon: <Bell className="h-4 w-4" />, label: "Notifications", sub: "5 channels active" },
  { icon: <Globe className="h-4 w-4" />, label: "Language & region", sub: "English · AED" },
  { icon: <LifeBuoy className="h-4 w-4" />, label: "Help & support" },
];

export default function V3Profile() {
  return (
    <div className="text-white px-5 pt-2 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[11px] text-white/50 font-semibold tracking-wide uppercase">
            Account
          </p>
          <h1 className="text-[26px] font-black leading-tight">Profile</h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
          <Settings className="h-4 w-4" />
        </button>
      </div>

      {/* Identity card */}
      <div
        className="relative rounded-[28px] p-5 overflow-hidden mb-5"
        style={{
          background:
            "linear-gradient(135deg,#0f1635 0%, #1a2a6b 55%, #7a5cff 100%)",
        }}
      >
        <div className="absolute -right-10 -top-10 w-44 h-44 rounded-full bg-[#18d6a4]/25 blur-[60px]" />
        <div className="flex items-center gap-4 relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#2effc0] to-[#2d5cff] p-[2px]">
            <div className="w-full h-full rounded-full bg-[#0a0f2e] flex items-center justify-center text-[22px] font-black">
              BN
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[17px] font-bold leading-tight">Babak Nivi</p>
            <p className="text-[12px] text-white/60">babakwethr@gmail.com</p>
            <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/15 border border-white/20">
              <Crown className="h-3 w-3 text-[#2effc0]" />
              <span className="text-[10px] font-bold tracking-wider uppercase">
                Portfolio Pro
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Upgrade banner */}
      <div
        className="relative rounded-2xl p-4 mb-5 overflow-hidden"
        style={{
          background:
            "linear-gradient(90deg, rgba(24,214,164,0.18), rgba(24,214,164,0.04))",
          border: "1px solid rgba(24,214,164,0.3)",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#18d6a4] text-black flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-bold">Unlock Institutional</p>
            <p className="text-[11px] text-white/60">
              Off-market deals · Dubai Heatmap · custom alerts
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/50" />
        </div>
      </div>

      {/* Rows */}
      <div className="rounded-3xl bg-white/[0.04] border border-white/[0.08] overflow-hidden backdrop-blur-md">
        {rows.map((r, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] last:border-0 text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70">
              {r.icon}
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-white">{r.label}</p>
              {r.sub && <p className="text-[11px] text-white/50">{r.sub}</p>}
            </div>
            <ChevronRight className="h-4 w-4 text-white/40" />
          </button>
        ))}
      </div>

      {/* Sign out */}
      <button className="w-full mt-6 h-[50px] rounded-full bg-white/5 border border-white/10 flex items-center justify-center gap-2 text-white/70 text-[14px] font-semibold">
        <LogOut className="h-4 w-4" /> Sign out
      </button>

      <p className="text-center text-[10px] text-white/30 mt-6 tracking-widest uppercase">
        RealSight · v3 preview
      </p>
    </div>
  );
}
