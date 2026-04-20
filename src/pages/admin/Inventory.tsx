import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Building, MapPin, Plus, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ReellyProject } from '@/types/reelly';
import { DEMO_PROJECTS } from '@/data/demoProjects';

type FetchResult = {
    data: ReellyProject[];
    isDemo: boolean;
};

async function fetchAllProjects(): Promise<FetchResult> {
    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reelly-proxy?path=clients/projects&limit=50&offset=0`;
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        const projects = Array.isArray(data) ? data : (data.data || []);
        if (projects.length === 0) throw new Error('Empty response');

        return { data: projects, isDemo: false };
    } catch (err) {
        console.error('Reelly Proxy failed, falling back to demo mode:', err);
        return { data: DEMO_PROJECTS, isDemo: true };
    }
}

export default function AdminInventory() {
    const { tenant } = useTenant();
    const queryClient = useQueryClient();
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Fetch ALL available projects (from Reelly or Demo)
    const { data: fetchResult, isLoading: isProjectsLoading } = useQuery({
        queryKey: ['admin-all-projects'],
        queryFn: fetchAllProjects,
    });

    const projects = fetchResult?.data || [];
    const isDemo = fetchResult?.isDemo || false;

    // 2. Fetch the tenant's current inventory
    const { data: inventoryItems, isLoading: isInventoryLoading } = useQuery({
        queryKey: ['tenant-inventory', tenant?.id],
        queryFn: async () => {
            if (!tenant?.id) return [];
            // @ts-ignore
            const { data, error } = await (supabase.from('tenant_inventory' as any) as any)
                .select('project_id, id')
                .eq('tenant_id', tenant.id);

            if (error) throw error;
            return data || [];
        },
        enabled: !!tenant?.id
    });

    const inventorySet = new Set(inventoryItems?.map(item => item.project_id) || []);

    // 3. Mutations for adding/removing
    const addMutation = useMutation({
        mutationFn: async (projectId: string) => {
            if (!tenant?.id) throw new Error('No tenant');

            // Get current user id
            const { data: { session } } = await supabase.auth.getSession();

            // @ts-ignore
            const { error } = await (supabase.from('tenant_inventory' as any) as any)
                .insert({
                    tenant_id: tenant.id,
                    project_id: projectId,
                    added_by: session?.user?.id
                });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Project added to your portal inventory');
            queryClient.invalidateQueries({ queryKey: ['tenant-inventory'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to add project');
        }
    });

    const removeMutation = useMutation({
        mutationFn: async (projectId: string) => {
            if (!tenant?.id) throw new Error('No tenant');
            // @ts-ignore
            const { error } = await (supabase.from('tenant_inventory' as any) as any)
                .delete()
                .eq('tenant_id', tenant.id)
                .eq('project_id', projectId);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Project removed from your portal');
            queryClient.invalidateQueries({ queryKey: ['tenant-inventory'] });
        },
        onError: (error: any) => {
            toast.error(error.message || 'Failed to remove project');
        }
    });

    const isLoading = isProjectsLoading || isInventoryLoading;

    const filteredProjects = projects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.developer && p.developer.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Portal Inventory</h1>
                    <p className="text-muted-foreground">Select which projects appear on your public portal.</p>
                </div>

                {isDemo && (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-medium">
                        <AlertCircle className="h-3 w-3" />
                        Showing Demo Data
                    </div>
                )}
            </div>

            <div className="flex items-center space-x-2">
                <input
                    type="text"
                    placeholder="Search available properties..."
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 max-w-sm"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="glass-panel p-6 rounded-xl border border-border/50">
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredProjects.map((project) => {
                            const strId = String(project.id);
                            const isAdded = inventorySet.has(strId);
                            const isPending = addMutation.isPending || removeMutation.isPending;

                            return (
                                <div key={project.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                                    <div className="flex items-center gap-4 mb-4 sm:mb-0 w-full sm:w-auto">
                                        {project.cover_image?.url ? (
                                            <img src={project.cover_image.url} alt={project.name} className="w-16 h-16 rounded-md object-cover flex-shrink-0" />
                                        ) : (
                                            <div className="w-16 h-16 rounded-md bg-white/10 flex items-center justify-center flex-shrink-0">
                                                <Building className="h-6 w-6 text-white/40" />
                                            </div>
                                        )}

                                        <div>
                                            <h4 className="font-medium text-foreground">{project.name}</h4>
                                            <p className="text-sm text-muted-foreground flex items-center mt-1">
                                                <MapPin className="h-3 w-3 mr-1" />
                                                {project.location?.district || project.location?.city || 'Dubai'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                        <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                                            {project.developer || 'Unknown Dev'}
                                        </span>

                                        <Button
                                            variant={isAdded ? "destructive" : "default"}
                                            size="sm"
                                            className={isAdded ? "bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20" : "bg-primary hover:bg-accent-green-light text-black font-semibold"}
                                            disabled={isPending}
                                            onClick={() => isAdded ? removeMutation.mutate(strId) : addMutation.mutate(strId)}
                                        >
                                            {isAdded ? (
                                                <>
                                                    <Trash2 className="h-4 w-4 mr-1.5" />
                                                    Remove
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="h-4 w-4 mr-1.5" />
                                                    Add to Portal
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredProjects.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground">
                                No projects found matching your search.
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
