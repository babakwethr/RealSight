import { useState, useRef, useEffect } from 'react';
import { BackButton } from '@/components/BackButton';
import {
  Search, BarChart3, TrendingUp, CheckCircle2, Loader2,
  Building2, X, Sparkles, ExternalLink,
  Gauge, FileText, Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useGlowOnView } from '@/hooks/useGlowOnView';
import { generateDealAnalyzerPDF, type DealAnalyzerPDFData } from '@/components/pdf/DealAnalyzerPDF';
import { generateInvestorPresentationPDF } from '@/components/pdf/InvestorPresentationPDF';
import { SendActionsBar } from '@/components/dealanalyzer/SendActionsBar';
import { ListingAgentCard, type ListingAgent } from '@/components/dealanalyzer/ListingAgentCard';
import { RecentTransactionsCard } from '@/components/dealanalyzer/RecentTransactionsCard';

// ── Gemini AI verdict generation ─────────────────────────────────────────
async function generateAIVerdict(params: {
  propertyName: string;
  area: string;
  unitType: string;
  askingPrice: number;
  pricePerSqft: number;
  areaAvgPsf: number;
  yoyGrowth: number;
  rentalYield: number;
  floor?: string;
}): Promise<{
  verdict: DealAnalyzerPDFData['investmentVerdict'];
  strengths: string[];
  weaknesses: string[];
  overallAssessment: string;
  recommendedStrategy: string;
  aiAdvice: string;
}> {
  try {
    const { data: fnData, error } = await supabase.functions.invoke('gemini-proxy', {
      body: {
        prompt: `You are a Dubai real estate investment analyst. Analyze this property and return a JSON object.

Property: ${params.propertyName}
Area: ${params.area}, Dubai
Type: ${params.unitType}
Asking Price: AED ${params.askingPrice.toLocaleString()}
Price/sqft: AED ${params.pricePerSqft}
Area Avg PSF: AED ${params.areaAvgPsf}
YoY Growth: ${params.yoyGrowth.toFixed(2)}%
Rental Yield: ${params.rentalYield.toFixed(1)}%
Floor: ${params.floor || 'Not specified'}

Return ONLY valid JSON with this exact structure (no markdown, no explanation):
{
  "verdict": "BUY",
  "strengths": ["strength 1", "strength 2", "strength 3", "strength 4"],
  "weaknesses": ["weakness 1", "weakness 2", "weakness 3"],
  "overallAssessment": "2-3 sentence assessment of this investment",
  "recommendedStrategy": "1-2 sentence actionable strategy",
  "aiAdvice": "2-3 sentence personalised AI advice for this specific deal"
}

verdict must be one of: STRONG BUY, BUY, CONDITIONAL BUY, HOLD, AVOID
strengths and weaknesses: 3-5 items each, concise bullet-point style`,
      },
    });

    if (error) throw error;

    const text = fnData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(clean);
  } catch {
    const diffPct = ((params.pricePerSqft - params.areaAvgPsf) / params.areaAvgPsf) * 100;
    return {
      verdict: diffPct > 10 ? 'CONDITIONAL BUY' : diffPct < -5 ? 'BUY' : 'CONDITIONAL BUY',
      strengths: [
        `Rental yield of ${params.rentalYield.toFixed(1)}% is competitive for ${params.area}`,
        `Dubai market showing strong ${params.yoyGrowth.toFixed(1)}% YoY growth`,
        'Strong rental demand in established Dubai community',
        'Freehold ownership with investor-friendly visa eligibility',
      ],
      weaknesses: [
        diffPct > 5
          ? `Priced ${diffPct.toFixed(1)}% above area average — verify premium is justified`
          : 'High supply market — resale competition may be significant',
        'Net yield after fees typically 1.5-2% below gross yield',
        'Due diligence required on service charges and maintenance costs',
      ],
      overallAssessment: `This ${params.unitType.toLowerCase()} in ${params.area} represents a ${params.rentalYield >= 7 ? 'strong' : 'moderate'}-yield investment opportunity in one of Dubai's active residential communities. The gross yield of ${params.rentalYield.toFixed(1)}% is ${params.rentalYield >= 7 ? 'above' : 'in line with'} area benchmarks. ${diffPct > 5 ? 'The asking price carries a modest premium to the area average, warranting negotiation.' : 'Pricing is competitive relative to comparable transactions.'}`,
      recommendedStrategy: diffPct > 5
        ? `Negotiate the asking price to AED ${Math.round(params.askingPrice * 0.93).toLocaleString()}–${Math.round(params.askingPrice * 0.96).toLocaleString()} to improve the risk-return profile. A cash offer provides meaningful negotiating leverage in the current market.`
        : `Proceed with due diligence and an offer close to or at asking price. The pricing is supported by comparable sales evidence.`,
      aiAdvice: `Based on current DLD data, ${params.area} continues to show strong rental demand. ${params.rentalYield >= 7 ? 'The yield profile makes this suitable for an income-focused strategy.' : 'Focus on the capital appreciation potential alongside the income yield.'} Monitor the area's new supply pipeline, as high completions could moderate near-term rental growth.`,
    };
  }
}

