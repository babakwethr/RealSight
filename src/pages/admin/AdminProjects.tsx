import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { ProjectForm } from '@/components/admin/projects/ProjectForm';
import { Button } from '@/components/ui/button';
import { Building2, Plus, Search, Trash2, Edit2, MapPin, Loader2, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { useTenant } from '@/hooks/useTenant';

export default function AdminProjects() {
    const { tenant } = useTenant();
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [editingProject, setEditingProject] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['admin-custom-projects', tenant?.id],
        queryFn: async () => {
            let query = (supabase.from('custom_projects' as any) as any)
                .select('*')
                .order('created_at', { ascending: false });

            if (tenant?.id) {
                query = query.eq('tenant_id', tenant.id);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data || [];
        },
        enabled: true
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await (supabase.from('custom_projects' as any) as any)
                .delete()
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success('Project deleted');
            queryClient.invalidateQueries({ queryKey: ['admin-custom-projects'] });
        }
    });

    // Deduplicate projects by name (case-insensitive and trimmed)
    const uniqueProjects = projects.reduce((acc: any[], current: any) => {
        const currentName = current.name?.trim().toLowerCase();
        if (!currentName) return acc;

        const exists = acc.some(item => item.name?.trim().toLowerCase() === currentName);
        if (!exists) {
            return [...acc, current];
        } else {
            return acc;
        }
    }, []);

    const filteredProjects = uniqueProjects.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.developer.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isAdding || editingProject) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto">
                <div className="flex items-center justify-between border-b border-white/5 pb-4">
                    <h2 className="text-2xl font-light text-foreground flex items-center gap-3">
                        <Building2 className="h-6 w-6 text-primary" />
                        {editingProject ? `Edit ${editingProject.name}` : 'Create New Project'}
                    </h2>
                </div>
                <ProjectForm
                    project={editingProject}
                    onSuccess={() => { setIsAdding(false); setEditingProject(null); queryClient.invalidateQueries({ queryKey: ['admin-custom-projects'] }); }}
                    onCancel={() => { setIsAdding(false); setEditingProject(null); }}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-light tracking-tight text-foreground flex items-center gap-3">
                        <Home className="h-8 w-8 text-primary" />
                        Manual Inventory
                    </h1>
                    <p className="text-muted-foreground mt-1">Manage your curated property projects for Top Picks and Investor access.</p>
                </div>
                <Button onClick={() => setIsAdding(true)} className="bg-primary hover:bg-accent-green-light text-black font-semibold accent-glow">
                    <Plus className="h-4 w-4 mr-2" /> Add Project
                </Button>
            </div>

            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search projects or developers..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-10 glass-input"
                />
            </div>

            {isLoading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                </div>
            ) : filteredProjects.length === 0 ? (
                <div className="text-center py-20 border-2 border-dashed border-border/30 rounded-2xl bg-background/50">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-foreground">No projects found</h3>
                    <p className="text-muted-foreground mt-2 max-w-sm mx-auto">Start by adding your first internal real estate project to populate your inventory.</p>
                    <Button onClick={() => setIsAdding(true)} variant="link" className="text-primary mt-4">Add Project Now</Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredProjects.map((project) => (
                        <Card key={project.id} className="group bg-background border-border/30 overflow-hidden hover:border-primary/30 transition-all duration-500">
                            <div className="aspect-video relative overflow-hidden">
                                {project.media?.cover_image ? (
                                    <img
                                        src={project.media.cover_image}
                                        alt={project.name}
                                        // crossOrigin="anonymous" silences Chrome's Opaque
                                        // Response Blocking on the Unsplash fallbacks below.
                                        // Without it, all 3 fallback URLs hit ERR_BLOCKED_BY_ORB.
                                        crossOrigin="anonymous"
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            const fallbacks = [
                                                "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop",
                                                "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1000&auto=format&fit=crop",
                                                "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?q=80&w=1000&auto=format&fit=crop"
                                            ];
                                            const currentIdx = parseInt(target.getAttribute('data-fallback-idx') || '0');
                                            if (currentIdx < fallbacks.length) {
                                                target.src = fallbacks[currentIdx];
                                                target.setAttribute('data-fallback-idx', (currentIdx + 1).toString());
                                            }
                                        }}
                                    />
                                ) : (
                                    <div className="w-full h-full bg-card flex items-center justify-center">
                                        <Building2 className="h-10 w-10 text-muted-foreground" />
                                    </div>
                                )}
                                <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button size="icon" variant="secondary" className="h-8 w-8 bg-black/60 backdrop-blur-md border-border/30" onClick={() => setEditingProject(project)}>
                                        <Edit2 className="h-4 w-4 text-white" />
                                    </Button>
                                    <Button size="icon" variant="destructive" className="h-8 w-8 bg-red-500/80 backdrop-blur-md border-none" onClick={() => deleteMutation.mutate(project.id)}>
                                        <Trash2 className="h-4 w-4 text-white" />
                                    </Button>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent">
                                    <span className="px-2 py-0.5 rounded bg-primary text-black text-[10px] font-bold uppercase tracking-wider">
                                        {project.property_category}
                                    </span>
                                </div>
                            </div>
                            <CardContent className="p-5 space-y-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="text-lg font-medium text-foreground group-hover:text-primary transition-colors">{project.name}</h3>
                                        <p className="text-sm text-muted-foreground font-light">{project.developer}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <MapPin className="h-3 w-3 text-primary" />
                                    {project.district}, {project.city}
                                </div>

                                <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-sm font-light text-zinc-400">Starting Price</span>
                                    <span className="text-base font-medium text-foreground">
                                        {project.starting_price ? `AED ${Number(project.starting_price).toLocaleString()}` : 'Price on App'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
