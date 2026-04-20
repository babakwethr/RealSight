import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Helper to convert hex to H S% L% format used by our Tailwind/CSS vars
function hexToHslString(hex: string): string {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Parse r, g, b
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

    // Convert to percentages / degrees
    const hDeg = Math.round(h * 360);
    const sPct = Math.round(s * 100);
    const lPct = Math.round(l * 100);

    return `${hDeg} ${sPct}% ${lPct}%`;
}

export type TenantConfig = {
    id: string;
    subdomain: string;
    custom_domain: string | null;
    broker_name: string;
    branding_config: {
        colors?: {
            primary?: string;
        };
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

// Define which domains should be considered the "Main SaaS" website rather than a tenant lounge.
const MAIN_DOMAINS = ['realsight.app', 'www.realsight.app', 'app.realsight.app', 'localhost', '127.0.0.1'];

export const TenantProvider = ({ children }: { children: React.ReactNode }) => {
    const [tenant, setTenant] = useState<TenantConfig | null>(null);
    const [isMainDomain, setIsMainDomain] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const fetchTenant = async () => {
            try {
                const hostname = window.location.hostname;

                // 1. Allow forcing a tenant for visual local development via URL: ?tenant=sami
                const searchParams = new URLSearchParams(window.location.search);
                const tenantOverride = searchParams.get('tenant');

                let subdomain = '';

                if (tenantOverride) {
                    subdomain = tenantOverride.toLowerCase();
                } else if (!MAIN_DOMAINS.includes(hostname) && !hostname.includes('vercel.app')) {
                    const parts = hostname.split('.');
                    if (parts.length >= 3) {
                        subdomain = parts[0].toLowerCase();
                    } else if (parts.length === 2 && parts[1] === 'localhost') {
                        subdomain = parts[0].toLowerCase();
                    }
                }

                // 2. Determine if we belong on the Main SaaS Landing Page
                //    Vercel preview domains also use the default design system (no tenant branding)
                if (!subdomain && !tenantOverride && (MAIN_DOMAINS.includes(hostname) || hostname.includes('vercel.app'))) {
                    setIsMainDomain(true);
                    setTenant(null);
                    setIsLoading(false);
                    return;
                }

                // 3. Fallback logic and Database Query
                setIsMainDomain(false);
                
                let query = supabase.from('tenants').select('*');
                if (subdomain) {
                    query = query.eq('subdomain', subdomain);
                } else {
                    query = query.eq('custom_domain', hostname);
                }

                const { data, error: sbError } = await query.maybeSingle();

                if (sbError) throw sbError;
                if (!data) {
                    console.error('No tenant matches this domain:', hostname);
                    throw new Error('Tenant not found');
                }

                setTenant(data as TenantConfig);

                // 4. Inject strict branding variables safely
                if (data.branding_config && typeof data.branding_config === 'object') {
                    const config = data.branding_config as any;
                    if (config.colors?.primary) {
                        try {
                            const hslValue = hexToHslString(config.colors.primary);
                            const root = document.documentElement;

                            // Map to core theme colors
                            root.style.setProperty('--primary', hslValue);
                            root.style.setProperty('--accent', hslValue);
                            root.style.setProperty('--accent-green', hslValue);
                            root.style.setProperty('--ring', hslValue);
                            root.style.setProperty('--sidebar-primary', hslValue);
                            root.style.setProperty('--sidebar-ring', hslValue);
                        } catch (e) {
                            console.error('Failed to parse branding color', e);
                        }
                    }
                }
            } catch (err: any) {
                console.error('Tenant fetch error:', err);
                setError(err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchTenant();
    }, []);

    return (
        <TenantContext.Provider value={{ tenant, isMainDomain, isLoading, error }}>
            {children}
        </TenantContext.Provider>
    );
};

export const useTenant = () => {
    const context = useContext(TenantContext);
    if (context === undefined) {
        throw new Error('useTenant must be used within a TenantProvider');
    }
    return context;
};
