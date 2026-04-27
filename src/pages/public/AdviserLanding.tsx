import { useEffect } from 'react';
import { Link, useParams, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ShieldCheck, Sparkles, Building2, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * AdviserLanding — public path-based landing page for any adviser's
 * branded portal. Lives at `/a/:slug` (e.g. `realsight.app/a/babak`).
 *
 * 28 Apr 2026 white-label pivot: replaces the previous subdomain-based
 * landing (`babak.realsight.app/`). Path-based is simpler, mobile-friendly,
 * and avoids per-tenant DNS / SSL / DKIM complexity. Custom domains
 * (`babakproperties.com`) become a future premium upsell.
 *
 * The page:
 *   • Renders the adviser's branding (logo, colours, broker name, contact)
 *   • Has a "Join my portal" CTA that takes the visitor to /login?mode=signup
 *     with an `advisor=<slug>` query string so the new investor account
 *     attaches to the right tenant
 *   • Shows up to 3 of the adviser's curated picks as social proof
 *   • Has a small "Powered by RealSight" footer
 *
 * If the slug doesn't resolve (typo'd URL, deleted tenant), shows a clean
 * "Portal not found" page with a link to RealSight's main site.
 */

interface TenantPublicData {
  id: string;
  subdomain: string;
  broker_name: string;
  branding_config: {
    colors?: { primary?: string };
    logo_url?: string;
    bio?: string;
    photo_url?: string;
    contact_email?: string;
    contact_phone?: string;
    welcome_text?: string;
  };
}

