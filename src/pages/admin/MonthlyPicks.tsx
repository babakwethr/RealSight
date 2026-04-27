import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Search, Plus, Trash2, Loader2, Star, Save, Building2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { SectionIntro } from '@/components/SectionIntro';

export default function AdminMonthlyPicks() {
    const { session } = useAuth();
    const { tenant } = useTenant();
    const queryClient = useQueryClient();
    const [currentMonth, setCurrentMonth] = useState(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    });
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch the Monthly Pick record for currentMonth
    const { data: pickRecord, isLoading: isLoadingPick } = useQuery({
        queryKey: ['admin-monthly-pick', currentMonth, tenant?.id],
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

    // 2. Fetch the pick items for this record
    const { data: pickItems = [], isLoading: isLoadingItems } = useQuery({
        queryKey: ['admin-monthly-pick-items', pickRecord?.id],
        queryFn: async () => {
            if (!pickRecord?.id) return [];
            const { data, error } = await supabase
                .from('monthly_pick_items')
                .select(`
                    *,
                    custom_projects:project_id (*)
                `)
                .eq('pick_id', pickRecord.id)
                .order('rank', { ascending: true });
            if (error) throw error;
            return data;
        },
        enabled: !!pickRecord?.id,
    });

    // 3. Fetch internal projects (to search through)
    const { data: internalProjects = [] } = useQuery({
        queryKey: ['admin-internal-projects-search', tenant?.id],
        queryFn: async () => {
            let query = (supabase.from('custom_projects' as any) as any).select('*');
            if (tenant?.id) query = query.eq('tenant_id', tenant.id);
            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        }
    });

    // Mutations
    const createPickMutation = useMutation({
        mutationFn: async (vars: { title: string, notes: string }) => {
            const { data, error } = await supabase
                .from('monthly_picks')
                .insert({
                    month: currentMonth,
                    title: vars.title,
                    notes: vars.notes,
                    created_by: session?.user.id,
                    tenant_id: tenant?.id
                })
                .select()
                .single();
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            toast.success('Pick list created!');
            queryClient.invalidateQueries({ queryKey: ['admin-monthly-pick'] });
        },
        onError: (err: any) => toast.error(err.message)
    });

    const updatePickMutation = useMutation({
        mutationFn: async (vars: { id: string, title?: string, notes?: string }) => {
            const { error } = await supabase
                .from('monthly_picks')
                .update({
                    title: vars.title,
                    notes: vars.notes,
                    updated_at: new Date().toISOString()
                })
                .eq('id', vars.id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Saved.');
            queryClient.invalidateQueries({ queryKey: ['admin-monthly-pick'] });
        }
    });

    const addItemMutation = useMutation({
        mutationFn: async (vars: { pick_id: string, project_id: string }) => {
            const rank = pickItems.length + 1;
            const { error } = await supabase
                .from('monthly_pick_items')
                .insert({
                    pick_id: vars.pick_id,
                    project_id: vars.project_id,
                    project_source: 'custom',
                    rank
                });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Project added to top picks');
            queryClient.invalidateQueries({ queryKey: ['admin-monthly-pick-items'] });
        },
        onError: (err: any) => toast.error(err.message)
    });

    const updateItemMutation = useMutation({
        mutationFn: async (vars: { id: string, reason_1?: string, reason_2?: string, rank?: number }) => {
            const { error } = await supabase
                .from('monthly_pick_items')
                .update(vars)
                .eq('id', vars.id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-monthly-pick-items'] });
        }
    });

    const removeItemMutation = useMutation({
        mutationFn: async (itemId: string) => {
            const { error } = await supabase
                .from('monthly_pick_items')
                .delete()
                .eq('id', itemId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Project removed');
            queryClient.invalidateQueries({ queryKey: ['admin-monthly-pick-items'] });
        },
        onError: (err: any) => toast.error(err.message)
    });

    // Local state for edits
    const [editTitle, setEditTitle] = useState('');
    const [editNotes, setEditNotes] = useState('');

    // Sync local state when record loads
    if (pickRecord && editTitle === '' && !isLoadingPick) {
        if (pickRecord.title) setEditTitle(pickRecord.title);
        if (pickRecord.notes) setEditNotes(pickRecord.notes);
    }

    const handleSaveList = () => {
        if (pickRecord) {
            updatePickMutation.mutate({ id: pickRecord.id, title: editTitle, notes: editNotes });
        } else {
            createPickMutation.mutate({ title: editTitle || `Top Picks for ${currentMonth}`, notes: editNotes });
        }
    };

    const searchedProjects = internalProjects.filter(p =>
        (p as any).name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p as any).developer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const isFull = pickItems.length >= 10;

    return (
        <div className="py-8 px-4 sm:px-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-light text-foreground flex items-center gap-3">
                    <Star className="h-8 w-8 text-primary animate-pulse" />
                    Top Picks
                </h1>
                <div className="flex items-center gap-4 bg-background p-2 rounded-xl border border-white/10">
                    <label className="text-xs uppercase tracking-widest font-bold text-zinc-500 ml-2">Period</label>
                    <Input
                        type="month"
                        value={currentMonth}
                        onChange={e => {
                            setCurrentMonth(e.target.value);
                            setEditTitle('');
                            setEditNotes('');
                        }}
                        className="w-40 bg-card border-none h-9 text-sm focus-visible:ring-1 focus-visible:ring-primary"
                    />
                </div>
            </div>

            <SectionIntro
                id="top-picks"
                title="Top Picks & Curated Lists"
                description="Curate a custom list of 10 must-see projects for your investors each month. Use the internal inventory to add projects, and provide two main rationale points for each."
            />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Pick Details & Added Items */}
                <div className="lg:col-span-2 space-y-8">
                    <Card className="bg-background border-white/10 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-xl font-light text-primary font-cinematic uppercase tracking-widest">List Essence</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-zinc-400">Campaign Title</Label>
                                <Input
                                    placeholder={`e.g. Realsight Curated - ${currentMonth}`}
                                    value={editTitle}
                                    onChange={e => setEditTitle(e.target.value)}
                                    className="glass-input"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-zinc-400">Curator's Vision (Main Notes)</Label>
                                <Textarea
                                    placeholder="Explain the market trend and why these projects stand out this month..."
                                    value={editNotes}
                                    onChange={e => setEditNotes(e.target.value)}
                                    className="glass-input min-h-[100px]"
                                />
                            </div>
                            <Button onClick={handleSaveList} disabled={createPickMutation.isPending || updatePickMutation.isPending} className="bg-primary hover:bg-accent-green-dark text-black font-semibold shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                {createPickMutation.isPending || updatePickMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Top Picks
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="space-y-4">
                        <h3 className="text-xl font-light text-foreground flex items-center gap-2">
                            The Ranked Decade <span className="text-zinc-600 font-mono text-sm">[{pickItems.length}/10]</span>
                        </h3>

                        {!pickRecord ? (
                            <div className="text-center py-20 bg-background/50 border border-dashed border-white/10 rounded-2xl italic text-muted-foreground">
                                Please initialize the list details above to start ranking projects.
                            </div>
                        ) : isLoadingItems ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                            </div>
                        ) : pickItems.length === 0 ? (
                            <div className="text-center py-20 bg-background/50 border border-dashed border-white/10 rounded-2xl italic text-muted-foreground">
                                No projects ranked yet. Select from your inventory on the right.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {pickItems.map((item: any, index: number) => (
                                    <div key={item.id} className="group relative grid grid-cols-1 md:grid-cols-12 gap-6 p-6 rounded-2xl border border-white/10 bg-background hover:border-primary/30 transition-all duration-500">
                                        <div className="md:col-span-1 flex flex-col items-center justify-center">
                                            <span className="text-4xl font-black text-white/5 group-hover:text-primary/10 transition-colors">
                                                {String(index + 1).padStart(2, '0')}
                                            </span>
                                        </div>

                                        <div className="md:col-span-3 flex gap-4 items-center">
                                            <div className="h-16 w-16 rounded-xl bg-card overflow-hidden border border-white/10">
                                                {item.custom_projects?.media?.cover_image ? (
                                                    <img
                                                        src={item.custom_projects.media.cover_image}
                                                        // crossOrigin silences Chrome's ORB
                                                        // on the Unsplash fallback below.
                                                        crossOrigin="anonymous"
                                                        className="w-full h-full object-cover"
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop";
                                                        }}
                                                    />
                                                ) : <Building2 className="h-full w-full p-4 text-muted-foreground" />}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-medium text-foreground truncate">{item.custom_projects?.name}</h4>
                                                <p className="text-xs text-muted-foreground truncate">{item.custom_projects?.developer}</p>
                                            </div>
                                        </div>

                                        <div className="md:col-span-7 space-y-3">
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-zinc-500">Rationale 01</Label>
                                                    <Input
                                                        placeholder="e.g., High Yield Potential"
                                                        defaultValue={item.reason_1}
                                                        onBlur={e => updateItemMutation.mutate({ id: item.id, reason_1: e.target.value })}
                                                        className="h-8 text-xs bg-card border-white/10 focus:border-primary"
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <Label className="text-[10px] uppercase font-bold text-zinc-500">Rationale 02</Label>
                                                    <Input
                                                        placeholder="e.g., Prime Waterfront Location"
                                                        defaultValue={item.reason_2}
                                                        onBlur={e => updateItemMutation.mutate({ id: item.id, reason_2: e.target.value })}
                                                        className="h-8 text-xs bg-card border-white/10 focus:border-primary"
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-1 flex items-center justify-end">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeItemMutation.mutate(item.id)}
                                                className="text-zinc-600 hover:text-red-500 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Search & Add */}
                <div className="space-y-6">
                    <Card className="bg-background border-white/10 sticky top-6 shadow-2xl">
                        <CardHeader>
                            <CardTitle className="text-lg font-light text-foreground flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Internal Inventory
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter your projects..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="pl-10 glass-input h-9 text-sm"
                                />
                            </div>

                            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                {searchedProjects.map(project => {
                                    const isAdded = pickItems.some((pi: any) => pi.project_id === project.id);

                                    return (
                                        <div key={project.id} className="group p-3 rounded-xl border border-white/8 bg-card/30 hover:border-primary/20 transition-all">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="min-w-0 pr-2">
                                                    <h4 className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">{(project as any).name}</h4>
                                                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-light">
                                                        <MapPin className="h-2 w-2" /> {(project as any).district}
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={async () => {
                                                        if (isFull || isAdded || addItemMutation.isPending || createPickMutation.isPending) return;

                                                        let currentPickId = pickRecord?.id;
                                                        if (!currentPickId) {
                                                            // Auto-initialize if it doesn't exist yet
                                                            try {
                                                                const newPick = await createPickMutation.mutateAsync({
                                                                    title: editTitle || `Top Picks for ${currentMonth}`,
                                                                    notes: editNotes
                                                                });
                                                                currentPickId = newPick.id;
                                                            } catch (err) {
                                                                toast.error("Failed to initialize List.");
                                                                return;
                                                            }
                                                        }

                                                        addItemMutation.mutate({
                                                            pick_id: currentPickId,
                                                            project_id: project.id
                                                        });
                                                    }}
                                                    disabled={isFull || isAdded || addItemMutation.isPending || createPickMutation.isPending}
                                                    className={`h-7 px-2 border border-transparent hover:border-primary/30 text-xs ${isAdded ? 'text-green-500' : 'text-primary'}`}
                                                >
                                                    {isAdded ? 'Added' : <Plus className="h-3 w-3" />}
                                                </Button>
                                            </div>
                                        </div>
                                    );
                                })}
                                {searchedProjects.length === 0 && (
                                    <div className="text-center py-10 opacity-50">
                                        <p className="text-xs italic">No matching projects.</p>
                                        <Button variant="link" size="sm" className="text-primary text-[10px]" asChild>
                                            <a href="/admin/projects">Go to Inventory</a>
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function Label({ children, className }: { children: React.ReactNode, className?: string }) {
    return <span className={`text-xs font-medium text-zinc-400 block mb-1 ${className}`}>{children}</span>;
}
