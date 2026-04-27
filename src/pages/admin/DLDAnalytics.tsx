import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, TrendingUp, TrendingDown, Building2, MapPin, Activity, ShieldAlert, CheckCircle, Clock, Database } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { format } from 'date-fns';
import { SectionIntro } from '@/components/SectionIntro';

interface DLDArea {
    id: string;
    name: string;
    avg_price_per_sqft_current: number;
    avg_price_per_sqft_12m_ago: number;
    transaction_volume_30d: number;
    rental_yield_avg: number;
    demand_score: number;
    supply_pipeline_units: number;
}

interface DLDDeveloper {
    id: string;
    name: string;
    license_number: string;
    total_projects_completed: number;
    total_projects_delayed: number;
    avg_delay_months: number;
    reliability_score: number;
}

interface DLDTransaction {
    id: string;
    transaction_number: string;
    project_name: string;
    property_type: string;
    transaction_type: string;
    status: string;
    price: number;
    size_sqft: number;
    price_per_sqft: number;
    transaction_date: string;
    buyer_nationality: string;
    dld_areas: { name: string };
}

export default function AdminDLDAnalytics() {
    const [loading, setLoading] = useState(true);
    const [areas, setAreas] = useState<DLDArea[]>([]);
    const [developers, setDevelopers] = useState<DLDDeveloper[]>([]);
    const [transactions, setTransactions] = useState<DLDTransaction[]>([]);
    const [selectedArea, setSelectedArea] = useState<string>('all');

    useEffect(() => {
        fetchDLDData();
    }, [selectedArea]);

    const fetchDLDData = async () => {
        setLoading(true);
        try {
            // Fetch Areas
            const { data: areasData } = await supabase
                .from('dld_areas')
                .select('*')
                .order('demand_score', { ascending: false });

            if (areasData) setAreas(areasData);

            // Fetch Developers
            const { data: devsData } = await supabase
                .from('dld_developers')
                .select('*')
                .order('reliability_score', { ascending: true }); // Show riskiest first

            if (devsData) setDevelopers(devsData);

            // Fetch Transactions
            let txnQuery = supabase
                .from('dld_transactions')
                .select('*, dld_areas(name)')
                .order('transaction_date', { ascending: false })
                .limit(50);

            if (selectedArea !== 'all') {
                txnQuery = txnQuery.eq('area_id', selectedArea);
            }

            const { data: txnData } = await txnQuery;
            if (txnData) setTransactions(txnData);

        } catch (error) {
            console.error('Error fetching DLD data:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateYoYGrowth = (current: number, past: number) => {
        const growth = ((current - past) / past) * 100;
        return growth.toFixed(1);
    };

    if (loading && areas.length === 0) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            <AdminPageHeader
                icon={Database}
                titlePlain="DLD"
                titleGradient="Analytics"
                description="Deep analytics across Dubai Land Department transaction data."
                actions={
                    <Select value={selectedArea} onValueChange={setSelectedArea}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Filter by Area" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Areas</SelectItem>
                            {areas.map(area => (
                                <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                }
            />

            <SectionIntro
                id="dld-analytics"
                title="DLD Analytics"
                description="Monitor real-time market data directly from the Dubai Land Department. View area heatmaps, track developer reliability risk, and audit raw ledger transactions."
            />

            {/* Area Intelligence Section */}
            <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-400" />
                    Area Heatmap & Trends
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {(selectedArea === 'all' ? areas.slice(0, 4) : areas.filter(a => a.id === selectedArea)).map((area) => {
                        const yoy = calculateYoYGrowth(area.avg_price_per_sqft_current, area.avg_price_per_sqft_12m_ago);
                        const isPositive = parseFloat(yoy) > 0;
                        return (
                            <Card key={area.id} className="glass-panel border-border/50 bg-background/50">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-lg">{area.name}</CardTitle>
                                        <Badge variant={area.demand_score > 85 ? 'default' : 'secondary'} className={area.demand_score > 85 ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''}>
                                            {area.demand_score} Demand
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold font-mono">
                                        {area.avg_price_per_sqft_current} <span className="text-sm font-normal text-muted-foreground">AED/sqft</span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2 text-sm">
                                        {isPositive ? (
                                            <TrendingUp className="h-4 w-4 text-emerald-500" />
                                        ) : (
                                            <TrendingDown className="h-4 w-4 text-red-500" />
                                        )}
                                        <span className={isPositive ? "text-emerald-500" : "text-red-500"}>
                                            {isPositive ? '+' : ''}{yoy}% YoY
                                        </span>
                                    </div>
                                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm border-t border-border/50 pt-3">
                                        <div>
                                            <p className="text-muted-foreground">Vol (30d)</p>
                                            <p className="font-medium text-foreground">{area.transaction_volume_30d}</p>
                                        </div>
                                        <div>
                                            <p className="text-muted-foreground">Yield</p>
                                            <p className="font-medium text-foreground">{area.rental_yield_avg}%</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Developer Risk Analysis */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-amber-500" />
                        Developer Risk Matrix
                    </h2>
                    <Card className="glass-panel border-border/50 bg-background/50">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                                Watchlist (Lowest Reliability)
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {developers.slice(0, 5).map(dev => (
                                <div key={dev.id} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/20 border border-border/20">
                                    <div className="flex justify-between items-center">
                                        <span className="font-medium">{dev.name}</span>
                                        <Badge variant="outline" className={dev.reliability_score < 80 ? "border-amber-500/30 text-amber-500" : "border-emerald-500/30 text-emerald-500"}>
                                            Score: {dev.reliability_score}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                                        <div>
                                            <CheckCircle className="h-3 w-3 mb-1 inline text-emerald-500" /> {dev.total_projects_completed} Done
                                        </div>
                                        <div>
                                            <Clock className="h-3 w-3 mb-1 inline text-amber-500" /> {dev.total_projects_delayed} Delayed
                                        </div>
                                        <div>
                                            Avg {dev.avg_delay_months}mo lag
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Live Transactions Log */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-emerald-500" />
                        Raw Transaction Ledger
                    </h2>
                    <div className="glass-panel border-border/50 bg-background/50 rounded-xl overflow-hidden">
                        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-background/95 backdrop-blur z-10">
                                    <tr className="border-b border-border">
                                        <th className="text-left p-4 font-medium text-muted-foreground">Txn ID</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Project / Area</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Type</th>
                                        <th className="text-right p-4 font-medium text-muted-foreground">Price (AED)</th>
                                        <th className="text-right p-4 font-medium text-muted-foreground">AED/sqft</th>
                                        <th className="text-left p-4 font-medium text-muted-foreground">Buyer</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((txn) => (
                                        <tr key={txn.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                                            <td className="p-4 font-mono text-xs text-muted-foreground whitespace-nowrap">{txn.transaction_number}</td>
                                            <td className="p-4">
                                                <div className="font-medium text-foreground">{txn.project_name || '-'}</div>
                                                <div className="text-xs text-muted-foreground">{txn.dld_areas?.name}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <Badge variant="outline" className="w-fit text-xs px-2 py-0 h-5">
                                                        {txn.property_type}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">{txn.status} • {txn.transaction_type}</span>
                                                </div>
                                            </td>
                                            <td className="p-4 text-right font-medium">
                                                {new Intl.NumberFormat('en-AE', { style: 'currency', currency: 'AED', maximumFractionDigits: 0 }).format(txn.price)}
                                            </td>
                                            <td className="p-4 text-right font-mono text-muted-foreground">
                                                {txn.price_per_sqft}
                                            </td>
                                            <td className="p-4 text-muted-foreground text-xs">
                                                {txn.buyer_nationality || 'Undisclosed'}
                                                <div className="mt-1">{format(new Date(txn.transaction_date), 'MMM d, yy')}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    {transactions.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                No transactions found for this area.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
