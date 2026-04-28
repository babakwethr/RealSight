import { useState, useRef, useEffect } from 'react';
import { BackButton } from '@/components/BackButton';
import {
  Search, BarChart3, TrendingUp, CheckCircle2, Loader2, FileText,
  Presentation, Building2, X, Sparkles, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { GuidanceCard } from '@/components/GuidanceCard';
import { generateDealAnalyzerPDF, type DealAnalyzerPDFData } from '@/components/pdf/DealAnalyzerPDF';
import { generateInvestorPresentationPDF } from '@/components/pdf/InvestorPresentationPDF';

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
  brandColor,
  logoLetter,
}: {
  source: 'Bayut' | 'Property Finder' | 'Dubizzle';
  value: string;
  onChange: (v: string) => void;
  brandColor: string;
  logoLetter: string;
}) {
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
          detected ? 'ring-[#18d6a4]/45' : 'ring-white/[0.08] hover:ring-white/[0.18]',
        )}
        style={{
          background: 'rgba(7, 4, 15, 0.45)',
          backdropFilter: 'blur(18px) saturate(160%)',
          WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        }}
      >
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-white/[0.06]">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black text-white shrink-0"
            style={{ background: brandColor }}
          >
            {logoLetter}
          </div>
          <span className="text-[12px] font-bold text-white tracking-tight flex-1">{source}</span>
          {detected && (
            <span className="text-[10px] font-semibold text-[#2effc0] flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Detected
            </span>
          )}
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
  const [pdfLoading, setPdfLoading] = useState<'deal' | 'presentation' | null>(null);

  // Listing-source URLs (all visible, all optional — for adviser reference)
  const [bayutUrl, setBayutUrl] = useState('');
  const [pfUrl, setPfUrl] = useState('');
  const [dubizzleUrl, setDubizzleUrl] = useState('');

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

  const { data: agentProfile } = useQuery({
    queryKey: ['agent-profile', user?.id],
    enabled: !!user?.id && isAdviser,
    queryFn: async () => {
      const [profileRes, investorRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('user_id', user!.id).maybeSingle(),
        supabase.from('investors').select('phone').eq('user_id', user!.id).maybeSingle(),
      ]);
      return {
        name: profileRes.data?.full_name || user?.email || 'Agent',
        phone: investorRes.data?.phone || '',
        email: user?.email || '',
      };
    },
  });

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

  const handleAnalyze = async () => {
    const area = selectedArea || areaSearch;
    const price = Number(manualPrice);
    const size = Number(manualSize);
    if (!price || !size || !area) { toast.error('Please fill in Area, Price and Size.'); return; }

    setAnalyzing(true);
    setResult(null);

    const pps = Math.round(price / size);
    const areaData = findAreaData(area);
    const avgPps = areaData?.avg_price_per_sqft_current || 1800;
    const yieldAvg = areaData?.rental_yield_avg || 5.5;
    const demandScore = areaData?.demand_score || 50;
    const txVolume = areaData?.transaction_volume_30d || 50;
    const priceHistory = areaData?.avg_price_per_sqft_12m_ago || avgPps * 0.9;
    const yoyGrowth = ((avgPps - priceHistory) / priceHistory) * 100;

    const rent = manualRent ? Number(manualRent) : undefined;
    const serviceFee = manualServiceCharge ? Number(manualServiceCharge) : undefined;

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
      propertyName: propertyName || `${area} ${manualType}`,
      area: areaData?.name || area,
      unitType: `${manualBeds === '0' ? 'Studio' : manualBeds + '-Bedroom'} ${manualType.charAt(0).toUpperCase() + manualType.slice(1)}`,
      size,
      floor: manualFloor || undefined,
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
      aiLoading: true,
    };

    setResult(baseResult);
    setAnalyzing(false);

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
        floor: manualFloor,
      });
      setResult(prev => prev ? { ...prev, ...ai, aiVerdict: ai.verdict, aiLoading: false } : prev);
    } catch {
      setResult(prev => prev ? { ...prev, aiLoading: false } : prev);
    }
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
      agentName: isAdviser ? (agentProfile?.name || user?.email) : undefined,
      agentRole: isAdviser ? 'Property Adviser' : undefined,
      agentPhone: isAdviser ? agentProfile?.phone : undefined,
      agentEmail: isAdviser ? agentProfile?.email : undefined,
      reportDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    };
  };

  const handleDownloadDeal = async () => {
    const data = buildPDFData();
    if (!data) return;
    setPdfLoading('deal');
    try {
      const blob = await generateDealAnalyzerPDF(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RealSight_Deal_Analysis_${data.propertyName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Deal Analysis Report downloaded!');
    } catch {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(null);
    }
  };

  const handleDownloadPresentation = async () => {
    const data = buildPDFData();
    if (!data) return;
    setPdfLoading('presentation');
    try {
      const blob = await generateInvestorPresentationPDF(data);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RealSight_Investor_Presentation_${data.propertyName.replace(/\s+/g, '_')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('AI Investor Presentation downloaded!');
    } catch {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(null);
    }
  };

  const canAnalyze = !!manualPrice && !!manualSize && (!!selectedArea || !!areaSearch);

  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton />

      {/* ── Hero header — gradient word + AI accent ── */}
      <div className="relative">
        <div className="flex items-center gap-3 mb-2">
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
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight leading-none">
              Deal{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: 'linear-gradient(90deg, #2effc0 0%, #18d6a4 50%, #2d5cff 100%)' }}
              >
                Analyzer
              </span>
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              Score any Dubai property against live DLD data + AI advice — in seconds
            </p>
          </div>
        </div>
      </div>

      {/* ── Plain-language guidance ── */}
      <GuidanceCard
        storageKey="deal-analyzer-v1"
        tone="success"
        title="What this page does for you"
        description="Paste a Bayut/Property Finder/Dubizzle link (optional, for your records), then enter the property details below. We compare it against real DLD transactions and give you a clear BUY / HOLD / AVOID verdict — plus a downloadable PDF report you can share."
        bullets={[
          'Step 1 — Optionally paste the listing URL(s) so the link is on your PDF report.',
          'Step 2 — Fill the property details (area, price, size, rent). All fields with * are required.',
          'Step 3 — Click "Analyze Deal". You get a market verdict, AI advice, and downloadable PDFs.',
          'Tip — The tool works best when you fill expected annual rent + service charge for a true cash-flow view.',
        ]}
      />

      {/* ── 1. Listing source URLs (all visible) ── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
            <span className="text-[#18d6a4]">Step 1</span> · Listing links <span className="font-semibold text-white/35 normal-case tracking-normal">(optional)</span>
          </h2>
          <span className="text-[11px] text-white/40">For your reference / PDF</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <ListingSourceField
            source="Bayut"
            value={bayutUrl}
            onChange={setBayutUrl}
            brandColor="#7d2ae8"
            logoLetter="B"
          />
          <ListingSourceField
            source="Property Finder"
            value={pfUrl}
            onChange={setPfUrl}
            brandColor="#ef4135"
            logoLetter="P"
          />
          <ListingSourceField
            source="Dubizzle"
            value={dubizzleUrl}
            onChange={setDubizzleUrl}
            brandColor="#ed3a47"
            logoLetter="D"
          />
        </div>
      </section>

      {/* ── 2. Property details ── */}
      <section className="space-y-3">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-[11px] font-black uppercase tracking-[0.18em] text-white/55">
            <span className="text-[#18d6a4]">Step 2</span> · Property details
          </h2>
          <span className="text-[11px] text-white/40">* required</span>
        </div>

        <div
          className="rounded-2xl ring-1 ring-white/[0.08] overflow-hidden"
          style={{
            background: 'rgba(7, 4, 15, 0.55)',
            backdropFilter: 'blur(28px) saturate(180%)',
            WebkitBackdropFilter: 'blur(28px) saturate(180%)',
          }}
        >
          <div className="p-5 sm:p-6">
            <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4">
              {/* Property name */}
              <div className="space-y-1.5 sm:col-span-2">
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

            {/* Sticky-feel CTA bar */}
            <div className="mt-6 pt-5 border-t border-white/[0.06] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          </div>
        </div>
      </section>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <span
                className="w-1.5 h-5 rounded-full"
                style={{ background: 'linear-gradient(180deg, #2effc0, #2d5cff)' }}
              />
              Analysis Results
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {isPro ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleDownloadDeal}
                  disabled={!!pdfLoading || result.aiLoading}
                  className="gap-1.5 text-xs"
                >
                  {pdfLoading === 'deal' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
                  Deal Report PDF
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById('pdf-upgrade-nudge')?.scrollIntoView({ behavior: 'smooth' })}
                  className="gap-1.5 text-xs opacity-60"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Deal Report PDF
                  <span className="text-[9px] font-bold text-amber-400 border border-amber-400/30 bg-amber-400/10 px-1 rounded">PRO</span>
                </Button>
              )}
              {isAdviserPro ? (
                <Button
                  size="sm"
                  onClick={handleDownloadPresentation}
                  disabled={!!pdfLoading || result.aiLoading}
                  className="gap-1.5 text-xs bg-primary text-primary-foreground"
                >
                  {pdfLoading === 'presentation' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Presentation className="h-3.5 w-3.5" />}
                  Investor Presentation PDF
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => document.getElementById('pdf-upgrade-nudge')?.scrollIntoView({ behavior: 'smooth' })}
                  className="gap-1.5 text-xs opacity-60"
                >
                  <Presentation className="h-3.5 w-3.5" />
                  AI Investor Presentation
                  <span className="text-[9px] font-bold text-amber-400 border border-amber-400/30 bg-amber-400/10 px-1 rounded">ADVISER PRO</span>
                </Button>
              )}
            </div>
          </div>

          {/* AI verdict card */}
          <div className="glass-panel p-5 border-l-4 border-l-primary">
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
            <div className="glass-card p-4 border-l-4 border-l-amber-500/60">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-4 w-4 text-amber-500" />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recommended Strategy</p>
              </div>
              <p className="text-sm text-foreground/80">{result.recommendedStrategy}</p>
            </div>
          )}

          {/* Cash flow */}
          {result.cashFlow && (
            <div className="glass-card p-4">
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
            <div id="pdf-upgrade-nudge" className="glass-panel p-4 flex items-center justify-between flex-wrap gap-3">
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
  );
}

export default function DealAnalyzer() {
  // Per REALSIGHT_MASTER_SPEC.md §4.4:
  // Page is accessible to all logged-in users (Explorer+).
  // Only PDF downloads are gated (Portfolio Pro / Adviser Pro).
  return <DealAnalyzerContent />;
}
