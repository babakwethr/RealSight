import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, Shield, Star, Package, Building2, Database,
  Activity, Layers, Settings, ChevronDown, ChevronUp,
  TrendingUp, CheckCircle2, DollarSign, Bell, ArrowRight,
  LayoutDashboard,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';

/** Time-of-day greeting helper — same pattern Stripe Atlas / Linear admin shells use. */
function getTimeGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

/**
 * AdminWorkspace — landing page for /admin.
 *
 * Per the 28 Apr 2026 chrome redesign: this replaces the implicit landing
 * on /admin/investors. Structure (founder-approved hybrid layout):
 *
 *   1. AdminTabs at the top (this component renders inside AppLayout content)
 *   2. Page header with "Show workspace stats" toggle (state persists in
 *      localStorage as `rs-admin-stats-open`)
 *   3. Optional KPI tile row (4 tiles: total clients, active trials, MRR,
 *      recent activity) — collapsed by default
 *   4. Always-visible 8-card grid of shortcuts to each sub-section
 *
 * Cards use the violet accent that matches the sidebar's "Admin" section,
 * with each card carrying a subtle accent halo on hover.
 */

interface ShortcutCard {
  to: string;
  icon: React.ElementType;
  title: string;
  description: string;
  accent: string;
  /** Slug under /images/admin/{slug}.webp — Lane B mint-accent illustration. */
  illustration: string;
}

const SHORTCUTS: ShortcutCard[] = [
  {
    to: '/admin/investors',
    icon: Users,
    title: 'Investors',
    description: 'Onboard, manage and switch between every client in your workspace.',
    accent: '#7B5CFF',
    illustration: 'investors',
  },
  {
    to: '/admin/users',
    icon: Shield,
    title: 'User Roles',
    description: 'Add team members and control who has admin or read-only access.',
    accent: '#4AA8FF',
    illustration: 'user-roles',
  },
  {
    to: '/admin/monthly-picks',
    icon: Star,
    title: 'Top Picks',
    description: 'Curate monthly investment recommendations to push to all clients.',
    accent: '#FFD25E',
    illustration: 'top-picks',
  },
  {
    to: '/admin/inventory',
    icon: Package,
    title: 'Portal Inventory',
    description: 'Choose which off-plan projects appear inside your branded portal.',
    accent: '#18D6A4',
    illustration: 'portal-inventory',
  },
  {
    to: '/admin/projects',
    icon: Building2,
    title: 'Manual Inventory',
    description: 'Add bespoke listings the public feeds don\'t cover (resale, exclusives).',
    accent: '#F472B6',
    illustration: 'manual-inventory',
  },
  {
    to: '/admin/dld-analytics',
    icon: Database,
    title: 'DLD Analytics',
    description: 'Direct queries into the Dubai transaction database — your own ad-hoc cuts.',
    accent: '#22C55E',
    illustration: 'dld-analytics',
  },
  {
    to: '/admin/market-pulse',
    icon: Activity,
    title: 'Market Pulse',
    description: 'Real-time area-level activity, momentum and inventory tightness signals.',
    accent: '#F59E0B',
    illustration: 'market-pulse',
  },
  {
    to: '/admin/market-index',
    icon: Layers,
    title: 'Market Index',
    description: 'Composite score per area — the number you publish to your investors.',
    accent: '#8B5CF6',
    illustration: 'market-index',
  },
  {
    to: '/admin/settings',
    icon: Settings,
    title: 'Workspace Settings',
    description: 'Branding, subdomain, AI concierge persona and welcome message.',
    accent: '#9CA3AF',
    illustration: 'settings',
  },
];

interface KpiState {
  totalClients: number | null;
  activeTrials: number | null;
  estimatedMrr: number | null;
  recentActivity: number | null;
  loading: boolean;
}