// ── Search autocomplete component ────────────────────────────────────────
function DLDSearchInput({
  value,
  onChange,
  onSelect,
  areas,
  placeholder = 'Search area or building...',
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (name: string) => void;
  areas: { name: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = value.length >= 2
    ? areas.filter(a => a.name.toLowerCase().includes(value.toLowerCase())).slice(0, 8)
    : [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={value}
          onChange={e => { onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="glass-input pl-9"
        />
        {value && (
          <button
            onClick={() => { onChange(''); setOpen(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
          {filtered.map(a => (
            <button
              key={a.name}
              onMouseDown={() => { onSelect(a.name); onChange(a.name); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-center gap-2"
            >
              <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              {a.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Listing source tile ───────────────────────────────────────────────────
function ListingSourceField({
  source,
  value,
  onChange,
  logoSrc,
  fallbackColor,
  fallbackLetter,
  isExtracting,
}: {
  source: 'Bayut' | 'Property Finder' | 'Dubizzle';
  value: string;
  onChange: (v: string) => void;
  /** Path to the official brand logo (e.g. "/brand/bayut.png").
   *  When the file is missing, we fall back to a colored letter mark. */
  logoSrc: string;
  fallbackColor: string;
  fallbackLetter: string;
  /** Show a spinner + "Reading…" badge while the URL is being scraped. */
  isExtracting?: boolean;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = !!logoSrc && !logoFailed;

  const detected = value.toLowerCase().includes(source.toLowerCase().split(' ')[0]);
  const placeholder = source === 'Bayut'
    ? 'https://bayut.com/property/...'
    : source === 'Property Finder'
      ? 'https://propertyfinder.ae/...'
      : 'https://dubizzle.com/...';

  return (
    <div className="relative group">
      <div
        className={cn(
          'rounded-2xl ring-1 transition-all overflow-hidden',
          detected ? 'ring-[#18d6a4]/45' : 'ring-white/[0.18] hover:ring-white/[0.30]',
        )}
        style={{
          background: 'rgba(7, 4, 15, 0.45)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        }}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.06]">
          {showLogo ? (
            // Square brand mark — shipped at /public/brand/<source>.png.
            // We render it in a 28px tile with `object-contain` so the
            // logo's own padding/silhouette stays intact (no zooming or
            // bleeding past the rounded corners).
            <img
              src={logoSrc}
              alt={`${source} logo`}
              onError={() => setLogoFailed(true)}
              className="w-7 h-7 rounded-lg object-contain bg-white shrink-0"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0"
              style={{ background: fallbackColor }}
              aria-label={`${source} logo`}
            >
              {fallbackLetter}
            </div>
          )}
          <span className="text-[12px] font-bold text-white tracking-tight flex-1">{source}</span>
          {isExtracting ? (
            <span className="text-[10px] font-semibold text-[#7aa6ff] flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" /> Reading…
            </span>
          ) : detected ? (
            <span className="text-[10px] font-semibold text-[#2effc0] flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Detected
            </span>
          ) : null}
        </div>
        <div className="px-3 py-2.5">
          <div className="relative">
            <Input
              value={value}
              onChange={e => onChange(e.target.value)}
              placeholder={placeholder}
              className="glass-input pr-10 text-[12px] h-9"
            />
            {value && (
              <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md hover:bg-white/[0.08] flex items-center justify-center text-white/50 hover:text-white transition-colors"
                aria-label={`Open ${source} listing`}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
interface AnalysisResult {
  propertyName: string;
  area: string;
  unitType: string;
  size: number;
  floor?: string;
  askingPrice: number;
  pricePerSqft: number;
  areaAvgPsf: number;
  area12mAgoPsf: number;
  yoyGrowth: number;
  rentalYieldArea: number;
  annualRentLow: number;
  annualRentMid: number;
  annualRentHigh: number;
  diff: number;
  demand: string;
  liquidity: string;
  trend: string;
  verdict: string;
  verdictColor: string;
  cashFlow?: string;
  irr?: string;
  /** Listing photos from the URL extractor (URL paste flow only). Surfaced
   *  on the PDF Gallery page when present. Empty when the user used the
   *  manual form. */
  photos?: string[];
  aiVerdict?: DealAnalyzerPDFData['investmentVerdict'];
  strengths?: string[];
  weaknesses?: string[];
  overallAssessment?: string;
  recommendedStrategy?: string;
  aiAdvice?: string;
  aiLoading?: boolean;
}

function DealAnalyzerContent() {
  const { isAdviser, isAdviserPro, isPro } = useSubscription();
  const { user } = useAuth();
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Listing-source URLs (all visible, all optional — for adviser reference)
  const [bayutUrl, setBayutUrl] = useState('');
  const [pfUrl, setPfUrl] = useState('');
  const [dubizzleUrl, setDubizzleUrl] = useState('');
  const [extracting, setExtracting] = useState<'bayut' | 'propertyfinder' | 'dubizzle' | null>(null);

  // Active input mode — tabs at the top of the input card switch
  // between the URL paste flow (default) and the manual form. Only
  // one is visible at a time which keeps the page focused and gives
  // each input plenty of horizontal breathing room on desktop.
  const [activeTab, setActiveTab] = useState<'link' | 'manual'>('link');

  // Refs for the cards that should fire the entrance glow when they
  // scroll into view. Reserved for hero / above-the-fold cards so the
  // page doesn't feel busy.
  const quickStartRef = useGlowOnView<HTMLElement>();
  const verdictRef    = useGlowOnView<HTMLDivElement>();

  // Listing agent — populated when extract-listing returns agent
  // contact info (Dubizzle exposes this; Bayut/PF blocked on trial
  // ScraperAPI for now). Cleared whenever the URL changes.
  const [extractedAgent, setExtractedAgent] = useState<ListingAgent | null>(null);

  // Form entry state
  const [propertyName, setPropertyName] = useState('');
  const [areaSearch, setAreaSearch] = useState('');
  const [selectedArea, setSelectedArea] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualSize, setManualSize] = useState('');
  const [manualType, setManualType] = useState('apartment');
  const [manualFloor, setManualFloor] = useState('');
  const [manualBeds, setManualBeds] = useState('1');
  const [manualRent, setManualRent] = useState('');
  const [manualServiceCharge, setManualServiceCharge] = useState('');

  const { data: dldAreas } = useQuery({
    queryKey: ['deal-analyzer-areas'],
    queryFn: async () => {
      const { data, error } = await supabase.from('dld_areas').select('*').order('name');
      if (error) throw error;
      return data;
    },
  });

  // Adviser context for the PDF: name + phone + email PLUS the tenant
  // fields we render on page 7 (photo, RERA QR, RERA number, slug for
  // the upsell footer).
  const { data: agentProfile } = useQuery({
    queryKey: ['agent-profile', user?.id],
    enabled: !!user?.id && isAdviser,
    queryFn: async () => {
      const [profileRes, investorRes] = await Promise.all([
        supabase.from('profiles').select('full_name, tenant_id').eq('user_id', user!.id).maybeSingle(),
        supabase.from('investors').select('phone').eq('user_id', user!.id).maybeSingle(),
      ]);

      // Fetch tenant once we know its ID — gives us branding_config
      // (logo, photo, contact_email, bio), rera_number, rera_qr_url,
      // subdomain (URL slug for the upsell footer).
      let tenantData: any = null;
      if (profileRes.data?.tenant_id) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('subdomain, broker_name, branding_config, rera_number, rera_qr_url')
          .eq('id', profileRes.data.tenant_id)
          .maybeSingle();
        tenantData = tenant;
      }

      const branding = (tenantData?.branding_config ?? {}) as Record<string, any>;
      return {
        name: profileRes.data?.full_name || user?.email || 'Agent',
        phone: investorRes.data?.phone || '',
        email: user?.email || '',
        tenantId:      profileRes.data?.tenant_id || undefined,
        // Tenant-level branding + compliance
        tenantSlug:    tenantData?.subdomain || undefined,
        agencyName:    tenantData?.broker_name || undefined,
        agentPhotoUrl: typeof branding.photo_url === 'string' ? branding.photo_url : undefined,
        reraNumber:    tenantData?.rera_number || undefined,
        reraQrUrl:     tenantData?.rera_qr_url || undefined,
      };
    },
  });

  const agentTenantId = agentProfile?.tenantId;

  // ── URL paste → background analysis ──────────────────────────────────
  // Founder ask (28 Apr 2026): the link path should "just work" — paste
  // a URL, get a result. We extract server-side, and:
  //   • If we have area + price + size → run the analysis automatically
  //     and show the result. The form stays in sync but the user
  //     doesn't have to click "Analyze".
  //   • If we got partial data → fill the form, focus the missing field.
  //   • If the scrape failed entirely → "Couldn't find the property"
  //     toast and the manual form is the fallback.
  const tryExtract = async (url: string, source: 'bayut' | 'propertyfinder' | 'dubizzle') => {
    if (!url || !/^https?:\/\//i.test(url)) return;
    setExtracting(source);
    // Reset the previous agent card immediately — user has typed a
    // new URL so the old agent should not linger while we're fetching.
    setExtractedAgent(null);
    const platformLabels = { bayut: 'Bayut', propertyfinder: 'Property Finder', dubizzle: 'Dubizzle' };
    // Sticky progress toast — Sonner returns a numeric id we can update
    // through the pipeline so the user sees stages instead of one
    // static "Reading…" line during the ~45s render.
    const progressId = toast.loading(`Connecting to ${platformLabels[source]}…`);

    try {
      const { data, error } = await supabase.functions.invoke('extract-listing', { body: { url } });
      if (error) throw error;
      const r = data as {
        propertyName?: string; area?: string; propertyType?: string;
        bedrooms?: number; size?: number; price?: number; rent?: number;
        photoUrl?: string; photos?: string[];
        agent?: ListingAgent;
        confidence?: number; error?: string; _cache?: 'hit' | 'miss';
      };
      if (r?.error) {
        toast.error(`Couldn't find the property in this ${source} link.`, {
          id: progressId,
          description: 'Please enter the property details below to analyse manually.',
        });
        setActiveTab('manual');
        return;
      }

      // Diagnostic — surfaces in browser console so QA can see what
      // came back from the extractor (and whether it was a cache hit).
      console.info('[DealAnalyzer] extract-listing returned', {
        source,
        cache: r._cache,
        confidence: r.confidence,
        photos: Array.isArray(r.photos) ? r.photos.length : 0,
        firstPhoto: r.photos?.[0]?.slice(0, 80),
        propertyName: r.propertyName,
      });

      // Mirror everything we got into the visible form so the adviser
      // can see what was extracted and edit if needed.
      if (r.propertyName) setPropertyName(r.propertyName);
      if (r.area) { setAreaSearch(r.area); setSelectedArea(r.area); }
      if (r.propertyType && ['apartment','villa','townhouse','penthouse','land'].includes(r.propertyType)) {
        setManualType(r.propertyType);
      }
      if (typeof r.bedrooms === 'number') setManualBeds(String(r.bedrooms));
      if (r.size) setManualSize(String(r.size));
      if (r.price) setManualPrice(String(r.price));
      if (r.rent) setManualRent(String(r.rent));
      // Listing agent — only set when the extractor exposed it
      // (Dubizzle today). Card renders below the URL section.
      if (r.agent && (r.agent.name || r.agent.mobile || r.agent.email)) {
        setExtractedAgent(r.agent);
      } else {
        setExtractedAgent(null);
      }

      // If we have everything needed for analysis, run it in the
      // background and surface the result.
      const hasMinimum = !!r.area && !!r.price && !!r.size;
      if (hasMinimum) {
        toast.loading(
          r._cache === 'hit'
            ? `Loaded from cache — running analysis…`
            : `Reading complete — running analysis…`,
          { id: progressId },
        );
        await runAnalysis({
          area: r.area!,
          price: r.price!,
          size: r.size!,
          propertyName: r.propertyName,
          propertyType: r.propertyType,
          bedrooms: typeof r.bedrooms === 'number' ? String(r.bedrooms) : undefined,
          rent: r.rent,
          photos: r.photos,
        });
        toast.success(`Analysis ready` + (r._cache === 'hit' ? ' (cached)' : ''), {
          id: progressId,
          description: `${platformLabels[source]} listing analysed against live DLD data.`,
        });
      } else {
        // Partial — tell them what's still needed and switch to the
        // manual tab so they can see the partially-filled form and
        // fill in the missing fields.
        const missing = [
          !r.area && 'Area',
          !r.price && 'Price',
          !r.size && 'Size',
        ].filter(Boolean) as string[];
        toast.info(`Couldn't find ${missing.join(', ').toLowerCase()} in the ${platformLabels[source]} listing.`, {
          id: progressId,
          description: missing.length > 0
            ? `Please add ${missing.join(' and ').toLowerCase()} below, then click Analyze.`
            : 'Please review the form below and click Analyze.',
        });
        setActiveTab('manual');
      }
    } catch (e) {
      toast.error(`Couldn't find the property in this link.`, {
        id: progressId,
        description: 'Please enter the property details below to analyse manually.',
      });
      setActiveTab('manual');
    } finally {
      setExtracting(null);
    }
  };

  // Debounced auto-extraction — fires 600ms after the user stops typing.
  // We watch each URL state independently so editing one doesn't refetch
  // the others. Only triggers when the URL looks like a real http(s) link.
  useEffect(() => {
    if (!bayutUrl) return;
    const t = setTimeout(() => tryExtract(bayutUrl, 'bayut'), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bayutUrl]);

  useEffect(() => {
    if (!pfUrl) return;
    const t = setTimeout(() => tryExtract(pfUrl, 'propertyfinder'), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pfUrl]);

  useEffect(() => {
    if (!dubizzleUrl) return;
    const t = setTimeout(() => tryExtract(dubizzleUrl, 'dubizzle'), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dubizzleUrl]);

  // No auto-collapse on result-arrival — the input card lives above
  // the result and stays visible. Tabs let the user re-edit either
  // mode in place without scrolling state in the way.

  const findAreaData = (areaName: string) => {
    if (!dldAreas || !areaName) return null;
    const name = areaName.toLowerCase().trim();
    return dldAreas.find(a => a.name.toLowerCase() === name)
      || dldAreas.find(a => a.name.toLowerCase().includes(name) || name.includes(a.name.toLowerCase()))
      || dldAreas.find(a => name.split(' ').some(w => w.length > 2 && a.name.toLowerCase().includes(w)));
  };

  const getDemandLabel = (score: number) =>
    score >= 80 ? 'Very High' : score >= 60 ? 'High' : score >= 40 ? 'Moderate' : score >= 20 ? 'Low' : 'Very Low';

  const getLiquidityLabel = (volume: number) =>
    volume >= 300 ? 'Very High' : volume >= 150 ? 'High' : volume >= 50 ? 'Good' : volume >= 20 ? 'Moderate' : 'Low';

  const getTrendLabel = (current: number, historical: number) => {
    const change = ((current - historical) / historical) * 100;
    return change >= 10 ? 'Strong Upward' : change >= 3 ? 'Upward' : change >= -3 ? 'Stable' : change >= -10 ? 'Downward' : 'Declining';
  };

  /**
   * runAnalysis — pure analysis routine. Accepts explicit inputs so it
   * can be called from either the form button (which reads state) or
   * the URL extractor (which has its own values from the scrape).
   */
  const runAnalysis = async (inputs: {
    area: string;
    price: number;
    size: number;
    propertyName?: string;
    propertyType?: string;
    bedrooms?: string;
    floor?: string;
    rent?: number;
    serviceCharge?: number;
    /** Listing photos from URL extractor — surfaced on the PDF Gallery page. */
    photos?: string[];
  }) => {
    const { area, price, size } = inputs;
    if (!price || !size || !area) { toast.error('Please fill in Area, Price and Size.'); return; }

    setAnalyzing(true);
    setResult(null);

    const propType = (inputs.propertyType || 'apartment').toLowerCase();
    const beds = inputs.bedrooms || '1';

    const pps = Math.round(price / size);
    const areaData = findAreaData(area);
    const avgPps = areaData?.avg_price_per_sqft_current || 1800;
    const yieldAvg = areaData?.rental_yield_avg || 5.5;
    const demandScore = areaData?.demand_score || 50;
    const txVolume = areaData?.transaction_volume_30d || 50;
    const priceHistory = areaData?.avg_price_per_sqft_12m_ago || avgPps * 0.9;
    const yoyGrowth = ((avgPps - priceHistory) / priceHistory) * 100;

    const rent = inputs.rent;
    const serviceFee = inputs.serviceCharge;

    const calculatedYield = rent ? (rent / price) * 100 : yieldAvg;
    const rentMid = rent || Math.round(price * (yieldAvg / 100));
    const rentLow = Math.round(rentMid * 0.9);
    const rentHigh = Math.round(rentMid * 1.1);

    const diff = Math.round(((pps - avgPps) / avgPps) * 100);
    let verdictText: string;
    let verdictColor: string;

    if (diff > 15) { verdictText = 'Significantly Above Market — Strong Negotiation Recommended'; verdictColor = 'text-red-400'; }
    else if (diff > 5) { verdictText = 'Above Market — Negotiate or Verify Premium'; verdictColor = 'text-amber-400'; }
    else if (diff >= -5) { verdictText = 'Fair Market Price — Proceed with Due Diligence'; verdictColor = 'text-primary'; }
    else if (diff >= -15) { verdictText = 'Below Market — Potential Opportunity'; verdictColor = 'text-emerald-400'; }
    else { verdictText = 'Well Below Market — Verify Listing Accuracy'; verdictColor = 'text-emerald-400'; }

    let cashFlow = '';
    if (rent) {
      const annualCosts = (serviceFee || 0) * size;
      cashFlow = `AED ${new Intl.NumberFormat('en-US').format(Math.round(rent - annualCosts))}/yr`;
    }

    const baseResult: AnalysisResult = {
      propertyName: inputs.propertyName || `${area} ${propType}`,
      area: areaData?.name || area,
      unitType: `${beds === '0' ? 'Studio' : beds + '-Bedroom'} ${propType.charAt(0).toUpperCase() + propType.slice(1)}`,
      size,
      floor: inputs.floor || undefined,
      askingPrice: price,
      pricePerSqft: pps,
      areaAvgPsf: avgPps,
      area12mAgoPsf: priceHistory,
      yoyGrowth,
      rentalYieldArea: yieldAvg,
      annualRentLow: rentLow,
      annualRentMid: rentMid,
      annualRentHigh: rentHigh,
      diff,
      demand: getDemandLabel(demandScore),
      liquidity: getLiquidityLabel(txVolume),
      trend: getTrendLabel(avgPps, priceHistory),
      verdict: verdictText,
      verdictColor,
      cashFlow: cashFlow || undefined,
      irr: `${(calculatedYield + Math.max(0, yoyGrowth)).toFixed(1)}%`,
      photos: inputs.photos && inputs.photos.length > 0 ? inputs.photos.slice(0, 8) : undefined,
      aiLoading: true,
    };

    setResult(baseResult);
    setAnalyzing(false);

    // Scroll into view so the user actually sees the result that just
    // appeared (especially important for URL paste flow — they pasted
    // at the top, the result lands further down the page).
    setTimeout(() => {
      document.getElementById('analysis-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      const ai = await generateAIVerdict({
        propertyName: baseResult.propertyName,
        area: baseResult.area,
        unitType: baseResult.unitType,
        askingPrice: price,
        pricePerSqft: pps,
        areaAvgPsf: avgPps,
        yoyGrowth,
        rentalYield: calculatedYield,
        floor: inputs.floor,
      });
      setResult(prev => prev ? { ...prev, ...ai, aiVerdict: ai.verdict, aiLoading: false } : prev);
    } catch {
      setResult(prev => prev ? { ...prev, aiLoading: false } : prev);
    }
  };

  /**
   * handleAnalyze — invoked by the Analyze Deal button. Reads form
   * state and delegates to runAnalysis.
   */
  const handleAnalyze = async () => {
    return runAnalysis({
      area: selectedArea || areaSearch,
      price: Number(manualPrice),
      size: Number(manualSize),
      propertyName: propertyName || undefined,
      propertyType: manualType,
      bedrooms: manualBeds,
      floor: manualFloor || undefined,
      rent: manualRent ? Number(manualRent) : undefined,
      serviceCharge: manualServiceCharge ? Number(manualServiceCharge) : undefined,
    });
  };

  const buildPDFData = (): DealAnalyzerPDFData | null => {
    if (!result) return null;
    return {
      propertyName: result.propertyName,
      area: result.area,
      unitType: result.unitType,
      size: result.size,
      floor: result.floor,
      status: 'Ready',
      askingPrice: result.askingPrice,
      pricePerSqft: result.pricePerSqft,
      areaAvgPsf: result.areaAvgPsf,
      area12mAgoPsf: result.area12mAgoPsf,
      yoyGrowth: result.yoyGrowth,
      rentalYieldArea: result.rentalYieldArea,
      annualRentLow: result.annualRentLow,
      annualRentMid: result.annualRentMid,
      annualRentHigh: result.annualRentHigh,
      suggestedEntryLow: result.diff > 5 ? Math.round(result.askingPrice * 0.92) : undefined,
      suggestedEntryHigh: result.diff > 5 ? Math.round(result.askingPrice * 0.96) : undefined,
      investmentVerdict: result.aiVerdict || 'CONDITIONAL BUY',
      strengths: result.strengths || [
        `Rental yield of ~${((result.annualRentMid / result.askingPrice) * 100).toFixed(1)}%`,
        `Dubai market ${result.yoyGrowth.toFixed(1)}% YoY growth`,
        'Strong rental demand in established community',
        'Freehold with long-term visa eligibility',
      ],
      weaknesses: result.weaknesses || [
        'Service charges and vacancy reduce net yield',
        'High supply in some Dubai areas affects resale',
        'Independent snagging inspection recommended',
      ],
      overallAssessment: result.overallAssessment || `This ${result.unitType.toLowerCase()} in ${result.area} offers a competitive yield profile relative to the Dubai market. The pricing at AED ${result.pricePerSqft}/sqft is ${result.diff > 0 ? 'above' : 'below'} the area average, warranting careful consideration of comparable evidence.`,
      recommendedStrategy: result.recommendedStrategy || `Proceed with due diligence and negotiate based on comparable sales. ${result.diff > 5 ? 'The asking price has room for negotiation given the market evidence.' : 'The pricing appears competitive; a prompt offer is advisable.'}`,
      aiAdvice: result.aiAdvice,
      isAdviser,
      agentName:     isAdviser ? (agentProfile?.name || user?.email) : undefined,
      agentRole:     isAdviser ? 'Property Adviser' : undefined,
      agentPhone:    isAdviser ? agentProfile?.phone : undefined,
      agentEmail:    isAdviser ? agentProfile?.email : undefined,
      agencyName:    isAdviser ? agentProfile?.agencyName : undefined,
      // Tenant-level branding + RERA compliance for the agent card on
      // page 7. All optional — page falls back gracefully when fields
      // aren't filled (e.g. adviser hasn't completed RERA onboarding).
      agentPhotoUrl: isAdviser ? agentProfile?.agentPhotoUrl : undefined,
      reraQrUrl:     isAdviser ? agentProfile?.reraQrUrl : undefined,
      reraNumber:    isAdviser ? agentProfile?.reraNumber : undefined,
      tenantSlug:    isAdviser ? agentProfile?.tenantSlug : undefined,
      // Listing photos for the Gallery page (URL paste flow only).
      photos: result.photos,
      reportDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
  };

  // Legacy download handlers were replaced by <SendActionsBar/> below —
  // it owns Download / Email / WhatsApp via a single generatePdf prop.

  const canAnalyze = !!manualPrice && !!manualSize && (!!selectedArea || !!areaSearch);

  return (
    <div className="animate-fade-in">
      <BackButton />

      {/* ── Hero header — gradient word + AI accent ── */}
      <div className="relative mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{
              background: 'radial-gradient(circle at 30% 20%, #2effc0 0%, #18d6a4 45%, #059669 100%)',
              boxShadow: '0 8px 24px rgba(24,214,164,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
          >
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tight leading-none">
              Deal{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)' }}
              >
                Analyzer
              </span>
            </h1>
            <p className="text-[13px] lg:text-sm text-muted-foreground mt-1">
              Score any Dubai property against live DLD data + AI advice — in seconds
            </p>
          </div>
        </div>
      </div>

      {/* ── Inputs card — single full-width box with tabs at the top.
          Tab A (Got a link) is the default; Tab B (No link) is the
          manual form fallback. We auto-switch to manual when an
          extraction fails or returns partial data so the user sees
          the partly-filled form and can complete it. */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'link' | 'manual')}
        className="w-full mb-6"
      >
        <section
          ref={quickStartRef}
          className="glass-panel accent-emerald glow-on-view overflow-hidden"
        >
          {/* Tab triggers — full-width header strip with Option A/B chips */}
          <TabsList className="grid grid-cols-2 w-full bg-transparent rounded-none p-0 h-auto border-b border-white/[0.06]">
            <TabsTrigger
              value="link"
              className="group flex items-center gap-3 px-4 sm:px-6 py-4 rounded-none data-[state=active]:bg-emerald-400/[0.05] data-[state=active]:shadow-[inset_0_-2px_0_0_rgb(46,255,192)] hover:bg-white/[0.02] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.04] border border-white/[0.06] group-data-[state=active]:bg-emerald-400/15 group-data-[state=active]:border-emerald-400/30 transition-colors">
                <Sparkles className="h-4 w-4 text-white/55 group-data-[state=active]:text-emerald-300 transition-colors" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45 group-data-[state=active]:text-[#2effc0] transition-colors">Option A</p>
                <p className="text-[13px] sm:text-sm font-bold text-foreground truncate">Got a link</p>
              </div>
            </TabsTrigger>

            <TabsTrigger
              value="manual"
              className="group flex items-center gap-3 px-4 sm:px-6 py-4 rounded-none data-[state=active]:bg-blue-400/[0.05] data-[state=active]:shadow-[inset_0_-2px_0_0_rgb(122,166,255)] hover:bg-white/[0.02] transition-colors"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/[0.04] border border-white/[0.06] group-data-[state=active]:bg-blue-400/15 group-data-[state=active]:border-blue-400/30 transition-colors">
                <BarChart3 className="h-4 w-4 text-white/55 group-data-[state=active]:text-[#7aa6ff] transition-colors" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/45 group-data-[state=active]:text-[#7aa6ff] transition-colors">Option B</p>
                <p className="text-[13px] sm:text-sm font-bold text-foreground truncate">No link</p>
              </div>
            </TabsTrigger>
          </TabsList>

          {/* ── Tab A · URL paste ── */}
          <TabsContent value="link" className="m-0 px-5 sm:px-7 lg:px-8 py-6 lg:py-7 outline-none focus-visible:outline-none">
            <p className="text-[13px] sm:text-sm text-white/65 mb-5 leading-relaxed max-w-3xl">
              Paste your client's <span className="text-white/85 font-semibold">Bayut, Property Finder, or Dubizzle</span> link. We'll read the listing and <span className="text-[#2effc0]/90 font-semibold">run the analysis automatically</span> — full report appears below in seconds.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 lg:gap-4">
              <ListingSourceField
                source="Bayut"
                value={bayutUrl}
                onChange={setBayutUrl}
                logoSrc="/brand/bayut.png"
                fallbackColor="#16a34a"
                fallbackLetter="B"
                isExtracting={extracting === 'bayut'}
              />
              <ListingSourceField
                source="Property Finder"
                value={pfUrl}
                onChange={setPfUrl}
                logoSrc="/brand/propertyfinder.png"
                fallbackColor="#ef4135"
                fallbackLetter="P"
                isExtracting={extracting === 'propertyfinder'}
              />
              <ListingSourceField
                source="Dubizzle"
                value={dubizzleUrl}
                onChange={setDubizzleUrl}
                logoSrc="/brand/dubizzle.png"
                fallbackColor="#ed3a47"
                fallbackLetter="D"
                isExtracting={extracting === 'dubizzle'}
              />
            </div>
            <p className="text-[11px] text-white/40 mt-4">
              No link?{' '}
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className="text-[#7aa6ff] hover:text-[#9fb9ff] underline-offset-2 hover:underline transition-colors font-semibold"
              >
                Switch to manual entry →
              </button>
            </p>
          </TabsContent>

          {/* ── Tab B · Manual form ── */}
          <TabsContent value="manual" className="m-0 px-5 sm:px-7 lg:px-8 py-6 lg:py-7 outline-none focus-visible:outline-none">
            <p className="text-[13px] sm:text-sm text-white/65 mb-5 leading-relaxed max-w-3xl">
              Enter the property by hand. We need <span className="text-white/85 font-semibold">area, price, and size</span> at minimum — the rest helps the AI write a more accurate verdict.
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-4">
              {/* Property name — full width on all breakpoints */}
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label className="text-[11px] font-semibold text-white/65 uppercase tracking-wide">Property / Development Name</Label>
                <Input
                  value={propertyName}
                  onChange={e => setPropertyName(e.target.value)}
                  placeholder="e.g. Luma 22, Creek Rise Tower 1..."
                  className="glass-input"
                />
              </div>

              {/* Area + auto-match */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/65 uppercase tracking-wide">
                  Area <span className="text-red-400">*</span> <span className="text-[10px] font-normal normal-case text-[#18d6a4]">(matches DLD database)</span>
                </Label>
                <DLDSearchInput
                  value={areaSearch}
                  onChange={v => { setAreaSearch(v); if (v !== selectedArea) setSelectedArea(''); }}
                  onSelect={name => setSelectedArea(name)}
                  areas={dldAreas || []}
                  placeholder="Type area name, e.g. JVC..."
                />
                {selectedArea && (
                  <p className="text-[10px] text-emerald-400 flex items-center gap-1 pt-0.5">
                    <CheckCircle2 className="h-3 w-3" /> Matched to DLD: {selectedArea}
                  </p>
                )}
              </div>

              {/* Property type */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/65 uppercase tracking-wide">Property Type</Label>
                <Select value={manualType} onValueChange={setManualType}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['apartment', 'villa', 'townhouse', 'penthouse', 'land'].map(t => (
                      <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bedrooms */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/65 uppercase tracking-wide">Bedrooms</Label>
                <Select value={manualBeds} onValueChange={setManualBeds}>
                  <SelectTrigger className="glass-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Studio</SelectItem>
                    {['1', '2', '3', '4', '5'].map(n => (
                      <SelectItem key={n} value={n}>{n} Bedroom</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Floor */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/65 uppercase tracking-wide">Floor / Level</Label>
                <Input
                  value={manualFloor}
                  onChange={e => setManualFloor(e.target.value)}
                  placeholder="e.g. 8, Ground, Penthouse..."
                  className="glass-input"
                />
              </div>

              {/* Price */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/65 uppercase tracking-wide">
                  Asking Price (AED) <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  value={manualPrice}
                  onChange={e => setManualPrice(e.target.value)}
                  placeholder="2,100,000"
                  className="glass-input"
                />
              </div>

              {/* Size */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/65 uppercase tracking-wide">
                  Size (sq ft) <span className="text-red-400">*</span>
                </Label>
                <Input
                  type="number"
                  value={manualSize}
                  onChange={e => setManualSize(e.target.value)}
                  placeholder="1,200"
                  className="glass-input"
                />
              </div>

              {/* Annual rent */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/65 uppercase tracking-wide">Expected Annual Rent (AED)</Label>
                <Input
                  type="number"
                  value={manualRent}
                  onChange={e => setManualRent(e.target.value)}
                  placeholder="120,000"
                  className="glass-input"
                />
              </div>

              {/* Service charge */}
              <div className="space-y-1.5">
                <Label className="text-[11px] font-semibold text-white/65 uppercase tracking-wide">Service Charge (AED/sqft/yr)</Label>
                <Input
                  type="number"
                  value={manualServiceCharge}
                  onChange={e => setManualServiceCharge(e.target.value)}
                  placeholder="25"
                  className="glass-input"
                />
              </div>
            </div>

            {/* CTA bar — bottom-aligned analyze button + helper line */}
            <div className="mt-7 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-[12px] text-white/55">
                We'll match your area to live <span className="text-white/85 font-semibold">DLD transactions</span> and run an{' '}
                <span className="text-[#2effc0] font-semibold">AI verdict</span> in seconds.
              </p>
              <Button
                onClick={handleAnalyze}
                disabled={analyzing || !canAnalyze}
                size="lg"
                className="rounded-full px-6 font-bold shrink-0"
                style={{
                  background: canAnalyze
                    ? 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)'
                    : undefined,
                  color: canAnalyze ? '#04130b' : undefined,
                }}
              >
                {analyzing
                  ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyzing…</>
                  : <><Sparkles className="h-4 w-4 mr-2" /> Analyze Deal</>}
              </Button>
            </div>
          </TabsContent>
        </section>
      </Tabs>

      {/* ── Result canvas — listing context + verdict (full width) ── */}
      <div className="space-y-4">

      {/* Listing agent card — surfaces the broker who posted the
          listing on Dubizzle (name, photo, agency, RERA BRN, contact).
          Renders only when extract-listing returned agent data. */}
      {extractedAgent && (
        <ListingAgentCard agent={extractedAgent} />
      )}

      {/* Recent DLD-registered transactions — pulls the last 10
          comparable sales from DLD's DDA Open API via dld-proxy.
          Renders a graceful "awaiting DLD allowlist" placeholder
          while DDA's IP allowlist is still pending; the moment
          DDA_ENABLED=true flips and the gateway returns rows, this
          card auto-populates without redeploy. See LAUNCH_PLAN §14. */}
      {(extractedAgent || result?.area || selectedArea || areaSearch) && (
        <RecentTransactionsCard
          area={selectedArea || areaSearch || result?.area}
          propertyName={propertyName || result?.propertyName}
          unitType={result?.unitType}
        />
      )}

      {/* ── Empty state — shown when no analysis result yet.
          Cinematic right-canvas hero: aurora glow background, big
          mint orb, then 3 deliverable cards explaining what the
          user is about to get (Verdict / Numbers / PDF). Matches
          the V3 design language: dark + mint accent + glassmorphism. */}
      {!result && (
        <div className="glass-panel accent-emerald glow-on-view relative overflow-hidden p-6 sm:p-8 lg:p-10">
          {/* Aurora glow orbs — soft, blurred, decorative only */}
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <div
              className="absolute -top-20 -right-16 w-80 h-80 rounded-full opacity-50"
              style={{ background: 'radial-gradient(circle, rgba(46,255,192,0.22) 0%, transparent 65%)', filter: 'blur(40px)' }}
            />
            <div
              className="absolute -bottom-24 -left-16 w-80 h-80 rounded-full opacity-40"
              style={{ background: 'radial-gradient(circle, rgba(45,92,255,0.20) 0%, transparent 65%)', filter: 'blur(40px)' }}
            />
            <div
              className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-25"
              style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06) 0%, transparent 70%)', filter: 'blur(30px)' }}
            />
          </div>

          {/* Hero block: orb + headline + subhead */}
          <div className="relative text-center max-w-xl mx-auto mb-7 lg:mb-9">
            <div className="relative w-20 h-20 lg:w-24 lg:h-24 mx-auto mb-6">
              <div
                className="absolute inset-0 rounded-3xl animate-pulse"
                style={{
                  background: 'radial-gradient(circle at 30% 20%, #2effc0 0%, #18d6a4 45%, #059669 100%)',
                  boxShadow: '0 24px 60px rgba(24,214,164,0.55), inset 0 1px 0 rgba(255,255,255,0.45)',
                }}
              />
              <div className="absolute inset-0 rounded-3xl flex items-center justify-center">
                <Sparkles className="h-10 w-10 lg:h-11 lg:w-11 text-white drop-shadow" />
              </div>
            </div>
            <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.22em] text-[#2effc0]/90 mb-2.5">
              AI Deal Analyzer
            </p>
            <h3 className="text-2xl sm:text-3xl lg:text-[2.1rem] font-black text-foreground mb-3 tracking-tight leading-tight">
              Your verdict appears here
            </h3>
            <p className="text-sm sm:text-[15px] text-muted-foreground leading-relaxed">
              Paste a Bayut, Property Finder or Dubizzle link on the left — or fill the form by hand. We pull the listing, score it against live DLD comparables, and write you a branded PDF you can send to your client.
            </p>
          </div>

          {/* 3 deliverable cards — what the user is about to get */}
          <div className="relative grid sm:grid-cols-3 gap-3 lg:gap-4">
            {/* Card 1 — Market Verdict */}
            <div className="glass-card p-4 lg:p-5 border-l-4 border-l-emerald-400/55 hover:border-l-emerald-400/80 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-emerald-400/12 border border-emerald-400/25 flex items-center justify-center mb-3">
                <Gauge className="h-5 w-5 text-emerald-300" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300/90 mb-1.5">Verdict</p>
              <p className="text-sm font-bold text-foreground mb-1 leading-snug">Market Score 0–100</p>
              <p className="text-[12px] text-muted-foreground leading-snug">Above / at / below market vs. live DLD comps in the same area</p>
            </div>

            {/* Card 2 — Yield + Cash Flow */}
            <div className="glass-card p-4 lg:p-5 border-l-4 border-l-cyan-400/55 hover:border-l-cyan-400/80 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-cyan-400/12 border border-cyan-400/25 flex items-center justify-center mb-3">
                <TrendingUp className="h-5 w-5 text-cyan-300" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-300/90 mb-1.5">Numbers</p>
              <p className="text-sm font-bold text-foreground mb-1 leading-snug">Yield + Cash Flow</p>
              <p className="text-[12px] text-muted-foreground leading-snug">Gross yield, IRR, demand &amp; liquidity scores, recommended strategy</p>
            </div>

            {/* Card 3 — PDF */}
            <div className="glass-card p-4 lg:p-5 border-l-4 border-l-amber-400/55 hover:border-l-amber-400/80 transition-colors">
              <div className="w-10 h-10 rounded-xl bg-amber-400/12 border border-amber-400/25 flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-amber-300" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300/90 mb-1.5">Deliverable</p>
              <p className="text-sm font-bold text-foreground mb-1 leading-snug">Branded Investor PDF</p>
              <p className="text-[12px] text-muted-foreground leading-snug">8-page presentation — download, email, or share via WhatsApp</p>
            </div>
          </div>

          {/* Tiny footer line — speed reassurance */}
          <p className="relative mt-6 text-center text-[11px] text-white/45 flex items-center justify-center gap-1.5">
            <Zap className="h-3 w-3 text-[#2effc0]/70" />
            Typically ready in under 10 seconds
          </p>
        </div>
      )}

      {/* ── Results ── */}
      {result && (
        <div id="analysis-results" className="space-y-4 animate-slide-up scroll-mt-24">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span
              className="w-1.5 h-5 rounded-full"
              style={{ background: 'linear-gradient(180deg, #2effc0, #2d5cff)' }}
            />
            Analysis Results
          </h2>

          {/* Investor presentation hero — Download · Email · WhatsApp.
              Sits as its own full-width row so the page reads cleanly
              from heading → deliverable → analysis cards.
              The PDF generator picks the richer Investor Presentation
              template for everyone — founder QA decision (29 Apr
              2026): one branded template across the board. Free users
              get the same layout as Adviser Pro; only the branding
              (RealSight vs adviser brand) differs inside the doc. */}
          <SendActionsBar
            generatePdf={async () => {
              const data = buildPDFData();
              if (!data) throw new Error('No analysis data yet');
              return await generateInvestorPresentationPDF(data);
            }}
            propertyName={result.propertyName}
            tenantId={agentTenantId}
            brandName={agentProfile?.agencyName || agentProfile?.name}
            tenantSlug={agentProfile?.tenantSlug}
            disabled={result.aiLoading}
          />

          {/* AI verdict card — primary hero of the result section.
              Emerald accent + glow-on-view so it announces itself when
              the user scrolls down to the verdict. */}
          <div ref={verdictRef} className="glass-panel accent-emerald glow-on-view p-5 border-l-4 border-l-primary">
            <div className="flex items-start gap-3">
              {result.aiLoading ? (
                <Loader2 className="h-5 w-5 text-primary mt-0.5 animate-spin shrink-0" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <h3 className="font-semibold text-foreground">Market Verdict</h3>
                  {result.aiLoading && <span className="text-xs text-muted-foreground">Generating AI analysis…</span>}
                </div>
                <p className={`text-base font-bold ${result.verdictColor}`}>{result.verdict}</p>
                {result.aiVerdict && (
                  <Badge variant="outline" className="mt-2 text-xs font-semibold">{result.aiVerdict}</Badge>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Based on {result.area} DLD transaction data and RealSight market indicators
                </p>
                {result.overallAssessment && (
                  <p className="text-sm text-foreground/80 mt-2 leading-relaxed">{result.overallAssessment}</p>
                )}
              </div>
            </div>
          </div>

          {/* Metrics grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Price/sqft', value: `AED ${result.pricePerSqft.toLocaleString()}`, sub: `≈ USD ${Math.round(result.pricePerSqft / 3.6725).toLocaleString()} /sqft` },
              { label: 'Area Avg',   value: `AED ${result.areaAvgPsf.toLocaleString()}`,   sub: `≈ USD ${Math.round(result.areaAvgPsf / 3.6725).toLocaleString()} /sqft` },
              { label: 'vs Market', value: `${result.diff > 0 ? '+' : ''}${result.diff}%`, sub: result.diff > 0 ? 'Above avg' : result.diff < 0 ? 'Below avg' : 'At market' },
              { label: 'Rental Yield', value: `${((result.annualRentMid / result.askingPrice) * 100).toFixed(1)}%`, sub: 'Gross annual' },
              { label: 'Demand', value: result.demand, sub: result.area },
              { label: 'Liquidity', value: result.liquidity, sub: '30d volume' },
              { label: 'Market Trend', value: result.trend, sub: '12 months' },
              { label: 'Est. IRR', value: result.irr || '—', sub: 'Yield + growth' },
            ].map(m => (
              <div key={m.label} className="glass-card p-4 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">{m.label}</p>
                <p className="text-sm font-bold text-foreground">{m.value}</p>
                <p className="text-[10px] text-muted-foreground">{m.sub}</p>
              </div>
            ))}
          </div>

          {/* Recommended strategy */}
          {result.recommendedStrategy && (
            <div className="glass-card accent-amber p-4 border-l-4 border-l-amber-500/60">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommended Strategy</p>
              </div>
              <p className="text-sm text-foreground/80">{result.recommendedStrategy}</p>
            </div>
          )}

          {/* Cash flow */}
          {result.cashFlow && (
            <div className="glass-card accent-emerald p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-emerald-400" />
                <div>
                  <p className="text-sm text-muted-foreground">Estimated Net Cash Flow</p>
                  <p className="text-lg font-bold text-emerald-400">{result.cashFlow}</p>
                </div>
              </div>
            </div>
          )}

          {/* PDF CTA if not adviser pro */}
          {!isAdviserPro && (
            <div id="pdf-upgrade-nudge" className="glass-panel accent-amber p-4 flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm font-medium text-foreground">AI Investor Presentation PDF</p>
                <p className="text-xs text-muted-foreground">8-page branded presentation to share with your clients — Adviser Pro only</p>
              </div>
              <Badge variant="outline" className="text-xs">Adviser Pro</Badge>
            </div>
          )}
        </div>
      )}

      </div>

    </div>
  );
}

export default function DealAnalyzer() {
  // Per REALSIGHT_MASTER_SPEC.md §4.4:
  // Page is accessible to all logged-in users (Explorer+).
  // Only PDF downloads are gated (Portfolio Pro / Adviser Pro).
  return <DealAnalyzerContent />;
}