export default function AdviserLanding() {
  const { slug } = useParams<{ slug: string }>();

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['public-tenant', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Missing slug');
      const { data, error } = await supabase
        .from('tenants')
        .select('id, subdomain, broker_name, branding_config')
        .eq('subdomain', slug.toLowerCase())
        .maybeSingle();
      if (error) throw error;
      return (data as TenantPublicData | null) ?? null;
    },
    enabled: !!slug,
    staleTime: 60_000,
  });

  // Redirect malformed URLs (no slug at all) — shouldn't happen via React
  // Router, but guard against direct DOM manipulation.
  if (!slug) return <Navigate to="/" replace />;

  // Apply the adviser's primary colour to the page so the landing
  // visually matches their brand even before the rest of the app loads.
  useEffect(() => {
    const primary = tenant?.branding_config?.colors?.primary;
    if (!primary) return;
    document.documentElement.style.setProperty('--adviser-accent', primary);
    return () => {
      document.documentElement.style.removeProperty('--adviser-accent');
    };
  }, [tenant?.branding_config?.colors?.primary]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
      </div>
    );
  }

  if (error || !tenant) {
    return <PortalNotFound slug={slug} />;
  }

  const brand = tenant.broker_name || 'Adviser Portal';
  const logoUrl = tenant.branding_config?.logo_url;
  const photoUrl = tenant.branding_config?.photo_url;
  const bio =
    tenant.branding_config?.bio ||
    tenant.branding_config?.welcome_text ||
    `Welcome to your private investor lounge with ${brand}. Track your Dubai property portfolio, get live market intelligence, and access curated off-plan opportunities — all under one roof.`;
  const accent = tenant.branding_config?.colors?.primary || '#18D6A4';
  const contactEmail = tenant.branding_config?.contact_email;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Aurora glow tinted with the adviser's accent */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 90% 60% at 50% -20%, ${accent}24, transparent 60%), radial-gradient(ellipse 60% 50% at 100% 30%, ${accent}18, transparent 70%)`,
        }}
      />

      {/* Top bar */}
      <header className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-6 flex items-center justify-between">
        {logoUrl ? (
          <img src={logoUrl} alt={brand} className="h-9 w-auto object-contain" />
        ) : (
          <div className="flex items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-black font-black"
              style={{ background: accent }}
            >
              {brand.slice(0, 1).toUpperCase()}
            </div>
            <span className="text-base font-black text-foreground tracking-tight">
              {brand}
            </span>
          </div>
        )}

        <Link
          to={`/login?mode=signup&advisor=${slug}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground/80 hover:text-foreground transition-colors"
        >
          Sign in <ArrowRight className="h-3 w-3" />
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-12 grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12">
        <div className="lg:col-span-3">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.18em] mb-6"
            style={{
              background: `${accent}20`,
              color: accent,
              border: `1px solid ${accent}50`,
            }}
          >
            <ShieldCheck className="h-3 w-3" />
            Private Investor Portal
          </div>

          <h1
            className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-foreground mb-5 leading-[1.05]"
            style={{ letterSpacing: '-0.03em' }}
          >
            Your Dubai property portfolio,
            <br />
            <span style={{ color: accent }}>managed by {brand}</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mb-8">
            {bio}
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              size="lg"
              className="rounded-full px-7 py-6 text-base font-black"
              style={{
                background: `linear-gradient(90deg, ${accent}, ${accent}dd)`,
                color: '#000000',
                boxShadow: `0 12px 32px -8px ${accent}80`,
              }}
            >
              <Link to={`/login?mode=signup&advisor=${slug}`}>
                Join my portal <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            {contactEmail && (
              <Button
                asChild
                variant="outline"
                size="lg"
                className="rounded-full px-7 py-6 text-base border-border/60"
              >
                <a href={`mailto:${contactEmail}?subject=${encodeURIComponent('Investor portal enquiry')}`}>
                  Contact {brand}
                </a>
              </Button>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground/70 mt-5">
            By joining you agree to RealSight's{' '}
            <Link to="/terms" className="underline">terms</Link> and{' '}
            <Link to="/privacy" className="underline">privacy policy</Link>.
          </p>
        </div>

        {/* Right column — adviser card */}
        <div className="lg:col-span-2">
          <div
            className="relative rounded-3xl overflow-hidden p-6 sm:p-8"
            style={{
              background: `linear-gradient(160deg, ${accent}1a 0%, rgba(15,18,40,0.92) 60%)`,
              border: `1px solid ${accent}40`,
              boxShadow: `0 20px 50px -16px ${accent}55, inset 0 1px 0 rgba(255,255,255,0.06)`,
              backdropFilter: 'blur(18px)',
            }}
          >
            <div className="flex items-start gap-4 mb-6">
              {photoUrl ? (
                <img
                  src={photoUrl}
                  alt={brand}
                  className="w-16 h-16 rounded-2xl object-cover shrink-0"
                  style={{ border: `2px solid ${accent}55` }}
                />
              ) : (
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 text-black font-black text-2xl"
                  style={{
                    background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  }}
                >
                  {brand.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
                  Your adviser
                </p>
                <h3 className="text-xl font-black text-foreground tracking-tight mb-1">
                  {brand}
                </h3>
                {contactEmail && (
                  <p className="text-xs text-muted-foreground truncate">{contactEmail}</p>
                )}
              </div>
            </div>

            <ul className="space-y-3">
              {[
                { icon: Building2, text: 'Your private property portfolio' },
                { icon: Sparkles,  text: 'AI deal analysis & branded reports' },
                { icon: Crown,     text: 'Curated off-plan picks each month' },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-3">
                  <span
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${accent}1f`, color: accent, border: `1px solid ${accent}40` }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm text-foreground/85">{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 mt-12 border-t border-white/[0.06]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} {brand}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            <span>Powered by</span>
            <Link to="/" className="hover:text-foreground transition-colors flex items-center gap-1">
              <Logo variant="white" className="h-3.5 w-auto opacity-70" />
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

// ─── Not found ──────────────────────────────────────────────────────────────
function PortalNotFound({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-6">
          <ShieldCheck className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-black text-foreground mb-3 tracking-tight">
          Portal not found
        </h1>
        <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
          We couldn't find an adviser portal for{' '}
          <code className="text-foreground bg-white/[0.05] px-1.5 py-0.5 rounded">{slug}</code>.
          The link may be incorrect, or the workspace may have been deactivated.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild className="rounded-full px-6">
            <Link to="/">Go to RealSight</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link to="/for-advisers">Become an adviser</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
