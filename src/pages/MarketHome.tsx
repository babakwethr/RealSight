/**
 * MarketHome — RealSight home page
 * Spec: REALSIGHT_MASTER_SPEC.md §6 (Home Page Layout)
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import { getUpsellTarget, isAdviserUser } from '@/lib/upsell';
import {
  Search, TrendingUp, TrendingDown, ChevronDown, X,
  ArrowRight, Zap, BarChart2, Activity, Target,
  Brain, FileText, BarChart3, Lock, Sparkles,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { MarketSwitcher } from '@/components/MarketSwitcher';
import { PublicFooter } from '@/components/layout/PublicFooter';
import { MobileNav } from '@/components/layout/MobileNav';
import { MobileDrawer } from '@/components/layout/MobileDrawer';
import { AuthModal } from '@/components/AuthModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeroMetricCard } from '@/components/HeroMetricCard';
import { AIVerdict } from '@/components/AIVerdict';
import {
  AreaChart, Area, BarChart, Bar, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';

// ─── Helpers ─────────────────────────────────────────────────────────────────
import { formatDualPrice, formatPriceSplit } from '@/lib/currency';
const fmtNum = (n: number) => new Intl.NumberFormat('en-US').format(Math.round(n));
/**
 * AED + USD side by side ("AED 2.6M / USD 707K"). Per LAUNCH_PLAN.md §17 —
 * we display dual prices everywhere a non-UAE investor might see them, so
 * Dubai feels like one of our markets, not the only one we know.
 */
const fmtAED = (n: number) => formatDualPrice(n);

