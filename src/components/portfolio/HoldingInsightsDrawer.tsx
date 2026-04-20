import { useState } from 'react';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription
} from '@/components/ui/sheet';
import { Building, TrendingUp, Users, Activity, BarChart3, MapPin, Loader2 } from 'lucide-react';
import { Holding } from '@/hooks/useInvestorData';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface HoldingInsightsDrawerProps {
    holding: Holding | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatAED = (value: number) => `AED ${value.toLocaleString()}`;

export function HoldingInsightsDrawer({ holding, open, onOpenChange }: HoldingInsightsDrawerProps) {
    const [selectedTimeframe] = useState<number>(5);

    const location = holding?.project?.location || '';
    const developer = holding?.project?.developer || '';

    // Direct area lookup — try linked ID first, then fuzzy name search
    const { data: areaData, isLoading: areaLoading } = useQuery({
        queryKey: ['holding-area', holding?.area_id, location],
        queryFn: async () => {
            // 1. Try linked area_id
            if (holding?.area_id) {
                const { data } = await supabase.from('dld_areas').select('*').eq('id', holding.area_id).single();
                if (data) return data;
            }
            // 2. Try exact name match
            if (location) {
                const { data } = await supabase.from('dld_areas').select('*').ilike('name', `%${location}%`).limit(1).single();
                if (data) return data;
            }
            // 3. Try matching first significant word from location
            if (location) {
                const words = location.split(/[\s,]+/).filter(w => w.length > 2 && !['the', 'dubai', 'al'].includes(w.toLowerCase()));
                for (const word of words) {
                    const { data } = await supabase.from('dld_areas').select('*').ilike('name', `%${word}%`).limit(1).single();
                    if (data) return data;
                }
            }
            return null;
        },
        enabled: open && !!holding,
    });

    // Direct developer lookup
    const { data: devData, isLoading: devLoading } = useQuery({
        queryKey: ['holding-dev', holding?.developer_id, developer],
        queryFn: async () => {
            if (holding?.developer_id) {
                const { data } = await supabase.from('dld_developers').select('*').eq('id', holding.developer_id).single();
                if (data) return data;
            }
            if (developer) {
                const { data } = await supabase.from('dld_developers').select('*').ilike('name', `%${developer}%`).limit(1).single();
                if (data) return data;
                // Try first word
                const firstWord = developer.split(/[\s,]+/).find(w => w.length > 2);
                if (firstWord) {
                    const { data: d2 } = await supabase.from('dld_developers').select('*').ilike('name', `%${firstWord}%`).limit(1).single();
                    if (d2) return d2;
                }
            }
            return null;
        },
        enabled: open && !!holding,
    });

    // Fetch Recent Transactions
    const { data: recentTransactions } = useQuery({
        queryKey: ['holding-tx', areaData?.id],
        queryFn: async () => {
            if (!areaData?.id) return null;
            const { data } = await supabase
                .from('dld_transactions')
                .select('*')
                .eq('area_id', areaData.id)
                .order('transaction_date', { ascending: false })
                .limit(5);
            return data;
        },
        enabled: !!areaData?.id,
    });

    // Fetch Historical Index for Chart
    const { data: historicalIndex } = useQuery({
        queryKey: ['holding-index', areaData?.id],
        queryFn: async () => {
            if (!areaData?.id) return null;
            const { data } = await supabase
                .from('area_price_index_monthly')
                .select('month, avg_price_per_sqft')
                .eq('area_id', areaData.id)
                .order('month', { ascending: true });
            return data;
        },
        enabled: !!areaData?.id,
    });

    // Generate Forecast
    const generateForecast = () => {
        if (!historicalIndex || historicalIndex.length < 6) return null;

        const lastData = historicalIndex[historicalIndex.length - 1];
        const firstData = historicalIndex[0];
        const lastPrice = lastData.avg_price_per_sqft || 0;
        const firstPrice = firstData.avg_price_per_sqft || 0;
        if (firstPrice === 0) return null;

        const years = historicalIndex.length / 12;
        const cagr = Math.pow(lastPrice / firstPrice, 1 / years) - 1;

        const scenarios = [
            { name: 'Conservative', multiplier: 0.5 },
            { name: 'Base', multiplier: 1.0 },
            { name: 'High', multiplier: 1.5 },
        ];

        let chartData = historicalIndex.map(d => ({
            month: d.month,
            historical_price: d.avg_price_per_sqft,
            base_forecast_price: null as number | null,
            cons_forecast_price: null as number | null,
            high_forecast_price: null as number | null,
        }));

        chartData[chartData.length - 1].base_forecast_price = lastPrice;
        chartData[chartData.length - 1].cons_forecast_price = lastPrice;
        chartData[chartData.length - 1].high_forecast_price = lastPrice;

        const lastDate = new Date(lastData.month);
        for (let i = 1; i <= (selectedTimeframe * 12); i++) {
            const nextDate = new Date(lastDate);
            nextDate.setMonth(lastDate.getMonth() + i);
            const tYears = i / 12;
            chartData.push({
                month: nextDate.toISOString().split('T')[0],
                historical_price: null,
                base_forecast_price: lastPrice * Math.pow(1 + (cagr * scenarios[1].multiplier), tYears),
                cons_forecast_price: lastPrice * Math.pow(1 + (cagr * scenarios[0].multiplier), tYears),
                high_forecast_price: lastPrice * Math.pow(1 + (cagr * scenarios[2].multiplier), tYears),
            });
        }

        return {
            cagr,
            scenarios: scenarios.map(s => ({
                scenario: s.name,
                projections: [1, 5].map(t => ({
                    year: t,
                    value: lastPrice * Math.pow(1 + (cagr * s.multiplier), t)
                }))
            })),
            chartData
        };
    };

    const forecast = generateForecast();
    const isLoading = areaLoading || devLoading;
    const yoy = areaData ? (((areaData.avg_price_per_sqft_current - areaData.avg_price_per_sqft_12m_ago) / areaData.avg_price_per_sqft_12m_ago) * 100) : 0;

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto border-l-white/10 bg-background/95 backdrop-blur-xl">
                <SheetHeader className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20">
                            <Building className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <SheetTitle className="text-xl font-bold text-foreground">Property Insights</SheetTitle>
                            <SheetDescription className="text-sm">
                                AI-powered market intelligence for {holding?.project?.name}
                            </SheetDescription>
                        </div>
                    </div>
                    {location && (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                            <MapPin className="h-3 w-3" /> {location}
                            {developer && <span className="ml-2">by {developer}</span>}
                        </div>
                    )}
                </SheetHeader>

                {isLoading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <div className="space-y-6 pb-10">
                        {/* Area Intelligence */}
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                                <BarChart3 className="h-4 w-4" /> Area Intelligence
                                {areaData && <span className="text-xs font-normal text-muted-foreground normal-case">— {areaData.name}</span>}
                            </h3>
                            {areaData ? (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="glass-card p-4">
                                        <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">Avg Price/Sqft</p>
                                        <p className="text-lg font-bold text-foreground">
                                            {formatAED(areaData.avg_price_per_sqft_current)}
                                        </p>
                                    </div>
                                    <div className="glass-card p-4">
                                        <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">YoY Growth</p>
                                        <p className={`text-lg font-bold ${yoy >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {yoy >= 0 ? '+' : ''}{yoy.toFixed(1)}%
                                        </p>
                                    </div>
                                    {areaData.demand_score > 0 && (
                                        <div className="glass-card p-4">
                                            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">Demand Score</p>
                                            <p className="text-lg font-bold text-primary">{areaData.demand_score}/100</p>
                                        </div>
                                    )}
                                    {areaData.rental_yield_avg > 0 && (
                                        <div className="glass-card p-4">
                                            <p className="text-[10px] text-muted-foreground mb-1 uppercase tracking-wider font-medium">Rental Yield</p>
                                            <p className="text-lg font-bold text-emerald-400">{areaData.rental_yield_avg}%</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="glass-card p-6 text-center">
                                    <p className="text-sm text-muted-foreground">No area data found for "{location}"</p>
                                </div>
                            )}
                        </section>

                        {/* Developer Snapshot */}
                        <section className="space-y-3">
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                                <Users className="h-4 w-4" /> Developer Snapshot
                                {devData && <span className="text-xs font-normal text-muted-foreground normal-case">— {devData.name}</span>}
                            </h3>
                            {devData ? (
                                <div className="glass-card p-5 space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground text-sm">Reliability Score</span>
                                        <span className="text-primary font-bold">{devData.reliability_score}/100</span>
                                    </div>
                                    <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-primary h-full rounded-full transition-all duration-1000"
                                            style={{ width: `${devData.reliability_score || 0}%` }}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Completed</p>
                                            <p className="text-sm font-semibold">{devData.total_projects_completed || 0} Projects</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase font-medium">Avg Delay</p>
                                            <p className="text-sm font-semibold">{devData.avg_delay_months || 0} Months</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="glass-card p-6 text-center">
                                    <p className="text-sm text-muted-foreground">No developer data found for "{developer}"</p>
                                </div>
                            )}
                        </section>

                        {/* AI Value Forecast Chart */}
                        {forecast && (
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                                    <TrendingUp className="h-4 w-4" /> AI Value Forecast
                                </h3>
                                <div className="glass-card p-4 h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={forecast.chartData}>
                                            <defs>
                                                <linearGradient id="colorHistory" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                            <XAxis
                                                dataKey="month"
                                                stroke="rgba(255,255,255,0.3)"
                                                fontSize={10}
                                                tickFormatter={(val) => new Date(val).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}
                                            />
                                            <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'rgba(11,17,32,0.95)',
                                                    border: '1px solid rgba(34,197,94,0.2)',
                                                    borderRadius: '10px',
                                                    backdropFilter: 'blur(12px)',
                                                    color: '#E5E7EB',
                                                    fontSize: '12px',
                                                }}
                                            />
                                            <Area type="monotone" dataKey="historical_price" stroke="#22C55E" strokeWidth={2} fillOpacity={1} fill="url(#colorHistory)" name="Historical" />
                                            <Area type="monotone" dataKey="base_forecast_price" stroke="#22C55E" strokeWidth={2} strokeDasharray="5 5" fillOpacity={0} name="Base Forecast" />
                                            <Area type="monotone" dataKey="cons_forecast_price" stroke="#ef4444" strokeWidth={1} strokeDasharray="3 3" fillOpacity={0} name="Conservative" />
                                            <Area type="monotone" dataKey="high_forecast_price" stroke="#10b981" strokeWidth={1} strokeDasharray="3 3" fillOpacity={0} name="High" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-muted-foreground italic text-center">
                                    * Forecast based on historical DLD data — does not guarantee future performance.
                                </p>

                                {/* Scenario Cards */}
                                <div className="grid grid-cols-3 gap-2">
                                    {forecast.scenarios.map(s => (
                                        <div key={s.scenario} className="glass-card p-3 border-t-2 border-t-primary/30">
                                            <p className="text-[10px] text-muted-foreground uppercase mb-2 font-medium">{s.scenario}</p>
                                            <div className="space-y-2">
                                                {s.projections.map(p => (
                                                    <div key={p.year}>
                                                        <p className="text-[9px] text-muted-foreground">{p.year}yr Est.</p>
                                                        <p className="text-xs font-bold text-foreground">{formatAED(Math.round(p.value))}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Recent Transactions */}
                        {recentTransactions && recentTransactions.length > 0 && (
                            <section className="space-y-3">
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary flex items-center gap-2">
                                    <Activity className="h-4 w-4" /> Recent Transactions
                                </h3>
                                <div className="space-y-2">
                                    {recentTransactions.map((tx, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-3 glass-card text-sm">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-foreground">{tx.property_type}</span>
                                                <span className="text-[10px] text-muted-foreground">
                                                    {new Date(tx.transaction_date).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-foreground">{formatAED(tx.price)}</p>
                                                <p className="text-[10px] text-muted-foreground">{tx.size_sqft} sqft</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
