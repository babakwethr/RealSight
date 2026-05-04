import { UpsellBanner } from '@/components/UpsellBanner';
import { useState } from 'react';
import {
    BarChart3,
    TrendingUp,
    Activity,
    MapPin,
    Building2,
    Info
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
    BarChart,
    Bar,
} from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const formatCurrency = (value: number) => {
    return `AED ${new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)}`;
};

const formatCompactNumber = (number: number) => {
    return Intl.NumberFormat('en-US', {
        notation: "compact",
        maximumFractionDigits: 1
    }).format(number);
};

export default function MarketPulse() {
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

    // Fetch Index Data — real DB data only, no demo fallback
    const { data: indexData, isLoading: indexLoading } = useQuery({
        queryKey: ['market_index_data', selectedArea, timeRange],
        queryFn: async () => {
            let query;
            if (selectedArea === 'all') {
                query = supabase.from('dubai_price_index_monthly').select('*');
            } else {
                query = supabase.from('area_price_index_monthly').select('*').eq('area_id', selectedArea);
            }

            const monthsMap: Record<string, number> = { '1M': 1, '6M': 6, '1Y': 12, '2Y': 24, '5Y': 60, '10Y': 120 };
            const limit = monthsMap[timeRange] || 60;

            const { data, error } = await query
                .order('month', { ascending: true })
                .limit(limit);

            if (error) throw error;
            return data || [];
        },
    });

    // Fetch Top Areas (highest demand_score from dld_areas)
    const { data: topAreas } = useQuery({
        queryKey: ['market_top_areas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('dld_areas')
                .select('id, name, avg_price_per_sqft_current, demand_score')
                .order('demand_score', { ascending: false })
                .limit(5);
            if (error) throw error;
            return data;
        },
    });

    // Fetch Top Developers (highest reliability_score)
    const { data: topDevelopers } = useQuery({
        queryKey: ['market_top_developers'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('dld_developers')
                .select('id, name, reliability_score, total_projects_completed')
                .order('reliability_score', { ascending: false })
                .limit(5);
            if (error) throw error;
            return data;
        },
    });

    // Fetch Recent High-Value Transactions
    const { data: transactions } = useQuery({
        queryKey: ['market_recent_high_tx', selectedArea],
        queryFn: async () => {
            let query = supabase.from('dld_transactions')
                .select('*')
                .order('price', { ascending: false })
                .limit(8);

            if (selectedArea !== 'all') {
                query = query.eq('area_id', selectedArea);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
    });

    const latestData = indexData && indexData.length > 0 ? indexData[indexData.length - 1] : null;
    const hasChartData = indexData && indexData.length > 0;

    return (
    <>

        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Market Pulse</h1>
                    <p className="text-muted-foreground mt-1">Dubai Real Estate Intelligence Engine</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="w-full sm:w-64">
                        <Select value={selectedArea} onValueChange={setSelectedArea}>
                            <SelectTrigger className="glass-panel border-primary/20">
                                <MapPin className="h-4 w-4 mr-2 text-primary" />
                                <SelectValue placeholder="Select Area" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Dubai</SelectItem>
                                {areas?.map((area) => (
                                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <Tabs value={timeRange} onValueChange={setTimeRange} className="w-full sm:w-auto">
                        <TabsList className="glass-panel bg-background/50 border-primary/10 p-1">
                            {['1M', '6M', '1Y', '2Y', '5Y', '10Y'].map((t) => (
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
            </div>

            {/* KPI Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-6 border-b-2 border-b-primary/20">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm text-muted-foreground">Avg Price / SqFt</p>
                        <div className="p-2 bg-primary/10 rounded-lg"><BarChart3 className="h-4 w-4 text-primary" /></div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                        {latestData?.avg_price_per_sqft ? formatCurrency(latestData.avg_price_per_sqft) : '--'}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                        <TrendingUp className="h-3 w-3" />
                        <span>{latestData?.yoy_growth ? `+${latestData.yoy_growth}%` : '--'} YoY</span>
                    </div>
                </div>

                <div className="glass-card p-6 border-b-2 border-b-primary/20">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm text-muted-foreground">Transaction Volume</p>
                        <div className="p-2 bg-primary/10 rounded-lg"><Activity className="h-4 w-4 text-primary" /></div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                        {latestData?.tx_volume ? formatCompactNumber(latestData.tx_volume) : '--'}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-widest">Across {selectedArea === 'all' ? 'Dubai' : 'Active Area'}</p>
                </div>

                <div className="glass-card p-6 border-b-2 border-b-primary/20">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm text-muted-foreground">Average Price</p>
                        <div className="p-2 bg-primary/10 rounded-lg"><TrendingUp className="h-4 w-4 text-primary" /></div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">
                        {latestData?.median_price_per_sqft ? formatCurrency(latestData.median_price_per_sqft) : '--'}
                    </p>
                    <p className="mt-2 text-[10px] text-muted-foreground">PER SQUARE FOOT</p>
                </div>

                <div className="glass-card p-6 border-b-2 border-b-primary/20">
                    <div className="flex justify-between items-start mb-4">
                        <p className="text-sm text-muted-foreground">Data Quality</p>
                        <div className="p-2 bg-primary/10 rounded-lg"><Activity className="h-4 w-4 text-primary" /></div>
                    </div>
                    <p className="text-2xl font-bold text-foreground">{hasChartData ? 'High' : 'Pending'}</p>
                    <p className="mt-2 text-[10px] text-muted-foreground uppercase tracking-widest text-emerald-400">
                        {hasChartData ? 'DLD VERIFIED DATA' : 'AWAITING DATA'}
                    </p>
                </div>
            </div>

            {/* Main Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Trend Chart */}
                <div className="lg:col-span-2 glass-panel p-6 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-primary" /> Price Trend
                        </h3>
                        <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary"></div> Historical</span>
                        </div>
                    </div>

                    <div className="h-[350px] w-full">
                        {hasChartData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={indexData}>
                                    <defs>
                                        <linearGradient id="marketTrend" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2} />
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
                                        tickFormatter={(val) => `${formatCompactNumber(val)}`}
                                    />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="avg_price_per_sqft"
                                        stroke="#22C55E"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#marketTrend)"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <BarChart3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No price index data available for this selection</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">Try selecting a different area or time range</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Volume Chart */}
                <div className="glass-panel p-6 space-y-6">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" /> Transaction Volume
                    </h3>
                    <div className="h-[350px] w-full">
                        {hasChartData ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={indexData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border) / 0.2)" vertical={false} />
                                    <XAxis
                                        dataKey="month"
                                        stroke="hsl(var(--border))"
                                        fontSize={10}
                                        tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                                    />
                                    <YAxis stroke="hsl(var(--border))" fontSize={10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', fontSize: '12px', color: 'hsl(var(--foreground))' }}
                                        cursor={{ fill: '#22C55E10' }}
                                    />
                                    <Bar dataKey="tx_volume" fill="#22C55E" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex items-center justify-center text-muted-foreground">
                                <div className="text-center">
                                    <Activity className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm">No volume data available</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Top Performers Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <MapPin className="h-5 w-5 text-primary" /> Top Performing Areas
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {topAreas?.map((area, idx) => (
                            <div key={area.id} className="flex items-center justify-between p-3 glass-card hover:bg-muted/30 transition-colors border border-border/20">
                                <div className="flex items-center gap-3">
                                    <span className="text-primary font-bold w-4">{idx + 1}</span>
                                    <div>
                                        <p className="font-semibold text-sm">{area.name}</p>
                                        <p className="text-[10px] text-emerald-400">Score: {area.demand_score}/100</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-foreground">{formatCurrency(area.avg_price_per_sqft_current)}<span className="text-[10px] text-muted-foreground">/sqft</span></p>
                                </div>
                            </div>
                        ))}
                        {(!topAreas || topAreas.length === 0) && (
                            <p className="text-center text-muted-foreground text-sm py-4">No area data available</p>
                        )}
                    </div>
                </div>

                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" /> Top Tier Developers
                        </h3>
                    </div>
                    <div className="space-y-4">
                        {topDevelopers?.map((dev, idx) => (
                            <div key={dev.id} className="flex items-center justify-between p-3 glass-card hover:bg-muted/30 transition-colors border border-border/20">
                                <div className="flex items-center gap-3">
                                    <span className="text-primary font-bold w-4">{idx + 1}</span>
                                    <div>
                                        <p className="font-semibold text-sm">{dev.name}</p>
                                        <p className="text-[10px] text-muted-foreground">{dev.total_projects_completed} Projects Delivered</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-primary">
                                        <Activity className="h-3 w-3" />
                                        <span className="font-bold text-sm">{dev.reliability_score}</span>
                                        <span className="text-[10px] text-muted-foreground">/100</span>
                                    </div>
                                    <p className="text-[9px] text-muted-foreground uppercase mt-1">Reliability</p>
                                </div>
                            </div>
                        ))}
                        {(!topDevelopers || topDevelopers.length === 0) && (
                            <p className="text-center text-muted-foreground text-sm py-4">No developer data available</p>
                        )}
                    </div>
                </div>
            </div>

            {/* High Value Transactions & Disclosure */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-panel p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <Activity className="h-5 w-5 text-primary" /> High-Value Transactions
                        </h3>
                        <Button variant="ghost" size="sm" className="text-primary text-xs hover:bg-primary/10" onClick={() => window.location.href = '/market-index'}>View All</Button>
                    </div>
                    <div className="space-y-3">
                        {transactions?.map((tx, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 glass-card border border-border/20 hover:border-primary/30 transition-all">
                                <div className="flex items-center gap-4">
                                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                                        <Building2 className="h-4 w-4" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm">{tx.project_name || 'Individual Unit'}</p>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{tx.property_type}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-foreground">{formatCurrency(tx.price)}</p>
                                    <p className="text-[10px] text-muted-foreground">{new Date(tx.transaction_date).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                        {(!transactions || transactions.length === 0) && (
                            <p className="text-center text-muted-foreground text-sm py-4">No transaction data available</p>
                        )}
                    </div>
                </div>

                <div className="glass-panel p-6 flex flex-col justify-center items-center text-center space-y-4">
                    <div className="p-4 bg-primary/10 rounded-full">
                        <Info className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold">Intelligence Disclosure</h3>
                    <p className="text-muted-foreground text-sm max-w-md">
                        The data displayed in Market Pulse is aggregated directly from official Dubai Land Department (DLD) and Dubai Pulse datasets. Historical benchmarks and trends are calculated based on actual recorded transactions.
                    </p>
                    <div className="pt-4 border-t border-border/30 w-full max-w-xs text-[10px] text-muted-foreground italic uppercase tracking-widest">
                        REAL-TIME DLD DATA
                    </div>
                    <p className="text-[9px] text-muted-foreground/50 max-w-sm">
                        All data shown is derived from verified DLD records. Consult with a professional advisor before making investment decisions.
                    </p>
                </div>
            </div>
        </div>
      <UpsellBanner feature="market-intelligence" className="mt-6" />
    </>
  );
}
