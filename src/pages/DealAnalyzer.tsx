import { useState, useRef, useEffect } from 'react';
import { BackButton } from '@/components/BackButton';
import {
  Search, Link as LinkIcon, BarChart3, TrendingUp, CheckCircle2,
  Loader2, FileText, Presentation, Download, ChevronDown, Building2, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FeatureGate } from '@/components/FeatureGate';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
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
    // Fallback if AI unavailable
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
  // AI fields (filled after AI call)
  aiVerdict?: DealAnalyzerPDFData['investmentVerdict'];
  strengths?: string[];
  weaknesses?: string[];
  overallAssessment?: string;
  recommendedStrategy?: string;
  aiAdvice?: string;
  aiLoading?: boolean;
}

function DealAnalyzerContent() {
  const { isAdviser, isAdviserPro, isPro, hasFeature } = useSubscription();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'url' | 'form'>('form');
  const [listingUrl, setListingUrl] = useState('');
  const [urlSearchText, setUrlSearchText] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [pdfLoading, setPdfLoading] = useState<'deal' | 'presentation' | null>(null);

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

  // Fetch agent profile for PDF
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

  const detectPlatform = (url: string) => {
    if (url.includes('propertyfinder')) return 'Property Finder';
    if (url.includes('bayut')) return 'Bayut';
    if (url.includes('dubizzle')) return 'Dubizzle';
    return null;
  };

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

    let calculatedYield = rent ? (rent / price) * 100 : yieldAvg;
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

    // Generate AI verdict in background
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
    if (data.aiLoading) { toast.info('Please wait for AI analysis to complete.'); return; }
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
    } catch (e) {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(null);
    }
  };

  const handleDownloadPresentation = async () => {
    const data = buildPDFData();
    if (!data) return;
    if (data.aiLoading) { toast.info('Please wait for AI analysis to complete.'); return; }
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
    } catch (e) {
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setPdfLoading(null);
    }
  };

  const platform = detectPlatform(listingUrl);

  return (
    <div className="space-y-6 animate-fade-in">
      <BackButton />
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Search className="h-6 w-6 text-primary" />
          Deal Analyzer
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Analyze any property against real DLD market data and generate a professional PDF report
        </p>
      </div>

      {/* Entry mode tabs */}
      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as 'url' | 'form')} className="w-full">
        <TabsList className="grid w-full max-w-sm grid-cols-2 bg-muted/30">
          <TabsTrigger value="form" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" />
            Enter Details
          </TabsTrigger>
          <TabsTrigger value="url" className="gap-1.5">
            <LinkIcon className="h-3.5 w-3.5" />
            Paste URL
          </TabsTrigger>
        </TabsList>

        {/* URL tab */}
        <TabsContent value="url" className="mt-4">
          <div className="glass-panel p-6">
            <h3 className="font-semibold text-foreground mb-1">Paste a Listing URL</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Paste a Bayut, Property Finder, or Dubizzle link — then fill in the property details below.
            </p>
            <div className="flex gap-3 mb-4">
              <div className="flex-1 relative">
                <Input
                  value={listingUrl}
                  onChange={e => setListingUrl(e.target.value)}
                  placeholder="https://bayut.com/property/..."
                  className="glass-input pr-28"
                />
                {platform && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                    {platform}
                  </span>
                )}
              </div>
              <Button
                onClick={() => setActiveTab('form')}
                disabled={!listingUrl}
                className="bg-primary text-primary-foreground rounded-lg shrink-0"
              >
                Fill Details →
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              After pasting, switch to "Enter Details" and fill in the property info from the listing.
            </p>
          </div>
        </TabsContent>

        {/* Form tab */}
        <TabsContent value="form" className="mt-4">
          <div className="glass-panel p-6">
            <h3 className="font-semibold text-foreground mb-1">Property Details</h3>
            <p className="text-xs text-muted-foreground mb-5">
              Fill in the property details. As you type the area, we'll match it to DLD market data automatically.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {/* Property name */}
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-xs text-muted-foreground">Property / Development Name</Label>
                <Input
                  value={propertyName}
                  onChange={e => setPropertyName(e.target.value)}
                  placeholder="e.g. Luma 22, Creek Rise Tower 1..."
                  className="glass-input"
                />
              </div>

              {/* Area search with autocomplete */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Area * <span className="text-primary">(searches DLD database)</span></Label>
                <DLDSearchInput
                  value={areaSearch}
                  onChange={v => { setAreaSearch(v); if (v !== selectedArea) setSelectedArea(''); }}
                  onSelect={name => setSelectedArea(name)}
                  areas={dldAreas || []}
                  placeholder="Type area name, e.g. JVC..."
                />
                {selectedArea && (
                  <p className="text-[10px] text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Matched to DLD data: {selectedArea}
                  </p>
                )}
              </div>

              {/* Property type */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Property Type</Label>
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
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Bedrooms</Label>
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
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Floor / Level</Label>
                <Input
                  value={manualFloor}
                  onChange={e => setManualFloor(e.target.value)}
                  placeholder="e.g. 8, Ground, Penthouse..."
                  className="glass-input"
                />
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Asking Price (AED) *</Label>
                <Input
                  type="number"
                  value={manualPrice}
                  onChange={e => setManualPrice(e.target.value)}
                  placeholder="2,100,000"
                  className="glass-input"
                />
              </div>

              {/* Size */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Size (sq ft) *</Label>
                <Input
                  type="number"
                  value={manualSize}
                  onChange={e => setManualSize(e.target.value)}
                  placeholder="1,200"
                  className="glass-input"
                />
              </div>

              {/* Annual rent */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Expected Annual Rent (AED)</Label>
                <Input
                  type="number"
                  value={manualRent}
                  onChange={e => setManualRent(e.target.value)}
                  placeholder="120,000"
                  className="glass-input"
                />
              </div>

              {/* Service charge */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Service Charge (AED/sqft/yr)</Label>
                <Input
                  type="number"
                  value={manualServiceCharge}
                  onChange={e => setManualServiceCharge(e.target.value)}
                  placeholder="25"
                  className="glass-input"
                />
              </div>
            </div>

            <Button
              onClick={handleAnalyze}
              disabled={analyzing || !manualPrice || !manualSize || (!selectedArea && !areaSearch)}
              className="mt-5 bg-primary text-primary-foreground rounded-lg"
            >
              {analyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <BarChart3 className="h-4 w-4 mr-2" />}
              Analyze Deal
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Results ── */}
      {result && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Analysis Results</h2>
            {/* Download buttons — gated per REALSIGHT_MASTER_SPEC.md §4.4 */}
            <div className="flex items-center gap-2">
              {/* Deal Report PDF — Portfolio Pro+ */}
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
              {/* AI Investor Presentation PDF — Adviser Pro only */}
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
                <div className="flex items-center gap-2 mb-1">
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
              // Per LAUNCH_PLAN.md §17 — per-sqft prices show USD equivalent in the
              // tile sub-label so non-UAE investors see the global anchor instantly.
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
            <div className="glass-panel p-4 flex items-center justify-between">
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
