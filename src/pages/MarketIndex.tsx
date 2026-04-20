import { useState } from 'react';
import {
    TrendingUp,
    MapPin,
    Calendar,
    Info,
    Layers,
    Activity,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FeatureGate } from '@/components/FeatureGate';
import { UpsellBanner } from '@/components/UpsellBanner';

const formatCompactNumber = (number: number) => {
    return Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(number);
};

function MarketIndexContent() {
    const [selectedArea, setSelectedArea] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<string>('1Y');

    // Fetch Areas
    const { data: areas } = useQuery({
        queryKey: ['dld_areas_list'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('dld_areas')
                .select('id, name')
                .order('name');
            if (error) throw error;
            return data;
        },
    });

    // Fetch Monthly Data and Compute Index
    const { data: rawData, isLoading: seriesLoading } = useQuery({
        queryKey: ['market_index_data_raw', selectedArea],
        queryFn: async () => {
            let query;
            if (selectedArea === 'all') {
                query = supabase.from('dubai_price_index_monthly').select('*');
            } else {
                query = supabase.from('area_price_index_monthly').select('*').eq('area_id', selectedArea);
            }

            const { data, error } = await query.order('month', { ascending: true });
            if (error) throw error;

            return data || [];
        },
    });

    // Compute Base 100 Index
    const seriesData = (() => {
        if (!rawData || rawData.length === 0) return [];

        // Find the earliest month to use as Base 100
        const basePrice = rawData[0].avg_price_per_sqft || 1;

        return rawData.map(d => {
            const currentPrice = d.avg_price_per_sqft || 0;
            const indexValue = (currentPrice / basePrice) * 100;
            return {
                ...d,
                index_value: indexValue.toFixed(2)
            };
        });
    })();

    // Filter by TimeRange for the chart
    const filteredSeriesData = (() => {
        if (!seriesData || seriesData.length === 0) return [];
        if (timeRange === 'MAX') return seriesData;

        const monthsToKeep = {
            '1M': 1,
            '6M': 6,
            '1Y': 12,
            '2Y': 24,
            '5Y': 60,
            '10Y': 120
        }[timeRange] || 12;

        return seriesData.slice(-monthsToKeep);
    })();

    const latestData = seriesData && seriesData.length > 0 ? seriesData[seriesData.length - 1] : null;
    const previousData = seriesData && seriesData.length > 1 ? seriesData[seriesData.length - 2] : null;

    const indexChange = latestData && previousData
        ? ((Number(latestData.index_value) - Number(previousData.index_value)) / Number(previousData.index_value)) * 100
        : 0;


    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Dubai Market Index</h1>
                    <p className="text-muted-foreground mt-1 text-sm flex items-center gap-2">
                        <Layers className="h-4 w-4 text-primary" /> Normalized market performance tracking (Base 100)
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-64">
                        <Select value={selectedArea} onValueChange={setSelectedArea}>
                            <SelectTrigger className="glass-panel border-primary/20">
                                <MapPin className="h-4 w-4 mr-2 text-primary" />
                                <SelectValue placeholder="Select Area" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dubai (Global Index)</SelectItem>
                                {areas?.map((area) => (
                                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Main Index Card */}
            <div className="glass-panel p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                    <TrendingUp className="h-32 w-32 text-primary" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center">
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground uppercase tracking-widest font-medium">Current Index Value</p>
                        <div className="flex items-baseline gap-3">
                            <span className="text-6xl font-black text-foreground">{latestData?.index_value || '--'}</span>
                            <div className={`flex items-center gap-1 text-lg font-bold ${indexChange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {indexChange >= 0 ? <ArrowUpRight className="h-5 w-5" /> : <ArrowDownRight className="h-5 w-5" />}
                                {Math.abs(indexChange).toFixed(2)}%
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">Market benchmark initialized at 100 (Jan 2015)</p>
                    </div>

                    <div className="hidden md:block border-l border-white/10 h-20"></div>

                    <div className="grid grid-cols-2 gap-8">
                        <div>
                            <p className="text-xs text-muted-foreground mb-1 uppercase">Annual Growth</p>
                            <p className="text-xl font-bold text-emerald-400">+{latestData?.yoy_growth || 0}%</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-1 uppercase">Monthly Vol.</p>
                            <p className="text-xl font-bold text-foreground">{latestData?.tx_volume ? formatCompactNumber(Number(latestData.tx_volume)) : '--'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Index Chart */}
            <div className="glass-panel p-6 space-y-6 bg-gradient-to-br from-background via-background to-primary/5">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" /> Market Trajectory
                    </h3>
                    <Tabs value={timeRange} onValueChange={setTimeRange} className="w-auto">
                        <TabsList className="bg-muted/30 border border-border/30 p-1">
                            {['1M', '6M', '1Y', '2Y', '5Y', '10Y', 'MAX'].map((t) => (
                                <TabsTrigger
                                    key={t}
                                    value={t}
                                    className="px-3 py-1 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                                >
                                    {t}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>

                <div className="h-[450px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={filteredSeriesData || []}>
                            <defs>
                                <linearGradient id="indexGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" vertical={false} />
                            <XAxis
                                dataKey="month"
                                stroke="hsl(var(--border))"
                                fontSize={10}
                                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                            />
                            <YAxis
                                stroke="hsl(var(--border))"
                                fontSize={10}
                                domain={['auto', 'auto']}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                                formatter={(value: any) => [value, 'Index Value']}
                            />
                            <Area
                                type="monotone"
                                dataKey="index_value"
                                stroke="#22C55E"
                                strokeWidth={3}
                                fillOpacity={1}
                                fill="url(#indexGradient)"
                                animationDuration={1500}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Footer Info */}
            <div className="glass-panel p-6 flex items-start gap-4">
                <div className="p-3 bg-primary/10 rounded-xl">
                    <Info className="h-6 w-6 text-primary" />
                </div>
                <div className="space-y-2">
                    <h4 className="font-bold text-foreground uppercase tracking-tight">Understanding the Index</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm text-muted-foreground leading-relaxed">
                        <p>
                            The Dubai Market Index provides a normalized view of property value movements. By setting a base value of 100, we can easily track percentage changes across different areas regardless of their absolute price levels. This allows for a "stock-market style" comparison of Dubai real estate.
                        </p>
                        <p>
                            All index calculations are derived from historical DLD transaction data. It represents the weighted average price per square foot normalized against the base period. YoY growth is calculated by comparing the current index value to the value recorded 12 months prior.
                        </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground/50 pt-4 border-t border-border/20 italic">
                        DISCLAIMER: This index is a mathematical representation of historical market data and provided for informational purposes only. Past performance is not indicative of future results. AI-generated market estimates are not financial advice.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function MarketIndex() {
  return (
    <>
      <FeatureGate feature="market-index" blur>
        <MarketIndexContent />
      </FeatureGate>
      <UpsellBanner feature="opportunity-signals" className="mt-6" />
    </>
  );
}