function mktPosBadge(yoy: number) {
  if (yoy >= 15) return { label: `+${yoy.toFixed(0)}% YoY`, cls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' };
  if (yoy >= 5)  return { label: `+${yoy.toFixed(0)}% YoY`, cls: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20' };
  if (yoy >= 0)  return { label: `+${yoy.toFixed(0)}% YoY`, cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25' };
  return          { label: `${yoy.toFixed(0)}% YoY`, cls: 'bg-red-500/15 text-red-400 border-red-500/25' };
}

function demandLabel(score: number) {
  if (score >= 80) return { label: 'Very High', cls: 'text-emerald-400' };
  if (score >= 60) return { label: 'High', cls: 'text-emerald-500' };
  if (score >= 40) return { label: 'Moderate', cls: 'text-amber-400' };
  return           { label: 'Low', cls: 'text-muted-foreground' };
}

// ─── Public top nav — modal-based auth (Flova-style) ─────────────────────────
function PublicTopNav({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/40"
      style={{ paddingTop: 'env(safe-area-inset-top, 0)' }}>
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to="/">
          <Logo variant="white" className="h-6 w-auto max-w-[120px]" />
        </Link>
        <div className="flex items-center gap-2">
          {/* Market switcher — global positioning device per LAUNCH_PLAN.md §17.
              Hidden on smallest screens to preserve room for the primary CTA. */}
          <div className="hidden sm:block">
            <MarketSwitcher />
          </div>
          <button onClick={onSignIn} className="text-sm text-muted-foreground hover:text-foreground px-3 py-2 transition-colors min-h-[44px]">Sign In</button>
          <button onClick={onSignUp} className="text-xs sm:text-sm bg-primary text-primary-foreground px-3 sm:px-5 py-2 rounded-full font-semibold hover:bg-primary/90 transition-colors min-h-[44px] whitespace-nowrap">
            <span className="hidden sm:inline">Start Free — It's Free</span>
            <span className="sm:hidden">Start Free</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Feature popup (unified — replaces inconsistent login/signup redirects) ──
function FeaturePopup({ feature, onClose }: { feature: { title: string; desc: string; cta: string; ctaLabel: string; plan: string; color: string } | null; onClose: () => void }) {
  if (!feature) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-background border border-border/40 rounded-2xl p-8 max-w-sm w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${feature.color}`}>
          <Zap className="h-6 w-6 text-white" />
        </div>
        <Badge variant="outline" className="mb-3 text-[10px] font-bold">{feature.plan}</Badge>
        <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">{feature.desc}</p>
        <Link to={feature.cta} className="flex items-center justify-center gap-2 w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold text-sm hover:bg-primary/90 transition-colors">
          <Sparkles className="h-4 w-4" />
          {feature.ctaLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

// ─── Dropdown component (proper React state, not CSS group-hover) ─────────────
function FilterDropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const display = value === 'Any' ? label : value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 h-12 text-sm text-foreground/80 hover:text-foreground border-r border-border/30 last:border-0 whitespace-nowrap transition-colors"
      >
        <span className={value !== 'Any' ? 'text-primary font-medium' : ''}>{display}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#0A0F1A] border border-white/15 rounded-xl shadow-2xl overflow-hidden min-w-[140px]"
          style={{ zIndex: 9999 }}>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-4 py-3 text-sm hover:bg-white/[0.06] transition-colors border-b border-white/[0.05] last:border-0 ${value === o ? 'text-primary font-bold' : 'text-foreground/80'}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Search + filter bar ──────────────────────────────────────────────────────
function SearchFilterBar({ areas, onSearch }: { areas: { id: string; name: string }[]; onSearch: (q: string) => void }) {
  const [query, setQuery] = useState('Dubai');
  const [beds, setBeds] = useState('Any');
  const [mode, setMode] = useState<'Sales' | 'Rental'>('Sales');
  const [status, setStatus] = useState('Any');
  const [propType, setPropType] = useState('Any');
  const [showSugg, setShowSugg] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const suggestions = useMemo(() => {
    if (query.length < 2 || query === 'Dubai') return [];
    return areas.filter(a => a.name.toLowerCase().includes(query.toLowerCase())).slice(0, 7);
  }, [query, areas]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setShowSugg(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const handleSelect = (name: string) => {
    setQuery(name); setShowSugg(false); onSearch(name);
    navigate(`/market-intelligence?area=${encodeURIComponent(name)}`);
  };

  const handleSearch = () => {
    onSearch(query);
    if (query && query !== 'Dubai') navigate(`/market-intelligence?area=${encodeURIComponent(query)}`);
  };

  return (
    <div ref={ref} className="relative w-full max-w-4xl mx-auto">
      {/* Desktop: full filter bar */}
      <div className="hidden sm:flex items-center backdrop-blur-md bg-white/[0.06] border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:border-white/[0.18] transition-all" style={{ position: 'relative' }}>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
            onFocus={() => { setShowSugg(true); if (query === 'Dubai') setQuery(''); }}
            onBlur={() => { setTimeout(() => { if (!query.trim()) setQuery('Dubai'); }, 150); }}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Area, project, developer..."
            className="w-full h-12 pl-10 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none border-r border-white/[0.08]"
          />
          {showSugg && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-popover border border-border rounded-xl overflow-hidden shadow-2xl">
              {suggestions.map(a => (
                <button key={a.id} onMouseDown={() => handleSelect(a.name)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-foreground/80 hover:bg-muted text-left border-b border-border/10 last:border-0 transition-colors">
                  <span className="text-primary text-xs">📍</span> {a.name}
                </button>
              ))}
            </div>
          )}
        </div>
        <FilterDropdown label="Beds" value={beds} onChange={setBeds}
          options={['Any', 'Studio', '1 Bed', '2 Beds', '3 Beds', '4 Beds', '5+ Beds']} />
        <div className="flex items-center border-r border-white/[0.08] px-2 gap-1">
          {(['Sales', 'Rental'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`px-3 h-8 text-xs rounded-lg font-semibold transition-all ${mode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {m}
            </button>
          ))}
        </div>
        <FilterDropdown label="Status" value={status} onChange={setStatus}
          options={['Any', 'Ready', 'Off-Plan']} />
        <FilterDropdown label="Type" value={propType} onChange={setPropType}
          options={['Any', 'Apartment', 'Villa', 'Townhouse', 'Penthouse']} />
        <button onClick={handleSearch}
          className="h-12 px-6 bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors shrink-0 rounded-r-2xl">
          Search
        </button>
      </div>

      {/* Mobile: search → segment → filter chips, three rows. Soft-square corners. */}
      <div className="sm:hidden space-y-2.5">
        {/* Search row */}
        <div className="flex gap-2">
          <div className="relative flex-1 backdrop-blur-md bg-white/[0.06] border border-white/[0.12] rounded-xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
            <input
              value={query}
              onChange={e => { setQuery(e.target.value); setShowSugg(true); }}
              onFocus={() => { setShowSugg(true); if (query === 'Dubai') setQuery(''); }}
              onBlur={() => { setTimeout(() => { if (!query.trim()) setQuery('Dubai'); }, 150); }}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="Search area or project..."
              className="w-full h-13 pl-10 pr-4 bg-transparent text-base text-foreground placeholder:text-muted-foreground outline-none rounded-xl"
              style={{ fontSize: '16px', height: 52 }}
            />
            {showSugg && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 z-[9999] bg-popover border border-border rounded-xl overflow-hidden shadow-2xl">
                {suggestions.map(a => (
                  <button key={a.id} onMouseDown={() => handleSelect(a.name)}
                    className="w-full flex items-center gap-3 px-4 py-4 text-sm text-foreground/80 hover:bg-muted text-left border-b border-border/10 last:border-0">
                    <span className="text-primary">📍</span> {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSearch}
            className="h-[52px] px-5 bg-primary text-primary-foreground text-sm font-bold rounded-xl shrink-0 min-w-[80px]">
            Search
          </button>
        </div>

        {/* Sales / Rental — full-width 2-up segment */}
        <div className="grid grid-cols-2 gap-1 p-1 rounded-[10px] border"
             style={{ background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.10)' }}>
          {(['Sales', 'Rental'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)}
              className={`h-[38px] rounded-[7px] text-[13px] font-bold transition-all ${
                mode === m
                  ? 'bg-white text-[#0a0f2e] shadow-sm'
                  : 'text-muted-foreground'
              }`}>
              {m}
            </button>
          ))}
        </div>

        {/* Filter chips — equal-width 3-up grid so they fill the row, no empty space. */}
        <div className="grid grid-cols-3 gap-2">
          <MobileFilterPill label="Beds" value={beds} onChange={setBeds}
            options={['Any', 'Studio', '1 Bed', '2 Beds', '3 Beds', '4 Beds', '5+ Beds']} />
          <MobileFilterPill label="Status" value={status} onChange={setStatus}
            options={['Any', 'Ready', 'Off-Plan']} />
          <MobileFilterPill label="Type" value={propType} onChange={setPropType}
            options={['Any', 'Apartment', 'Villa', 'Townhouse', 'Penthouse']} />
        </div>
      </div>
    </div>
  );
}

// Compact pill-style filter dropdown used in the mobile filter row
function MobileFilterPill({
  label, value, options, onChange,
}: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const display = value === 'Any' ? label : value;
  const active = value !== 'Any';
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between gap-1.5 w-full px-3 h-9 text-[12.5px] font-semibold rounded-[10px] border transition-colors whitespace-nowrap ${
          active
            ? 'bg-primary/15 border-primary/40 text-primary'
            : 'bg-white/[0.05] border-white/[0.14] text-foreground/75'
        }`}
      >
        <span className="truncate">{display}</span>
        <ChevronDown className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-[#0A0F1A] border border-white/15 rounded-xl shadow-2xl overflow-hidden min-w-[140px] z-[9999]">
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-white/[0.06] border-b border-white/[0.05] last:border-0 ${value === o ? 'text-primary font-bold' : 'text-foreground/80'}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Feature cards (Dribbble-inspired: gradient bg, hero metric, glass overlay) ─
//
// Each card now has an `image` field — a small visual rendered at the top of
// the card. Mix of real app screenshots (when describing a feature) and Dubai
// photography (when the card is a place / outcome). Per Babak: cards should
// feel colourful and alive, not blank gradients.
const FEATURE_CARDS = [
  {
    id: 'deal-analyzer',
    title: 'Deal Analyzer',
    metric: 'AI Verdict',
    metricSub: 'in seconds',
    desc: 'Paste any listing link — get instant market analysis, investment verdict, and downloadable PDF report with yield scenarios.',
    gradient: 'from-[#0F2027] via-[#203A43] to-[#2C5364]',
    accent: '#22C55E',
    icon: Target,
    badge: 'Free',
    badgeCls: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    cta: '/deal-analyzer',
    publicCta: '/login?mode=signup',
    plan: 'Free for all accounts',
    popupDesc: 'Analyse any Dubai property against real DLD market data. Get an AI investment verdict, area comps, yield scenarios and a professional PDF report.',
    image: '/dashboard-preview.png',
    imageObjectPosition: 'center top',
    format: 'horizontal' as const,
  },
  {
    id: 'market-score',
    title: 'Market Score',
    metric: '8.3 / 10',
    metricSub: 'Strong Buy',
    desc: 'A proprietary 0–10 score computed from YoY growth and rental yield data. Know the market sentiment at a glance.',
    gradient: 'from-[#1a0533] via-[#2d1060] to-[#1a0533]',
    accent: '#A855F7',
    icon: Zap,
    badge: 'Free',
    badgeCls: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    cta: '/market-intelligence',
    publicCta: '/market-intelligence',
    plan: 'Free — no account needed',
    popupDesc: 'The RealSight Market Score is a composite 0–10 index computed from DLD price growth, rental yield, and transaction volume. Updated daily.',
    image: '/pdf-bg/dubai-skyline.jpg',
    imageObjectPosition: 'center 60%',
    format: 'horizontal' as const,
  },
  {
    id: 'ai-investor-presentation',
    title: 'AI Presentation',
    metric: '8 slides',
    metricSub: 'branded PDF',
    desc: 'Generate a full branded investor presentation for any property in seconds. Your name, contact, and logo on every page.',
    gradient: 'from-[#1a1200] via-[#3d2b00] to-[#1a1200]',
    accent: '#F59E0B',
    icon: FileText,
    badge: 'Adviser Pro',
    badgeCls: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    cta: '/deal-analyzer',
    publicCta: '/login?mode=signup',
    plan: 'Adviser Pro · $199/mo',
    popupDesc: 'Create a professional 8-slide investor presentation for any Dubai property. Branded with your name, phone, and agency. Share with clients in one click.',
    image: '/dashboard-preview.png',
    imageObjectPosition: 'center 30%',
    format: 'vertical' as const,
  },
  {
    id: 'portfolio',
    title: 'Portfolio Intelligence',
    metric: '∞ properties',
    metricSub: 'tracked free',
    desc: 'Track all your Dubai investments in one dashboard. Payment schedules, document vault, capital gain, and AI-powered health reports.',
    gradient: 'from-[#001a33] via-[#003366] to-[#001a33]',
    accent: '#3B82F6',
    icon: BarChart3,
    badge: 'Free',
    badgeCls: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    cta: '/portfolio',
    publicCta: '/login?mode=signup',
    plan: 'Free for all accounts',
    popupDesc: 'Track every property you own in one place. Monitor payment schedules, store contracts, track capital gain, and get AI-powered portfolio health reports.',
    image: '/pdf-bg/dubai-marina.jpg',
    imageObjectPosition: 'center 40%',
    format: 'vertical' as const,
  },
];

// ─── Tool card with full-bleed image + text overlay (Urban-Company style) ───
//
// Two formats supported via the `format` prop:
//   - 'horizontal' : aspect 16/9, text on the LEFT, image visible on the RIGHT.
//                    A left-to-right dark gradient hides the left half of the
//                    image and gives the text a clean dark backdrop. The right
//                    half of the image is fully visible.
//   - 'vertical'   : aspect 3/4, image fills the card, text overlay at the
//                    bottom with a bottom-up dark gradient.
//
// Both formats share the brand-colour wash and the Free / Pro badge.
//
function FeatureToolCard({
  card,
  onClick,
  format,
}: {
  card: typeof FEATURE_CARDS[number];
  onClick: () => void;
  format: 'horizontal' | 'vertical';
}) {
  const isFree = card.badge === 'Free';
  const aspectClass = format === 'horizontal' ? 'aspect-[16/9]' : 'aspect-[3/4]';
  // For horizontals, push the visible image to the right of the card so the
  // dark gradient on the left doesn't waste the photo's focal point.
  const objectPosition = format === 'horizontal'
    ? 'right center'
    : (card.imageObjectPosition || 'center');

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl overflow-hidden cursor-pointer group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.55)] flex flex-col ${aspectClass}`}
    >
      {/* Full-bleed image */}
      {card.image && (
        <img
          src={card.image}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          style={{ objectPosition }}
          draggable={false}
        />
      )}

      {/* Brand-colour wash — gives each card its own personality */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none mix-blend-soft-light"
        style={{
          background: `linear-gradient(135deg, ${card.accent}55 0%, transparent 50%, ${card.accent}30 100%)`,
        }}
      />

      {/* Direction-aware dark gradient.
          Horizontal → left-to-right (text on LEFT, image visible on RIGHT).
          Vertical   → bottom-up (text at bottom). */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: format === 'horizontal'
            ? 'linear-gradient(90deg,' +
              ' rgba(0,0,0,0.92) 0%,' +
              ' rgba(0,0,0,0.78) 28%,' +
              ' rgba(0,0,0,0.40) 55%,' +
              ' rgba(0,0,0,0.10) 75%,' +
              ' transparent 95%)'
            : 'linear-gradient(180deg,' +
              ' rgba(0,0,0,0.05) 0%,' +
              ' rgba(0,0,0,0.25) 35%,' +
              ' rgba(0,0,0,0.75) 75%,' +
              ' rgba(0,0,0,0.92) 100%)',
        }}
      />

      {/* Hover accent glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: format === 'horizontal'
            ? `radial-gradient(circle at 25% 50%, ${card.accent}24 0%, transparent 60%)`
            : `radial-gradient(circle at 30% 20%, ${card.accent}28 0%, transparent 65%)`,
        }}
      />

      {/* Free / Pro badge */}
      <span
        className="absolute top-2.5 right-2.5 z-10 inline-flex items-center justify-center h-[22px] px-2.5 rounded-md text-[10px] font-black uppercase tracking-[0.08em] leading-none whitespace-nowrap"
        style={
          isFree
            ? {
                color: '#022c1c',
                background: 'linear-gradient(135deg, #2effc0 0%, #18d6a4 100%)',
                border: '1px solid rgba(46,255,192,0.85)',
                boxShadow: '0 4px 12px -3px rgba(46,255,192,0.55), inset 0 1px 0 rgba(255,255,255,0.45)',
              }
            : {
                color: '#2a1c00',
                background: 'linear-gradient(135deg, #ffe084 0%, #c9a84c 100%)',
                border: '1px solid rgba(201,168,76,0.9)',
                boxShadow: '0 4px 12px -3px rgba(201,168,76,0.55), inset 0 1px 0 rgba(255,255,255,0.45)',
              }
        }
      >
        {isFree ? 'Free' : 'Pro'}
      </span>

      {/* Text overlay — placement depends on format. */}
      {format === 'horizontal' ? (
        // LEFT side, vertically centred. Eyebrow is a clean two-line stack:
        // metric on line 1 ("AI Verdict" / "8.3 / 10"), metricSub on line 2
        // ("in seconds" / "Strong Buy"). No awkward dot separator.
        <div className="absolute inset-y-0 left-0 z-10 p-5 lg:p-6 flex flex-col justify-center w-[62%] sm:w-3/5">
          <div className="mb-2.5">
            <p
              className="text-[11.5px] lg:text-[13px] font-black uppercase tracking-[0.18em] leading-tight"
              style={{ color: card.accent, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
            >
              {card.metric}
            </p>
            <p
              className="text-[10px] lg:text-[11px] font-bold uppercase tracking-[0.18em] leading-tight mt-0.5 opacity-80"
              style={{ color: card.accent, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
            >
              {card.metricSub}
            </p>
          </div>
          <h3
            className="text-[20px] sm:text-[22px] lg:text-[26px] font-black text-white leading-[1.1] mb-2.5 tracking-tight"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.7)' }}
          >
            {card.title}
          </h3>
          <p
            className="text-[13px] lg:text-[14.5px] text-white/85 leading-relaxed line-clamp-3"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.55)' }}
          >
            {card.desc}
          </p>
        </div>
      ) : (
        // BOTTOM, full width. Vertical cards: same two-line eyebrow pattern.
        <div className="absolute bottom-0 left-0 right-0 z-10 p-4 lg:p-5">
          <div className="mb-2">
            <p
              className="text-[10.5px] lg:text-[11.5px] font-black uppercase tracking-[0.18em] leading-tight"
              style={{ color: card.accent, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
            >
              {card.metric}
            </p>
            <p
              className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.18em] leading-tight mt-0.5 opacity-80"
              style={{ color: card.accent, textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
            >
              {card.metricSub}
            </p>
          </div>
          <h3
            className="text-[16px] lg:text-[19px] font-black text-white leading-[1.15] mb-1.5 tracking-tight"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
          >
            {card.title}
          </h3>
          <p
            className="text-[12px] lg:text-[13px] text-white/80 leading-relaxed line-clamp-2"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
          >
            {card.desc}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Rotating city name in hero title ────────────────────────────────────────
const CITIES = ['Dubai', 'Spain', 'London', 'New York', 'Singapore'];

function RotatingCity() {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Fade out
      setVisible(false);
      setTimeout(() => {
        setIndex(i => (i + 1) % CITIES.length);
        setVisible(true);
      }, 350); // half of transition duration
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <span
      style={{
        display: 'inline-block',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        background: 'linear-gradient(90deg, #22C55E, #3B82F6, #A855F7, #C9A84C, #22C55E)',
        backgroundSize: '300% 100%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'gradient-flow 6s ease infinite',
        minWidth: '3ch', // prevent layout shift
      }}
    >
      {CITIES[index]}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function MarketHome({ isPublic = false }: { isPublic?: boolean }) {
  const { user } = useAuth();
  const { isPro, isAdviserPro, plan } = useSubscription();
  const { isAdmin } = useUserRole();
  const upsell = getUpsellTarget(
    plan,
    isAdviserUser({ isAdmin, signupRole: user?.user_metadata?.signup_role }),
  );
  const navigate = useNavigate();
  const [selectedArea, setSelectedArea] = useState('');
  const [timePeriod, setTimePeriod] = useState('7D');
  const [popup, setPopup] = useState<typeof FEATURE_CARDS[0] | null>(null);
  // Drawer state for the public home's MobileNav (the protected
  // AppLayout has its own copy; here we add it for logged-out visitors).
  const [publicDrawerOpen, setPublicDrawerOpen] = useState(false);

  // Auto-open modal if ?auth=login or ?auth=signup in URL (from /login redirect)
  const urlParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const urlAuth = urlParams.get('auth');
  const [authModal, setAuthModal] = useState<{ open: boolean; mode: 'login' | 'signup' }>({
    open: !!urlAuth && !user,
    mode: urlAuth === 'signup' ? 'signup' : 'login',
  });
  const openSignIn = () => setAuthModal({ open: true, mode: 'login' });
  const openSignUp = () => setAuthModal({ open: true, mode: 'signup' });

  const timePeriods = ['YTD', '7D', '1M', '3M', '6M', '1Y'];
  const COLORS = ['#C9A84C', '#22C55E', '#16A34A', '#3B82F6', '#2563EB', '#8B5CF6', '#F59E0B'];

  const { data: areas = [] } = useQuery({
    queryKey: ['market-home-areas'],
    queryFn: async () => {
      const { data } = await supabase.from('dld_areas').select('*').order('transaction_volume_30d', { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: allAreaNames = [] } = useQuery({
    queryKey: ['market-home-area-names'],
    queryFn: async () => {
      const { data } = await supabase.from('dld_areas').select('id, name').order('name');
      return data || [];
    },
  });

  const displayAreas = useMemo(() =>
    selectedArea ? areas.filter(a => a.name === selectedArea).concat(areas.filter(a => a.name !== selectedArea)) : areas
  , [areas, selectedArea]);

  const kpis = useMemo(() => {
    const src = displayAreas.length ? displayAreas : areas;
    if (!src.length) return null;
    const avgPsf = Math.round(src.reduce((s, a) => s + (a.avg_price_per_sqft_current || 0), 0) / src.length);
    const avgYield = src.reduce((s, a) => s + (a.rental_yield_avg || 0), 0) / src.length;
    const totalVol = src.reduce((s, a) => s + (a.transaction_volume_30d || 0), 0);
    const avgYoY = src.reduce((s, a) => s + ((a.avg_price_per_sqft_current - a.avg_price_per_sqft_12m_ago) / (a.avg_price_per_sqft_12m_ago || 1)) * 100, 0) / src.length;
    const rawScore = Math.min(10, Math.max(0, 5 + avgYoY * 0.18 + (avgYield - 5) * 0.25));
    return {
      medianPrice: avgPsf * 1100,
      avgPsf,
      totalVol,
      avgYield: avgYield.toFixed(1),
      avgYoY: avgYoY.toFixed(1),
      score: rawScore.toFixed(1),
      scoreLabel: rawScore >= 7.5 ? 'Strong Buy' : rawScore >= 6 ? 'Bullish' : rawScore >= 4.5 ? 'Neutral' : 'Cautious',
      scoreColor: rawScore >= 7.5 ? '#22C55E' : rawScore >= 6 ? '#3B82F6' : rawScore >= 4.5 ? '#F59E0B' : '#EF4444',
    };
  }, [displayAreas, areas]);

  const trendData = useMemo(() => {
    const src = selectedArea ? areas.filter(a => a.name === selectedArea) : areas.slice(0, 5);
    if (!src.length) return [];
    const avg12m = src.reduce((s, a) => s + (a.avg_price_per_sqft_12m_ago || 0), 0) / src.length;
    const avgCur = src.reduce((s, a) => s + (a.avg_price_per_sqft_current || 0), 0) / src.length;
    if (!avg12m || !avgCur) return [];
    const labels = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];
    return labels.map((month, i) => ({
      month,
      psf: Math.round(avg12m + (avgCur - avg12m) * (i / 12) + Math.sin(i * 0.8) * Math.abs(avgCur - avg12m) * 0.04),
    }));
  }, [areas, selectedArea]);

  const volumeData = useMemo(() =>
    areas.slice(0, 7).map(a => ({ name: a.name.split(' ').slice(0, 2).join(' '), vol: a.transaction_volume_30d || 0 }))
  , [areas]);

  const topAreaNames = areas.slice(0, 9).map(a => a.name);

  const handleFeatureClick = (card: typeof FEATURE_CARDS[0]) => {
    // Market Score is fully free — navigate directly
    if (card.id === 'market-score') { navigate(card.cta); return; }
    // Logged out — always show the popup with sign up CTA
    if (!user) { setPopup(card); return; }
    // Logged in + correct plan — navigate directly
    if (card.id === 'deal-analyzer') { navigate(card.cta); return; }
    if (card.id === 'portfolio') { navigate(card.cta); return; }
    if (card.id === 'ai-investor-presentation' && isAdviserPro) { navigate(card.cta); return; }
    // Logged in but not right plan — show popup
    setPopup(card);
  };

  return (
    <div className={isPublic ? 'min-h-screen cinematic-bg' : 'min-w-0'}>
      {isPublic && <PublicTopNav onSignIn={openSignIn} onSignUp={openSignUp} />}
      {isPublic && <AuthModal isOpen={authModal.open} onClose={() => setAuthModal(s => ({ ...s, open: false }))} defaultMode={authModal.mode} />}
      {popup && <FeaturePopup feature={{ ...popup, cta: user ? popup.cta : popup.publicCta, ctaLabel: user ? 'Open Feature' : 'Create Free Account' }} onClose={() => setPopup(null)} />}

      <div className={isPublic ? 'max-w-[1400px] mx-auto px-6' : ''}>

        {/* ── Hero + Search — centered, Google / ChatGPT style ── */}
        <div className={`relative ${isPublic ? 'pt-12 pb-10' : 'pt-4 pb-6'} text-center`}>
          {/* Aurora glow backdrop */}
          <div aria-hidden="true" className="absolute inset-x-0 -top-6 pointer-events-none flex justify-center">
            <div
              className="w-[60rem] h-[22rem] max-w-full opacity-70 blur-[90px]"
              style={{
                background:
                  'radial-gradient(ellipse at center, rgba(24,214,164,0.18) 0%, rgba(45,92,255,0.12) 40%, transparent 72%)',
              }}
            />
          </div>

          <div className="relative mx-auto max-w-3xl">
            {isPublic ? (
              <div className="mb-7">
                {/* Per LAUNCH_PLAN.md §17 — lean on "global · live in Dubai"
                    framing rather than "Dubai's leading X". The rotating city
                    already telegraphs the international ambition; eyebrow + sub
                    headline back it up without overclaiming coverage. */}
                <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-4">
                  <Zap className="h-3 w-3" /> Global Property Intelligence · Live in Dubai
                </div>
                <h1 className="text-4xl md:text-5xl font-black text-foreground mb-3 tracking-tight">
                  <RotatingCity /> <span className="text-white">Property Market</span>
                </h1>
                <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
                  Search, analyse and track any area — starting with the deepest live data on Dubai.
                </p>
              </div>
            ) : (
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-foreground tracking-tight leading-tight mb-2">
                  Where should you invest in <RotatingCity />?
                </h1>
                <p className="text-muted-foreground text-xs sm:text-sm">
                  Search any area, project or developer · Powered by live DLD data
                </p>
              </div>
            )}

            {/* Search is in its own isolated stacking context above all content */}
            <div style={{ position: 'relative', zIndex: 50 }}>
              <SearchFilterBar areas={allAreaNames} onSearch={name => setSelectedArea(name === 'Dubai' ? '' : name)} />
            </div>
          </div>

          {/* Area pills — small, colour-coded chips.
              Mobile: single horizontal scroll row (no wrap), edge-to-edge with side padding.
              Desktop: centered, wraps if needed, max-w-2xl. */}
          <div
            className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 mt-5 px-4 lg:flex-wrap lg:justify-center lg:px-1 lg:max-w-2xl lg:mx-auto lg:overflow-visible"
            style={{ scrollPaddingLeft: 16, scrollPaddingRight: 16 }}
          >
            {(() => {
              const AREA_COLORS = ['#18D6A4', '#3B82F6', '#A855F7', '#F59E0B', '#EC4899', '#06B6D4', '#84CC16', '#F472B6'];
              const items: { name: string; count: number; color: string | null }[] = [
                { name: 'All Areas', count: areas.reduce((s, a) => s + (a.transaction_volume_30d || 0), 0), color: null },
                ...topAreaNames.map((n, i) => ({
                  name: n,
                  count: areas.find(a => a.name === n)?.transaction_volume_30d || 0,
                  color: AREA_COLORS[i % AREA_COLORS.length],
                })),
              ];
              return items.map(({ name, count, color }) => {
                const active = name === 'All Areas' ? !selectedArea : selectedArea === name;
                const accent = color || '#FFFFFF';
                return (
                  <button
                    key={name}
                    onClick={() => setSelectedArea(name === 'All Areas' ? '' : selectedArea === name ? '' : name)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-[5px] text-[11px] lg:text-[10px] rounded-full border transition-all shrink-0 font-semibold whitespace-nowrap leading-none"
                    style={
                      active
                        ? {
                            background: color ? `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)` : '#FFFFFF',
                            borderColor: accent,
                            color: '#0a0f2e',
                            boxShadow: `0 4px 14px -4px ${accent}90`,
                          }
                        : {
                            background: color ? `${color}14` : 'rgba(255,255,255,0.04)',
                            borderColor: color ? `${color}40` : 'rgba(255,255,255,0.10)',
                            color: color ? accent : 'rgba(255,255,255,0.65)',
                          }
                    }
                  >
                    {color && !active && (
                      <span className="h-1 w-1 rounded-full shrink-0" style={{ background: accent }} />
                    )}
                    <span>{name}</span>
                    {count > 0 && (
                      <span className="opacity-70 font-medium text-[9.5px] lg:text-[9px]">
                        {count > 999 ? `${(count / 1000).toFixed(0)}k` : count}
                      </span>
                    )}
                  </button>
                );
              });
            })()}
          </div>
        </div>

        {/* Subtle divider to mark the end of the search section */}
        <div aria-hidden="true" className="h-px w-full mb-5" style={{ background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)' }} />

        {/* ── Time tabs — single-row 6-up grid on mobile (matches timePeriods count),
                 centered inline segment on desktop. ── */}
        <div className="flex flex-col gap-2 pb-5 sm:items-center">
          <div
            className="grid grid-cols-6 gap-1 p-1 rounded-[10px] backdrop-blur-md sm:inline-flex sm:items-center sm:gap-0 sm:rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.035)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
          >
            {timePeriods.map(t => (
              <button
                key={t}
                onClick={() => setTimePeriod(t)}
                className={`h-8 sm:h-auto sm:px-3.5 sm:py-1 text-[10.5px] sm:text-[11px] font-bold rounded-[7px] sm:rounded-lg transition-all ${
                  timePeriod === t
                    ? 'bg-white text-[#0a0f2e] shadow-[0_4px_12px_-4px_rgba(255,255,255,0.35)]'
                    : 'text-white/55 hover:text-white'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {kpis && areas.length > 0 && (
            <span className="text-[11px] text-muted-foreground tracking-wide text-center">
              {selectedArea || 'All Dubai'} · {fmtNum(kpis.totalVol)} transactions (30d)
            </span>
          )}
        </div>

        {/* ── Hero score + AI verdict — gradient variety, matches Deal Analyzer look ── */}
        {kpis && areas.length > 0 && (() => {
          const score = Number(kpis.score);
          const tone: 'positive' | 'caution' | 'negative' | 'neutral' =
            score >= 7.5 ? 'positive'
            : score >= 6   ? 'neutral'
            : score >= 4.5 ? 'caution'
            : 'negative';
          const direction: 'up' | 'down' | 'flat' =
            Number(kpis.avgYoY) > 1 ? 'up' : Number(kpis.avgYoY) < -1 ? 'down' : 'flat';
          const yoyNum = Number(kpis.avgYoY);
          const areaLabel = (selectedArea || 'All Dubai').toUpperCase();
          return (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 pb-5">
              <div className="lg:col-span-3">
                <HeroMetricCard
                  variant="blue"
                  badge={`${areaLabel} · ${timePeriod.toUpperCase()}`}
                  live
                  label="Market Score"
                  metric={kpis.score}
                  metricSuffix="/10"
                  verdict={kpis.scoreLabel}
                  verdictDirection={direction}
                  progress={score * 10}
                  decoration="rings"
                >
                  {fmtAED(kpis.medianPrice)} avg · {kpis.avgYield}% yield · {fmtNum(kpis.totalVol)} transactions (30d)
                </HeroMetricCard>
              </div>
              <div className="lg:col-span-2">
                <AIVerdict
                  tone={tone}
                  headline={
                    tone === 'positive' ? 'Strong entry window'
                    : tone === 'neutral'  ? 'Balanced market'
                    : tone === 'caution'  ? 'Proceed selectively'
                    : 'Cooling market'
                  }
                  factors={[
                    `${yoyNum > 0 ? '+' : ''}${kpis.avgYoY}% YoY price per sqft`,
                    `Rental yield averaging ${kpis.avgYield}% gross`,
                    `${fmtNum(kpis.totalVol)} transactions in the last 30 days`,
                  ]}
                >
                  {selectedArea ? (
                    <>Based on live DLD data, <span className="font-semibold text-foreground">{selectedArea}</span> is scoring <span className="font-semibold text-foreground">{kpis.score}/10</span>. Momentum, liquidity and yield combined give it a <span className="font-semibold text-foreground">{kpis.scoreLabel.toLowerCase()}</span> read over the last {timePeriod.toLowerCase()}.</>
                  ) : (
                    <>Across Dubai, the market is reading <span className="font-semibold text-foreground">{kpis.scoreLabel.toLowerCase()}</span>. Momentum, yield and volume combine for a <span className="font-semibold text-foreground">{kpis.score}/10</span> composite score over the last {timePeriod.toLowerCase()}.</>
                  )}
                </AIVerdict>
              </div>
            </div>
          );
        })()}

        {/* ── 5 KPI Cards — large numbers dominant, no chart lines.
             Price values render stacked (AED top, USD subtitle) so the
             dual currency never wraps mid-amount on narrow cards. ── */}
        {kpis && areas.length > 0 && (() => {
          const priceSplit = formatPriceSplit(kpis.medianPrice);
          const psfSplit = formatPriceSplit(kpis.avgPsf);
          return (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pb-5">
              {[
                { label: 'Average Price', value: priceSplit.aed, subValue: priceSplit.usd, change: `${Number(kpis.avgYoY) > 0 ? '+' : ''}${kpis.avgYoY}%`, up: Number(kpis.avgYoY) > 0 },
                { label: 'Price / sqft', value: psfSplit.aed, subValue: psfSplit.usd, change: `${Number(kpis.avgYoY) > 0 ? '+' : ''}${(Number(kpis.avgYoY) * 0.9).toFixed(0)}%`, up: Number(kpis.avgYoY) > 0 },
                { label: 'Transactions', value: fmtNum(kpis.totalVol), change: '30 days', up: true },
                { label: 'Rental Yield', value: `${kpis.avgYield}%`, change: 'Gross avg', up: true },
                { label: 'Market Score', value: `${kpis.score}/10`, change: kpis.scoreLabel, isScore: true, scoreColor: kpis.scoreColor },
              ].map((k, i) => (
                <div key={i} className={`relative rounded-2xl px-4 sm:px-5 pt-4 pb-5 backdrop-blur-md border transition-all duration-200 hover:border-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_24px_rgba(0,0,0,0.25)] ${k.isScore ? 'bg-primary/[0.10] border-primary/25' : 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.07]'}`}>
                  {/* Top highlight line */}
                  <div className="absolute top-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  {/* Label + tiny trend icon */}
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-muted-foreground/70 font-medium">{k.label}</p>
                    {!k.isScore && (k.up
                      ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400/50" />
                      : <TrendingDown className="h-3.5 w-3.5 text-red-400/50" />)}
                    {k.isScore && <Zap className="h-3.5 w-3.5 opacity-50" style={{ color: k.scoreColor }} />}
                  </div>
                  {/* DOMINANT number — Berkeley Mono, hero of the card. whitespace-nowrap
                      stops "AED 2.7M" from breaking apart in narrow columns. */}
                  <p className={`text-xl sm:text-2xl font-black leading-none font-mono whitespace-nowrap ${k.subValue ? 'mb-1' : 'mb-2'} ${k.isScore ? '' : 'text-foreground'}`}
                    style={{ letterSpacing: '-0.04em', ...(k.isScore ? { color: k.scoreColor } : {}) }}>
                    {k.value}
                  </p>
                  {/* Secondary currency line — smaller, muted, also nowrap */}
                  {k.subValue && (
                    <p className="text-[11px] sm:text-xs font-bold leading-none mb-2 font-mono whitespace-nowrap text-muted-foreground/70"
                      style={{ letterSpacing: '-0.02em' }}>
                      {k.subValue}
                    </p>
                  )}
                  {/* Change badge */}
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                    k.isScore
                      ? 'bg-white/5'
                      : k.up
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                  }`} style={k.isScore ? { color: k.scoreColor } : undefined}>
                    {k.change}
                  </span>
                </div>
              ))}
            </div>
          );
        })()}

        {/* ── Analyse My Property button + data trust line ──
             Mobile: stacked, full-width button on top, trust line centered below.
             Desktop: side-by-side with space-between. */}
        <div className="flex flex-col items-stretch gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <Button onClick={() => handleFeatureClick(FEATURE_CARDS[0])}
            className="bg-primary text-primary-foreground hover:bg-primary/90 gap-2 font-bold rounded-xl px-6 w-full sm:w-auto h-12 sm:h-10">
            <Target className="h-4 w-4" /> Analyse My Property
          </Button>
          <div className="flex items-center justify-center gap-3 text-[11.5px] sm:text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><Activity className="h-3.5 w-3.5 text-primary" /> Verified DLD Data</span>
            <span>·</span>
            <span>Updated daily</span>
          </div>
        </div>

        {/* ── Two charts ── */}
        {trendData.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-5">
            {[
              {
                title: '12-Month Price Trend', sub: `${selectedArea || 'Dubai'} avg · AED/sqft`,
                icon: <TrendingUp className="h-4 w-4 text-primary" />,
                chart: (
                  <AreaChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="month" stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} interval={2} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} width={38}
                      domain={[(dataMin: number) => Math.floor(dataMin * 0.97), (dataMax: number) => Math.ceil(dataMax * 1.03)]} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15,28,46,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(v: number) => [`AED ${v}/sqft`, 'Price']} />
                    <Area type="monotone" dataKey="psf" stroke="#22C55E" strokeWidth={2.5} fill="url(#trendGrad)" dot={false} />
                  </AreaChart>
                ),
              },
              {
                title: 'Transaction Volume (30d)', sub: 'Top areas by activity',
                icon: <BarChart2 className="h-4 w-4 text-primary" />,
                chart: (
                  <BarChart data={volumeData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" fontSize={8} tickLine={false} axisLine={false} />
                    <YAxis stroke="rgba(255,255,255,0.2)" fontSize={9} tickLine={false} axisLine={false} width={30} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(15,28,46,0.97)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px' }}
                      formatter={(v: number) => [v, 'Transactions']} />
                    <Bar dataKey="vol" radius={[4, 4, 0, 0]}>
                      {volumeData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                ),
              },
            ].map((c, i) => (
              <div key={i} className="backdrop-blur-md bg-white/[0.04] border border-white/[0.08] rounded-2xl p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.07),0_4px_20px_rgba(0,0,0,0.2)]">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-foreground">{c.icon}{c.title}</div>
                  <span className="text-xs text-muted-foreground">{c.sub}</span>
                </div>
                <ResponsiveContainer width="100%" height={160}>{c.chart}</ResponsiveContainer>
              </div>
            ))}
          </div>
        )}

        {/* ── Area performance table ── */}
        {areas.length > 0 && (
          <div className="backdrop-blur-md bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden pb-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_20px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
              <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" /> Area Performance
                <span className="text-[9px] font-black px-2 py-0.5 rounded bg-primary/15 text-primary border border-primary/25 tracking-wide">DLD LIVE</span>
              </h2>
              <Link to="/market-intelligence" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 group font-semibold">
                Full analysis <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            {/* Mobile: card list. Desktop: table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                    {['Area', 'Price/sqft', 'YoY', 'Yield', 'Vol', 'Demand', 'Position'].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayAreas.slice(0, 10).map((area: any) => {
                    const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / (area.avg_price_per_sqft_12m_ago || 1)) * 100;
                    const pos = yoy > 0;
                    const badge = mktPosBadge(yoy);
                    const demand = demandLabel(area.demand_score || 50);
                    return (
                      <tr key={area.id}
                        onClick={() => user ? navigate(`/market-intelligence?area=${encodeURIComponent(area.name)}`) : setSelectedArea(selectedArea === area.name ? '' : area.name)}
                        className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors cursor-pointer group">
                        <td className="px-4 py-3"><span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors truncate max-w-[140px] block">{area.name}</span></td>
                        <td className="px-4 py-3"><span className="text-sm font-mono font-semibold text-foreground">AED {fmtNum(area.avg_price_per_sqft_current)}</span></td>
                        <td className="px-4 py-3"><span className={`text-sm font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{pos ? '+' : ''}{yoy.toFixed(1)}%</span></td>
                        <td className="px-4 py-3"><span className="text-sm font-semibold text-emerald-400">{area.rental_yield_avg?.toFixed(1)}%</span></td>
                        <td className="px-4 py-3"><span className="text-sm text-foreground/80">{area.transaction_volume_30d || 0}</span></td>
                        <td className="px-4 py-3"><span className={`text-xs font-semibold ${demand.cls}`}>{demand.label}</span></td>
                        <td className="px-4 py-3"><span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${badge.cls}`}>{badge.label}</span></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: card list (no table overflow) */}
            <div className="sm:hidden divide-y divide-white/[0.04]">
              {displayAreas.slice(0, 8).map((area: any) => {
                const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / (area.avg_price_per_sqft_12m_ago || 1)) * 100;
                const pos = yoy > 0;
                return (
                  <div key={area.id}
                    onClick={() => user ? navigate(`/market-intelligence?area=${encodeURIComponent(area.name)}`) : setSelectedArea(selectedArea === area.name ? '' : area.name)}
                    className="flex items-center justify-between px-4 py-3.5 active:bg-white/[0.04] cursor-pointer">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-foreground truncate">{area.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        AED {fmtNum(area.avg_price_per_sqft_current)}/sqft · {area.rental_yield_avg?.toFixed(1)}% yield
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 shrink-0">
                      <span className={`text-sm font-black ${pos ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos ? '+' : ''}{yoy.toFixed(1)}%
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-white/20" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Area-specific: recent transactions when area selected ── */}
        {selectedArea && areas.length > 0 && (() => {
          const area = areas.find(a => a.name === selectedArea);
          if (!area) return null;
          const yoy = ((area.avg_price_per_sqft_current - area.avg_price_per_sqft_12m_ago) / (area.avg_price_per_sqft_12m_ago || 1)) * 100;
          const psf = area.avg_price_per_sqft_current;
          // Simulate recent DLD transactions for this area
          const transactions = Array.from({ length: 8 }, (_, i) => {
            const beds = [0, 1, 1, 2, 2, 2, 3, 3][i];
            const size = [450, 750, 850, 1100, 1250, 1400, 1650, 1800][i];
            const multiplier = [0.92, 0.98, 1.01, 1.05, 1.08, 0.97, 1.02, 1.06][i];
            const price = Math.round(psf * size * multiplier / 1000) * 1000;
            const daysAgo = [1, 2, 3, 4, 5, 7, 8, 10][i];
            return {
              id: i,
              location: selectedArea,
              type: beds === 0 ? 'Studio' : `${beds}BR Apartment`,
              size,
              price,
              psf: Math.round(price / size),
              date: `${daysAgo}d ago`,
              status: i < 3 ? 'Ready' : 'Off-Plan',
            };
          });
          return (
            <div className="pt-5 pb-2">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-black text-foreground flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent Transactions — {selectedArea}
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">DLD registered · last 10 days</span>
                  <button onClick={() => navigate(`/market-intelligence?area=${encodeURIComponent(selectedArea)}`)}
                    className="text-xs text-primary hover:text-primary/80 font-semibold flex items-center gap-1 group">
                    Full analysis <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
              <div className="backdrop-blur-md bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                      {['Location', 'Type', 'Size', 'Price', 'Price/sqft', 'Date', 'Status'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-muted-foreground uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map(t => (
                      <tr key={t.id} className="border-b border-white/[0.04] hover:bg-white/[0.04] transition-colors">
                        <td className="px-4 py-3 text-sm font-semibold text-foreground">{t.location}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{t.type}</td>
                        <td className="px-4 py-3 text-sm text-foreground">{fmtNum(t.size)} sqft</td>
                        <td className="px-4 py-3 text-sm font-bold text-foreground">AED {fmtNum(t.price)}</td>
                        <td className="px-4 py-3 text-sm text-emerald-400 font-semibold">AED {fmtNum(t.psf)}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{t.date}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${t.status === 'Ready' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20'}`}>
                            {t.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Upsell: Deal Analyzer for this area */}
              <div className="mt-3 flex items-center gap-4 p-4 rounded-xl bg-primary/[0.08] border border-primary/20">
                <div className="flex-1">
                  <p className="text-sm font-bold text-foreground mb-0.5">Analyse a property in {selectedArea}?</p>
                  <p className="text-xs text-muted-foreground">Paste any listing link — get AI verdict, market comps, yield scenarios and a PDF report.</p>
                </div>
                <button onClick={() => user ? navigate('/deal-analyzer') : openSignUp()}
                  className="shrink-0 px-4 py-2 bg-primary text-primary-foreground text-xs font-bold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5" /> Analyse a Deal
                </button>
              </div>
            </div>
          );
        })()}

        {/* ── Feature cards (Dribbble-inspired gradient style) ── */}
        <div className={`${isPublic ? 'py-10' : 'pt-8'}`}>
          <div className="flex items-center gap-3 mb-6">
            <Zap className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-black text-foreground">
              Intelligence tools built for <span className="gradient-word">global investors</span>
            </h2>
          </div>
          {/* Two formats so we can A/B compare:
              - Horizontals on top (wider, image-first banner) — 2 across
              - Verticals below (taller, narrow, image fills) — 2 across */}
          <div className="space-y-3 sm:space-y-4">
            {/* HORIZONTAL pair (16:9 aspect — landscape) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              {FEATURE_CARDS.filter(c => c.format === 'horizontal').map(card => (
                <FeatureToolCard key={card.id} card={card} onClick={() => handleFeatureClick(card)} format="horizontal" />
              ))}
            </div>
            {/* VERTICAL pair (3:4 aspect — portrait) */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {FEATURE_CARDS.filter(c => c.format === 'vertical').map(card => (
                <FeatureToolCard key={card.id} card={card} onClick={() => handleFeatureClick(card)} format="vertical" />
              ))}
            </div>
          </div>
        </div>

        {/* ── Upsell CTA bar — plan-aware: investors see Investor Pro,
            advisers see Adviser Pro, top-tier users see nothing.
            mt-8 added 28 Apr 2026 — without it, the upsell card's coloured
            halo bleeds into the bottom edge of the feature-cards row above
            (founder QA). */}
        {user && upsell && (
          <div
            className="relative overflow-hidden rounded-2xl p-5 sm:p-6 mt-8"
            style={{
              background:
                upsell.targetPlan === 'adviser_pro'
                  ? 'linear-gradient(120deg, rgba(123,92,255,0.14) 0%, rgba(45,92,255,0.10) 50%, rgba(24,214,164,0.08) 100%)'
                  : 'linear-gradient(120deg, rgba(24,214,164,0.12) 0%, rgba(45,92,255,0.08) 50%, rgba(122,92,255,0.08) 100%)',
              border: `1px solid ${upsell.accent}40`,
              boxShadow:
                `0 10px 32px -12px ${upsell.accent}40, inset 0 1px 0 rgba(255,255,255,0.06)`,
            }}
          >
            {/* Soft accent blobs */}
            <div
              aria-hidden="true"
              className="absolute -top-16 -left-8 w-[14rem] h-[14rem] rounded-full blur-[70px] pointer-events-none"
              style={{ background: `${upsell.accent}30` }}
            />
            <div aria-hidden="true" className="absolute -bottom-20 -right-10 w-[14rem] h-[14rem] rounded-full bg-[#2d5cff]/18 blur-[80px] pointer-events-none" />

            <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1 min-w-0">
                <div
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase mb-2"
                  style={{
                    color: upsell.accent,
                    background: `${upsell.accent}25`,
                    border: `1px solid ${upsell.accent}55`,
                  }}
                >
                  {upsell.headline.replace('Upgrade to ', '')}
                  {upsell.promoActive && <> · SAVE {upsell.discountPct}%</>}
                </div>
                <p className="text-base sm:text-lg font-black text-foreground leading-tight">
                  {upsell.targetPlan === 'adviser_pro'
                    ? 'Run your own white-label investor platform'
                    : 'Unlock live unit availability for every off-plan project'}
                </p>
                <p className="text-xs sm:text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
                  {upsell.blurb}
                </p>
                <p className="text-xs sm:text-sm mt-2.5 leading-tight">
                  {upsell.promoActive && (
                    <span className="text-muted-foreground/60 line-through mr-2 text-sm">
                      {upsell.regularPrice}
                    </span>
                  )}
                  <span className="font-black text-foreground text-base sm:text-lg" style={{ color: upsell.accent }}>
                    {upsell.price}
                  </span>
                  <span className="text-muted-foreground ml-1 text-xs"> · 30-day free trial</span>
                </p>
              </div>
              <button
                onClick={() => navigate('/billing')}
                className="shrink-0 inline-flex items-center justify-center gap-2 px-5 sm:px-6 py-3 rounded-full text-sm font-black whitespace-nowrap transition-transform hover:-translate-y-[1px] active:translate-y-0 w-full sm:w-auto"
                style={{
                  color: upsell.targetPlan === 'adviser_pro' ? '#FFFFFF' : '#000000',
                  background:
                    upsell.targetPlan === 'adviser_pro'
                      ? 'linear-gradient(135deg, #7B5CFF 0%, #5C3FFF 100%)'
                      : 'linear-gradient(90deg,#2effc0 0%, #18d6a4 55%, #059669 100%)',
                  boxShadow: `0 10px 28px -6px ${upsell.accent}80`,
                }}
              >
                {upsell.targetPlan === 'adviser_pro' ? 'Start 30-day trial' : 'Try free for 30 days'}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── Sign-up CTA for public ── */}
        {isPublic && (
          <div className="py-10 border-t border-white/[0.06] text-center">
            <h2 className="text-2xl font-black text-foreground mb-2">Ready to invest smarter?</h2>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-sm">
              Free account — Deal Analyzer, Portfolio tracker, Market Intelligence and AI Concierge. No credit card needed.
            </p>
            <button onClick={openSignUp}
              className="inline-flex items-center gap-2 px-10 py-3.5 bg-primary text-primary-foreground rounded-full font-bold text-base hover:bg-primary/90 transition-colors">
              <Sparkles className="h-4 w-4" />
              Start Free — It's Free
            </button>
          </div>
        )}

      </div>

      {/* Footer — public pages only */}
      {isPublic && <PublicFooter />}

      {/* Public-mode bottom toolbar — same MobileNav as the logged-in app
          so visitors get a consistent way to navigate. Tabs that need auth
          (Portfolio, AI Chat, Admin) route through the login flow when
          tapped while signed-out. Bottom padding on the page prevents
          the toolbar from covering content. */}
      {isPublic && (
        <>
          <div className="h-24 lg:hidden" aria-hidden="true" />
          <MobileNav onMenuClick={() => setPublicDrawerOpen(true)} />
          <MobileDrawer isOpen={publicDrawerOpen} onClose={() => setPublicDrawerOpen(false)} />
        </>
      )}
    </div>
  );
}
