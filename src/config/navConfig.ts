import {
  LayoutDashboard, Search, BarChart3, Map, Globe, Building2, Eye,
  PieChart, Scale, CreditCard, FolderOpen, Bell, Bot, Wand2, Shield,
  type LucideIcon,
} from 'lucide-react';

/**
 * navConfig — the SINGLE source of truth for the app's role-aware navigation.
 *
 * The desktop sidebar (AppSidebar) and the mobile slide-out (MobileDrawer)
 * BOTH render from this. Previously each hand-maintained its own list and they
 * drifted: the same /heatmap route was "Global Heatmap" on desktop but "Dubai
 * Heatmap" in the mobile drawer; Studio + UK/US Market were missing from the
 * drawer; Compare was missing on mobile. Centralising fixes all of that — there
 * is now exactly one label + icon per route per persona.
 *
 * This reproduces the CURRENT desktop sidebar contents verbatim (no destination
 * added or removed — per the project's golden rule). Only the mobile drawer
 * changes, gaining parity with desktop.
 *
 * The mobile BOTTOM bar (MobileNav) is intentionally a curated 4+FAB subset and
 * keeps its own short tab list; it shares the persona hook, not this full menu.
 *
 * `lockedFeature` / `tier` are optional hooks for plan-tier badges (wired in a
 * later step); leaving them unset means "no badge".
 */

export type NavTier = 'investor_pro' | 'adviser_pro';
export type SectionAccent = 'investments' | 'workspace' | 'markets' | 'admin';
export type NavPersona = 'investor' | 'adviser';

export interface NavEntry {
  to: string;
  label: string;
  icon: LucideIcon;
  /** useSubscription feature key — when set, surfaces may show a tier badge. */
  lockedFeature?: string;
  /** Tier the badge should display when the user lacks `lockedFeature`. */
  tier?: NavTier;
}

export interface NavSection {
  id: string;
  label: string;
  accent: SectionAccent;
  items: NavEntry[];
}

const ADVISER_NAV: NavSection[] = [
  {
    id: 'workspace',
    label: 'Workspace',
    accent: 'workspace',
    items: [
      { to: '/dashboard',           label: 'Home',          icon: LayoutDashboard },
      { to: '/deal-analyzer',       label: 'Deal Analyzer', icon: Search },
    ],
  },
  {
    id: 'markets',
    label: 'Markets',
    accent: 'markets',
    items: [
      { to: '/market-intelligence', label: 'UAE Market',     icon: BarChart3 },
      { to: '/market/uk',           label: 'UK Market',      icon: Map },
      { to: '/market/us',           label: 'US Market',      icon: Map },
      { to: '/heatmap',             label: 'Global Heatmap', icon: Globe },
      { to: '/off-plan',            label: 'Off-Plan',       icon: Building2 },
      { to: '/watchlist',           label: 'Watchlist',      icon: Eye },
    ],
  },
  {
    id: 'admin',
    label: 'Admin',
    accent: 'admin',
    items: [
      { to: '/studio', label: 'Studio',    icon: Wand2 },
      { to: '/admin',  label: 'Workspace', icon: Shield },
    ],
  },
];

const INVESTOR_NAV: NavSection[] = [
  {
    id: 'investments',
    label: 'My Investments',
    accent: 'investments',
    items: [
      { to: '/portfolio', label: 'Portfolio',        icon: PieChart },
      { to: '/compare',   label: 'Compare Holdings', icon: Scale },
      { to: '/payments',  label: 'Payments',         icon: CreditCard },
      { to: '/documents', label: 'Documents',        icon: FolderOpen },
      { to: '/updates',   label: 'Updates',          icon: Bell },
      { to: '/concierge', label: 'AI Concierge',     icon: Bot },
    ],
  },
  {
    id: 'markets',
    label: 'Markets',
    accent: 'markets',
    items: [
      { to: '/dashboard',           label: 'Home · UAE',                    icon: LayoutDashboard },
      { to: '/market/uk',           label: 'UK Market',                     icon: BarChart3 },
      { to: '/market/us',           label: 'US Market',                     icon: BarChart3 },
      { to: '/off-plan',            label: 'Off-Plan · UAE · Bali · Phuket', icon: Building2 },
      { to: '/market-intelligence', label: 'Market Intelligence',           icon: BarChart3 },
      { to: '/heatmap',             label: 'Global Heatmap',                icon: Globe },
      { to: '/deal-analyzer',       label: 'Deal Analyzer',                 icon: Search },
      { to: '/watchlist',           label: 'Watchlist',                     icon: Eye },
    ],
  },
];

export const NAV_CONFIG: Record<NavPersona, NavSection[]> = {
  adviser: ADVISER_NAV,
  investor: INVESTOR_NAV,
};
