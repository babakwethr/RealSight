import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home as HomeIcon,
  Radar,
  Briefcase,
  User,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * V3 — Fresh mobile-first preview concept for RealSight.
 *
 * Design notes:
 *  - Deep-night gradient canvas with aurora blobs (premium fintech feel).
 *  - Status bar + dynamic-island-style top chrome rendered when framed.
 *  - Curved white bottom navigation with a protruding central FAB that
 *    launches the Deal Analyzer — the product's signature workflow.
 *  - On desktop (>= 640px) the UI is rendered inside a 390×844 phone frame
 *    so designers can review it without a device. On mobile it goes full
 *    bleed and becomes the actual app.
 */

export function V3Layout() {
  return <V3PhoneFrame showNav />;
}

export function V3PhoneFrame({ showNav }: { showNav?: boolean }) {
  return (
    <div className="v3-stage min-h-screen w-full flex items-center justify-center bg-[#050716]">
      {/* Ambient desktop backdrop — unseen on mobile */}
      <div className="hidden sm:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-[40rem] h-[40rem] rounded-full bg-[#2d5cff]/20 blur-[120px]" />
        <div className="absolute -bottom-32 -right-32 w-[40rem] h-[40rem] rounded-full bg-[#18d6a4]/15 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 w-[24rem] h-[24rem] rounded-full bg-[#7a5cff]/15 blur-[100px]" />
      </div>

      {/* Phone frame (desktop) / full-bleed (mobile) */}
      <div className="v3-phone-frame relative w-full sm:w-[390px] sm:h-[844px] sm:rounded-[54px] sm:overflow-hidden sm:ring-1 sm:ring-white/10 sm:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)] sm:bg-black">
        {/* The inner "screen" — this holds the app surface */}
        <V3Canvas showNav={showNav} />
      </div>
    </div>
  );
}

function V3Canvas({ showNav }: { showNav?: boolean }) {
  return (
    <div className="relative h-[100dvh] sm:h-full w-full overflow-hidden">
      {/* Cinematic gradient background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#1a2a6b_0%,_#0a0f2e_45%,_#05070f_100%)]" />
      <div className="absolute inset-0 opacity-70">
        <div className="absolute top-[-10%] left-[-20%] w-[70%] h-[70%] rounded-full bg-[#2d5cff] blur-[110px] opacity-40 animate-[ambient-drift_20s_ease-in-out_infinite_alternate]" />
        <div className="absolute bottom-[0%] right-[-20%] w-[70%] h-[60%] rounded-full bg-[#18d6a4] blur-[110px] opacity-25 animate-[ambient-drift_26s_ease-in-out_infinite_alternate]" />
        <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#7a5cff] blur-[90px] opacity-25" />
      </div>

      {/* Fine noise overlay for premium texture */}
      <div
        className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='1'/></svg>\")",
        }}
      />

      {/* Fake status bar — only on desktop frame */}
      <div className="hidden sm:flex absolute top-0 left-0 right-0 h-12 z-40 items-center justify-between px-7 text-[13px] font-semibold text-white/90 tracking-tight pointer-events-none">
        <span>9:41</span>
        <div className="absolute left-1/2 -translate-x-1/2 top-2 w-[110px] h-[28px] rounded-full bg-black/80" />
        <div className="flex items-center gap-1.5">
          <SignalBars />
          <WifiIcon />
          <BatteryIcon />
        </div>
      </div>

      {/* Page content scroll area */}
      <div
        className={`relative h-full w-full overflow-y-auto overflow-x-hidden pt-[env(safe-area-inset-top)] sm:pt-12 custom-scrollbar ${
          showNav ? "pb-[120px]" : "pb-0"
        }`}
      >
        <Outlet />
      </div>

      {/* Curved bottom nav with center Deal Analyzer FAB */}
      {showNav && <BottomNav />}
    </div>
  );
}

/* --------------------------------- NAV --------------------------------- */