export default function AdminWorkspace() {
  const { tenant } = useTenant();
  const { user } = useAuth();
  const [showStats, setShowStats] = useState<boolean>(() => {
    try { return localStorage.getItem('rs-admin-stats-open') === 'true'; }
    catch { return false; }
  });
  const [kpis, setKpis] = useState<KpiState>({
    totalClients: null,
    activeTrials: null,
    estimatedMrr: null,
    recentActivity: null,
    loading: true,
  });

  // Persist toggle so an adviser who likes them open keeps them open.
  useEffect(() => {
    try { localStorage.setItem('rs-admin-stats-open', String(showStats)); } catch {}
  }, [showStats]);

  // Load KPIs only when first revealed (lazy; keeps initial paint cheap).
  useEffect(() => {
    if (!showStats || kpis.totalClients !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const tenantId = tenant?.id;
        // Total investor clients (scoped by tenant when present)
        const investorsQ = supabase.from('investors').select('id', { count: 'exact', head: true });
        if (tenantId) investorsQ.eq('tenant_id', tenantId);
        const { count: investorCount } = await investorsQ;

        // Recent activity — chat messages in the last 7 days, capped scope.
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { count: msgCount } = await supabase
          .from('chat_messages')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', sevenDaysAgo);

        if (cancelled) return;
        setKpis({
          totalClients: investorCount ?? 0,
          // Active trials + MRR are placeholders until Stripe customer/sub
          // data is mirrored into a Supabase table. Showing "—" reads better
          // than fabricating numbers.
          activeTrials: null,
          estimatedMrr: null,
          recentActivity: msgCount ?? 0,
          loading: false,
        });
      } catch {
        if (!cancelled) setKpis(p => ({ ...p, loading: false }));
      }
    })();
    return () => { cancelled = true; };
  }, [showStats, tenant?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const workspaceName = tenant?.broker_name || 'RealSight';

  // Time-aware personal greeting — uses first_name if set, falls back to the
  // local-part of the email so we never render an awkward "Hi there" empty state.
  const firstName = (user?.user_metadata?.first_name as string | undefined)
    || (user?.email ? user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()) : '');
  const greeting = getTimeGreeting();

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* AdminShell renders the "Admin Mode" strip + AdminTabs above this. */}

      {/* Mobile hero: greeting takes the full row so the name never truncates.
          Stats toggle is moved next to the "Manage your workspace" label below. */}
      <div className="lg:hidden px-1">
        {firstName && (
          <h2 className="text-[26px] font-black text-foreground tracking-tight leading-[1.1]">
            {greeting},
            {' '}
            <span style={{
              backgroundImage: 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #4aa8ff 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}>{firstName}</span>
            <span className="text-foreground">.</span>
          </h2>
        )}
        <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-snug">
          Welcome back to <strong className="text-foreground">{workspaceName}</strong>.
        </p>
      </div>

      {/* Desktop header — unchanged, hidden on mobile. */}
      <div className="hidden lg:block">
        {firstName && (
          <div className="px-1 mb-6">
            <h2 className="text-2xl font-black text-foreground tracking-tight">
              {greeting}, <span style={{
                backgroundImage: 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #4aa8ff 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
              }}>{firstName}</span>.
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Welcome back to <strong className="text-foreground">{workspaceName}</strong> · Tap a card below to manage your workspace.
            </p>
          </div>
        )}
        <AdminPageHeader
          icon={LayoutDashboard}
          titlePlain={workspaceName + ' ·'}
          titleGradient="Workspace"
          description="Everything you need to run your white-label investor workspace."
          actions={
            <button
              onClick={() => setShowStats((v) => !v)}
              className={cn(
                'inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold transition-all',
                'border border-white/[0.10] bg-white/[0.04] text-foreground/85 hover:bg-white/[0.07]',
              )}
            >
              {showStats ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  Hide workspace stats
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  Show workspace stats
                </>
              )}
            </button>
          }
        />
      </div>

      {/* ── KPI TILES (collapsible) ─────────────────────────────────── */}
      {showStats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <KpiTile
            icon={Users}
            label="Total clients"
            value={kpis.totalClients}
            unit=""
            accent="#7B5CFF"
            loading={kpis.loading}
          />
          <KpiTile
            icon={CheckCircle2}
            label="Active trials"
            value={kpis.activeTrials}
            unit=""
            accent="#18D6A4"
            loading={kpis.loading}
            placeholder="Coming soon"
          />
          <KpiTile
            icon={DollarSign}
            label="Estimated MRR"
            value={kpis.estimatedMrr}
            unit="$"
            accent="#FFD25E"
            loading={kpis.loading}
            placeholder="Coming soon"
          />
          <KpiTile
            icon={TrendingUp}
            label="Activity (7d)"
            value={kpis.recentActivity}
            unit=""
            accent="#4AA8FF"
            loading={kpis.loading}
          />
        </div>
      )}

      {/* ── SHORTCUT CARDS — 2-up on mobile. Stats toggle lives in the
              section header on phones, so the greeting above can stay full-width. ── */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground/70">
            Manage your workspace
          </p>
          {/* Mobile-only Stats toggle — text-button style, no big container */}
          <button
            onClick={() => setShowStats((v) => !v)}
            className="lg:hidden inline-flex items-center gap-1 text-[11px] font-bold text-[#b6a4ff] hover:text-foreground active:text-foreground transition-colors"
            aria-label={showStats ? 'Hide workspace stats' : 'Show workspace stats'}
          >
            {showStats
              ? <><ChevronUp className="h-3 w-3" /> Hide stats</>
              : <><ChevronDown className="h-3 w-3" /> Stats</>}
          </button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {SHORTCUTS.map((card) => (
            <ShortcutTile key={card.to} {...card} />
          ))}
        </div>
      </div>

      {/* ── WHAT'S NEW STRIP ────────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 flex items-start gap-4"
        style={{
          background: 'linear-gradient(160deg, rgba(123,92,255,0.10), rgba(15,18,40,0.85))',
          border: '1px solid rgba(123,92,255,0.20)',
        }}
      >
        <div className="w-10 h-10 rounded-xl bg-[#7B5CFF]/15 border border-[#7B5CFF]/30 flex items-center justify-center shrink-0">
          <Bell className="h-4 w-4 text-[#b6a4ff]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-foreground mb-0.5">
            Tip · invite your first investor
          </p>
          <p className="text-xs text-foreground/75 leading-relaxed">
            Head to <Link to="/admin/investors" className="text-[#b6a4ff] underline-offset-2 hover:underline">Investors</Link>,
            click <em>Invite Investor</em>, and they'll receive a branded onboarding email
            from <strong className="text-foreground">{workspaceName}</strong> within seconds.
          </p>
        </div>
        <Link
          to="/admin/investors"
          className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black bg-[#7B5CFF]/15 text-[#b6a4ff] border border-[#7B5CFF]/35 hover:bg-[#7B5CFF]/25 transition-colors shrink-0"
        >
          Invite <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

// ─── Tiny components ─────────────────────────────────────────────────────────

function KpiTile({
  icon: Icon, label, value, unit, accent, loading, placeholder,
}: {
  icon: React.ElementType;
  label: string;
  value: number | null;
  unit: string;
  accent: string;
  loading: boolean;
  placeholder?: string;
}) {
  const display =
    placeholder && value === null
      ? placeholder
      : loading
        ? '…'
        : value === null
          ? '—'
          : `${unit}${value.toLocaleString()}`;

  return (
    <div
      className="relative rounded-2xl p-4 sm:p-5 overflow-hidden"
      style={{
        background:
          'linear-gradient(160deg, rgba(255,255,255,0.04), rgba(15,18,40,0.85))',
        border: `1px solid ${accent}30`,
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: `${accent}1F`, border: `1px solid ${accent}40`, color: accent }}
        >
          <Icon className="h-3.5 w-3.5" />
        </span>
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-muted-foreground/85">
          {label}
        </p>
      </div>
      <p
        className={cn(
          'text-2xl sm:text-3xl font-black text-foreground leading-none',
          placeholder && value === null ? 'text-muted-foreground/55 text-base' : '',
        )}
        style={{ letterSpacing: '-0.02em' }}
      >
        {display}
      </p>
    </div>
  );
}

function ShortcutTile({ to, icon: Icon, title, description, accent, illustration }: ShortcutCard) {
  return (
    <Link
      to={to}
      className="group relative flex flex-col rounded-2xl p-3.5 sm:p-5 lg:p-6 overflow-hidden transition-all duration-200 hover:-translate-y-1 min-h-[124px] sm:min-h-[160px]"
      style={{
        background:
          'linear-gradient(160deg, rgba(255,255,255,0.05), rgba(15,18,40,0.85))',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Hover halo — accent-coloured glow that fades in */}
      <div
        aria-hidden="true"
        className="absolute -top-12 -right-10 w-40 h-40 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ background: `${accent}40` }}
      />

      {/* Lane-B illustration — small mint-accent decoration in the
          top-right corner. Sits at low opacity by default and brightens
          on hover, matching the existing Studio card pattern. */}
      <img
        src={`/images/admin/${illustration}.webp`}
        alt=""
        loading="lazy"
        decoding="async"
        aria-hidden="true"
        className="pointer-events-none absolute -top-3 -right-3 w-20 h-20 sm:w-24 sm:h-24 opacity-70 group-hover:opacity-100 transition-opacity duration-300 select-none"
      />

      <div className="relative flex items-start gap-2 sm:gap-3 mb-2 sm:mb-4">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
          style={{
            background: `${accent}1F`,
            border: `1px solid ${accent}40`,
            color: accent,
            boxShadow: `0 4px 18px -6px ${accent}55`,
          }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <h3
          className="text-[14px] sm:text-base font-black tracking-tight text-foreground pt-1 sm:pt-1.5 leading-tight"
          style={{ letterSpacing: '-0.015em' }}
        >
          {title}
        </h3>
      </div>

      <p className="relative text-[11.5px] sm:text-[12.5px] text-muted-foreground/85 leading-snug sm:leading-relaxed flex-1 line-clamp-2 sm:line-clamp-none">
        {description}
      </p>

      <div className="relative mt-2 sm:mt-4 flex items-center gap-1.5 text-[10.5px] sm:text-[11px] font-bold text-foreground/60 group-hover:text-foreground transition-colors">
        Open
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
