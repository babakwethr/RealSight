import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Star, ArrowRight, Building2, MapPin, TrendingUp, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export default function MonthlyPicks() {
    const { tenant } = useTenant();

    // 1. Fetch current month's pick record
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    const { data: pickRecord, isLoading: isLoadingPick } = useQuery({
        queryKey: ['investor-monthly-pick', currentMonth, tenant?.id],
        queryFn: async () => {
            let query = supabase
                .from('monthly_picks')
                .select('*')
                .eq('month', currentMonth);

            if (tenant?.id) {
                query = query.eq('tenant_id', tenant.id);
            }

            const { data, error } = await query.maybeSingle();
            if (error) throw error;
            return data;
        },
    });

    // 2. Fetch pick items
    const { data: pickItems = [], isLoading: isLoadingItems } = useQuery({
        queryKey: ['investor-monthly-pick-items', pickRecord?.id],
        queryFn: async () => {
            if (!pickRecord?.id) return [];
            const { data, error } = await supabase
                .from('monthly_pick_items')
                .select(`
          *,
          project:project_id (*)
        `)
                .eq('pick_id', pickRecord.id)
                .order('rank', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!pickRecord?.id,
    });

    const isLoading = isLoadingPick || isLoadingItems;

    if (isLoading) {
        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-64 bg-card" />
                    <Skeleton className="h-4 w-96 bg-card" />
                </div>
                <div className="grid grid-cols-1 gap-6">
                    {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-48 w-full bg-card rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    if (!pickRecord || pickItems.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in duration-700">
                <div className="h-20 w-20 rounded-full bg-primary/5 flex items-center justify-center border border-primary/10">
                    <Star className="h-10 w-10 text-primary/20" />
                </div>
                <h2 className="text-2xl font-light text-foreground">Monthly Picks Loading...</h2>
                <p className="text-muted-foreground max-w-sm">Our curators are currently finalizing this month's top investment opportunities. Check back shortly.</p>
            </div>
        );
    }

    return (
        <div className="space-y-12 animate-in fade-in duration-1000">
            <header className="space-y-4 relative">
                <div className="flex items-center gap-3">
                    <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest">
                        {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                    </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-cinematic text-foreground tracking-tighter">
                    {pickRecord.title || "The Elite Selections"}
                </h1>
                <p className="text-lg text-muted-foreground font-light max-w-2xl leading-relaxed">
                    {pickRecord.notes || "A curated list of high-potential real estate investments selected for their unique value propositions and growth trajectory."}
                </p>

                {/* Background Accent */}
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-primary/5 rounded-full blur-[100px] -z-10" />
            </header>

            <div className="grid grid-cols-1 gap-8">
                {pickItems.map((item: any) => {
                    const project = item.project;
                    return (
                        <Link
                            key={item.id}
                            to={`/projects/${project.id}?source=internal`}
                            className="group block relative overflow-hidden rounded-3xl border border-white/5 bg-background hover:border-primary/30 transition-all duration-700 shadow-2xl"
                        >
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8">
                                {/* Ranking Emblem */}
                                <div className="absolute top-6 left-6 z-20 flex items-center justify-center h-12 w-12 rounded-2xl bg-black/60 backdrop-blur-xl border border-white/10 text-primary font-bold text-xl shadow-2xl">
                                    #{item.rank}
                                </div>

                                {/* Cover Image */}
                                <div className="lg:col-span-5 aspect-[16/10] lg:aspect-auto h-full overflow-hidden">
                                    {project.media?.cover_image ? (
                                        <img
                                            src={project.media.cover_image}
                                            alt={project.name}
                                            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-card flex items-center justify-center">
                                            <Building2 className="h-12 w-12 text-zinc-800" />
                                        </div>
                                    )}
                                    {/* Category Badge overlay on image for mobile */}
                                    <div className="absolute bottom-4 left-6 lg:hidden px-3 py-1 rounded bg-primary text-black text-[10px] font-bold uppercase tracking-widest">
                                        {project.property_category}
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-between">
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-start">
                                            <div className="space-y-1">
                                                <div className="hidden lg:inline-block px-3 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-widest mb-3">
                                                    {project.property_category}
                                                </div>
                                                <h3 className="text-3xl font-cinematic text-foreground group-hover:text-primary transition-colors duration-500">
                                                    {project.name}
                                                </h3>
                                                <p className="text-muted-foreground flex items-center gap-2 font-light">
                                                    <MapPin className="h-4 w-4 text-primary" />
                                                    {project.district}, {project.city}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Starting From</p>
                                                <p className="text-xl font-medium text-foreground">
                                                    {project.starting_price ? `AED ${Number(project.starting_price).toLocaleString()}` : "POA"}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Investment Rationale */}
                                        {(item.reason_1 || item.reason_2) && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                                {item.reason_1 && (
                                                    <div className="flex gap-3 items-start">
                                                        <TrendingUp className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                                        <p className="text-sm font-light text-zinc-300 leading-snug">{item.reason_1}</p>
                                                    </div>
                                                )}
                                                {item.reason_2 && (
                                                    <div className="flex gap-3 items-start">
                                                        <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                                                        <p className="text-sm font-light text-zinc-300 leading-snug">{item.reason_2}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-8 flex items-center justify-between">
                                        <span className="text-zinc-600 font-light text-sm italic">Developed by {project.developer}</span>
                                        <Button variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10 group-hover:translate-x-2 transition-all">
                                            Explore Opportunity <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
