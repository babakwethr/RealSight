import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * useTenant — provides the active workspace branding context to the
 * authenticated app shell.
 *
 * 28 Apr 2026 redesign — soft white-label pivot. The previous version
 * resolved the tenant from `window.location.hostname` (subdomain detection
 * like `babak.realsight.app`). With the launch white-label model now being
 * path-based + in-app rather than subdomain-based:
 *
 *   • Public adviser landing pages (`/a/:slug`) fetch their own tenant
 *     directly via React Query — they don't need this provider.
 *   • The authenticated app shell (AppLayout, AppSidebar, AdminLayout, etc.)
 *     reads the tenant from the logged-in user's `profiles.tenant_id`.
 *
 * Accordingly, this provider is now an AUTH-driven branding resolver. It
 * listens to Supabase auth state, fetches the user's profile when they sign
 * in, and exposes `tenant` + `isMainDomain` for downstream consumers.
 *
 * `isMainDomain` semantics: `true` when there's no logged-in tenant context
 * (logged out, master-tenant admin, or user not linked to a real tenant).
 * Used by PublicHome / public layouts to render the un-branded marketing
 * surface.
 */

// Helper to convert hex to H S% L% format used by our Tailwind/CSS vars
function hexToHslString(hex: string): string {
  hex = hex.replace(/^#/, '');
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export type TenantConfig = {
  id: string;
  subdomain: string;       // re-purposed as "URL slug" — populated /a/{slug} routes
  custom_domain: string | null;
  broker_name: string;
  branding_config: {
    colors?: { primary?: string };
    logo_url?: string;
  };
};

type TenantContextType = {
  tenant: TenantConfig | null;
  isMainDomain: boolean;
  isLoading: boolean;
  error: Error | null;
};

const TenantContext = createContext<TenantContextType | undefined>(undefined);

// The "master" tenant id stamped on profiles that aren't linked to a real
// adviser workspace — created by the setup_advisor_platform RPC. Treat it
// as "no tenant" for branding purposes.
const MASTER_TENANT_ID = '00000000-0000-0000-0000-000000000000';

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
  const [tenant, setTenant] = useState<TenantConfig | null>(null);
  const [isMainDomain, setIsMainDomain] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;

    const resolveTenantFromAuth = async () => {
      try {
        // Allow `?tenant=slug` to force a tenant during local dev / preview.
        const tenantOverride = new URLSearchParams(window.location.search).get('tenant');
        if (tenantOverride) {
          const { data } = await supabase
            .from('tenants')
            .select('*')
            .eq('subdomain', tenantOverride.toLowerCase())
            .maybeSingle();
          if (cancelled) return;
          if (data) {
            applyBranding(data as TenantConfig);
            setTenant(data as TenantConfig);
            setIsMainDomain(false);
            setIsLoading(false);
            return;
          }
        }

        // Logged-in user → look up their tenant via profile.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          if (cancelled) return;
          setTenant(null);
          setIsMainDomain(true);
          setIsLoading(false);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('tenant_id')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const tenantId = profile?.tenant_id;
        if (!tenantId || tenantId === MASTER_TENANT_ID) {
          if (cancelled) return;
          setTenant(null);
          setIsMainDomain(true);
          setIsLoading(false);
          return;
        }

        const { data: tenantData, error: tErr } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', tenantId)
          .maybeSingle();

        if (tErr) throw tErr;
        if (!tenantData) {
          // Profile pointed at a tenant that no longer exists. Fall back to main.
          if (cancelled) return;
          setTenant(null);
          setIsMainDomain(true);
          setIsLoading(false);
          return;
        }

        if (cancelled) return;
        applyBranding(tenantData as TenantConfig);
        setTenant(tenantData as TenantConfig);
        setIsMainDomain(false);
        setIsLoading(false);
      } catch (err: any) {
        console.error('Tenant fetch error:', err);
        if (cancelled) return;
        setError(err);
        setIsLoading(false);
      }
    };

    resolveTenantFromAuth();

    // Re-run when the auth state changes (sign-in, sign-out, refresh).
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Reset loading so consumers know branding is being resolved again.
      setIsLoading(true);
      resolveTenantFromAuth();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <TenantContext.Provider value={{ tenant, isMainDomain, isLoading, error }}>
      {children}
    </TenantContext.Provider>
  );
};

/** Inject the tenant's primary colour into CSS custom properties. */
function applyBranding(tenant: TenantConfig) {
  const primary = tenant.branding_config?.colors?.primary;
  if (!primary) return;
  try {
    const hsl = hexToHslString(primary);
    const root = document.documentElement;
    root.style.setProperty('--primary', hsl);
    root.style.setProperty('--accent', hsl);
    root.style.setProperty('--accent-green', hsl);
    root.style.setProperty('--ring', hsl);
    root.style.setProperty('--sidebar-primary', hsl);
    root.style.setProperty('--sidebar-ring', hsl);
  } catch (e) {
    console.error('Failed to parse branding color', e);
  }
}

export const useTenant = () => {
  const ctx = useContext(TenantContext);
  if (ctx === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return ctx;
};