function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (p: string) => location.pathname === p;

  return (
    <div className="absolute bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* SVG silhouette (curved bar with concave center notch) */}
      <svg
        viewBox="0 0 390 96"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 w-full h-[96px] drop-shadow-[0_-8px_32px_rgba(0,0,0,0.45)]"
      >
        <defs>
          <linearGradient id="navGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(20,24,48,0.9)" />
            <stop offset="100%" stopColor="rgba(10,13,32,0.96)" />
          </linearGradient>
        </defs>
        <path
          d="M0,28 L140,28 C155,28 158,60 195,60 C232,60 235,28 250,28 L390,28 L390,96 L0,96 Z"
          fill="url(#navGrad)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1"
        />
      </svg>

      {/* Tab items */}
      <div className="relative h-[96px] flex items-end pointer-events-auto">
        <div className="flex-1 flex items-center justify-around pb-4">
          <NavIcon
            label="Home"
            active={isActive("/preview/v3/home")}
            onClick={() => navigate("/preview/v3/home")}
            icon={<HomeIcon className="h-5 w-5" />}
          />
          <NavIcon
            label="Radar"
            active={isActive("/preview/v3/radar")}
            onClick={() => navigate("/preview/v3/radar")}
            icon={<Radar className="h-5 w-5" />}
          />
          {/* Spacer where the center FAB lives */}
          <div className="w-[72px]" />
          <NavIcon
            label="Portfolio"
            active={isActive("/preview/v3/portfolio")}
            onClick={() => navigate("/preview/v3/portfolio")}
            icon={<Briefcase className="h-5 w-5" />}
          />
          <NavIcon
            label="Profile"
            active={isActive("/preview/v3/profile")}
            onClick={() => navigate("/preview/v3/profile")}
            icon={<User className="h-5 w-5" />}
          />
        </div>

        {/* Center FAB — Deal Analyzer */}
        <Link
          to="/preview/v3/deal-analyzer"
          aria-label="Open Deal Analyzer"
          className="absolute left-1/2 -translate-x-1/2 -top-5"
        >
          <motion.div
            whileTap={{ scale: 0.94 }}
            className="relative w-[72px] h-[72px] rounded-full flex items-center justify-center"
          >
            <div className="absolute inset-0 rounded-full bg-[#18d6a4] blur-[18px] opacity-60 animate-pulse" />
            <div
              className="relative w-[64px] h-[64px] rounded-full flex items-center justify-center"
              style={{
                background:
                  "radial-gradient(circle at 30% 20%, #2effc0 0%, #18d6a4 45%, #059669 100%)",
                boxShadow:
                  "0 10px 30px rgba(24,214,164,0.45), inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -6px 10px rgba(0,0,0,0.2)",
              }}
            >
              <Sparkles className="h-7 w-7 text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]" />
            </div>
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-wide text-white/80">
              Analyze
            </span>
          </motion.div>
        </Link>
      </div>

      {/* Home-indicator bar (iOS style) */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-[120px] h-[5px] rounded-full bg-white/50" />
    </div>
  );
}

function NavIcon({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 px-3 py-1.5 group"
    >
      <motion.span
        whileTap={{ scale: 0.85 }}
        className={`transition-colors ${
          active ? "text-white" : "text-white/45 group-hover:text-white/70"
        }`}
      >
        {icon}
      </motion.span>
      <span
        className={`text-[10px] font-semibold tracking-wide transition-colors ${
          active ? "text-white" : "text-white/40"
        }`}
      >
        {label}
      </span>
      <AnimatePresence>
        {active && (
          <motion.span
            layoutId="v3-nav-dot"
            className="absolute bottom-2 h-1 w-1 rounded-full bg-[#18d6a4]"
          />
        )}
      </AnimatePresence>
    </button>
  );
}

/* ------------------------------ STATUS ICONS ------------------------------ */

function SignalBars() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
      <rect x="0" y="7" width="3" height="4" rx="0.5" />
      <rect x="4.5" y="5" width="3" height="6" rx="0.5" />
      <rect x="9" y="3" width="3" height="8" rx="0.5" />
      <rect x="13.5" y="0" width="3" height="11" rx="0.5" />
    </svg>
  );
}
function WifiIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
      <path d="M8 10.5a1.3 1.3 0 1 0 0-2.6 1.3 1.3 0 0 0 0 2.6Zm0-5.2a3.9 3.9 0 0 1 2.76 1.14l1.84-1.84A6.5 6.5 0 0 0 3.4 4.6l1.84 1.84A3.9 3.9 0 0 1 8 5.3Zm0-5.2a9.1 9.1 0 0 1 6.45 2.67l1.84-1.84A11.7 11.7 0 0 0-.29 1.43l1.84 1.84A9.1 9.1 0 0 1 8 .1Z" />
    </svg>
  );
}
function BatteryIcon() {
  return (
    <svg width="28" height="12" viewBox="0 0 28 12" fill="none">
      <rect
        x="0.5"
        y="0.5"
        width="23"
        height="11"
        rx="3"
        stroke="currentColor"
        opacity="0.4"
      />
      <rect x="2" y="2" width="20" height="8" rx="1.5" fill="currentColor" />
      <rect x="25" y="4" width="2" height="4" rx="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

export default V3Layout;
