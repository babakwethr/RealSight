import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus, Trash2, Upload, X, Image as ImageIcon, FileText, Video } from 'lucide-react';
import { toast } from 'sonner';

interface ProjectFormProps {
    project?: any;
    onSuccess: () => void;
    onCancel: () => void;
}

const PROPERTY_CATEGORIES = [
    'Off-plan',
    'Secondary Market',
    'Land',
    'Commercial',
    'Full Building'
];

const CITIES = ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ras Al Khaimah'];
const CONSTRUCTION_STATUSES = ['Under Construction', 'Completed', 'Launch Soon'];
const SALE_STATUSES = ['For Sale', 'Sold Out', 'Pre-launch'];

export function ProjectForm({ project, onSuccess, onCancel }: ProjectFormProps) {
    const { tenant } = useTenant();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: project?.name || '',
        developer: project?.developer || '',
        property_category: project?.property_category || 'Off-plan',
        city: project?.city || 'Dubai',
        district: project?.district || '',
        starting_price: project?.starting_price || '',
        completion_date: project?.completion_date || '',
        construction_status: project?.construction_status || 'Under Construction',
        sale_status: project?.sale_status || 'For Sale',
        description: project?.description || '',
        key_highlights: project?.key_highlights || [],
        amenities: project?.amenities || [],
        unit_sizes: project?.unit_sizes || { min: '', max: '', unit: 'sqft' },
        payment_plan: project?.payment_plan || [],
        media: project?.media || {
            cover_image: null,
            gallery: [],
            floor_plans: [],
            brochure: null,
            video: null
        }
    });

    const [newHighlight, setNewHighlight] = useState('');
    const [newAmenity, setNewAmenity] = useState('');

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'cover' | 'gallery' | 'floor_plan' | 'brochure' | 'video') => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setUploading(type);
        try {
            const uploadedUrls: string[] = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const fileExt = file.name.split('.').pop();
                const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
                const filePath = `${type}s/${fileName}`;

                const { error: uploadError, data } = await supabase.storage
                    .from('project-media')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('project-media')
                    .getPublicUrl(filePath);

                uploadedUrls.push(publicUrl);
            }

            setFormData(prev => {
                const newMedia = { ...prev.media };
                if (type === 'cover') newMedia.cover_image = uploadedUrls[0];
                else if (type === 'gallery') newMedia.gallery = [...newMedia.gallery, ...uploadedUrls];
                else if (type === 'floor_plan') newMedia.floor_plans = [...newMedia.floor_plans, ...uploadedUrls];
                else if (type === 'brochure') newMedia.brochure = uploadedUrls[0];
                else if (type === 'video') newMedia.video = uploadedUrls[0];
                return { ...prev, media: newMedia };
            });

            toast.success('Upload successful');
        } catch (error: any) {
            toast.error(`Upload failed: ${error.message}`);
        } finally {
            setUploading(null);
        }
    };

    const removeMedia = (type: 'gallery' | 'floor_plans', url: string) => {
        setFormData(prev => {
            const newMedia = { ...prev.media };
            newMedia[type] = newMedia[type].filter((u: string) => u !== url);
            return { ...prev, media: newMedia };
        });
    };

    const addMilestone = () => {
        setFormData(prev => ({
            ...prev,
            payment_plan: [...prev.payment_plan, { milestone: '', percentage: '', due_date: '' }]
        }));
    };

    const updateMilestone = (index: number, field: string, value: string) => {
        setFormData(prev => {
            const newPlan = [...prev.payment_plan];
            newPlan[index] = { ...newPlan[index], [field]: value };
            return { ...prev, payment_plan: newPlan };
        });
    };

    const removeMilestone = (index: number) => {
        setFormData(prev => ({
            ...prev,
            payment_plan: prev.payment_plan.filter((_: any, i: number) => i !== index)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                ...formData,
                starting_price: formData.starting_price ? parseFloat(formData.starting_price.toString()) : null,
            };

            if (project?.id) {
                const { error } = await (supabase.from('custom_projects' as any) as any)
                    .update(payload)
                    .eq('id', project.id);
                if (error) throw error;
                toast.success('Project updated successfully');
            } else {
                const { error } = await (supabase.from('custom_projects' as any) as any)
                    .insert([{
                        ...payload,
                        tenant_id: tenant?.id || '00000000-0000-0000-0000-000000000000'
                    }]);
                if (error) throw error;
                toast.success('Project created successfully');
            }
            onSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Core Information */}
                <Card className="bg-background border-white/10">
                    <CardHeader>
                        <CardTitle className="text-xl font-light text-primary font-cinematic uppercase tracking-widest">Core Information</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Project Name</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g., Burj Khalifa Residences"
                                required
                                className="glass-input"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Developer</Label>
                            <Input
                                value={formData.developer}
                                onChange={e => setFormData({ ...formData, developer: e.target.value })}
                                placeholder="e.g., Emaar"
                                required
                                className="glass-input"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Category</Label>
                                <Select
                                    value={formData.property_category}
                                    onValueChange={v => setFormData({ ...formData, property_category: v })}
                                >
                                    <SelectTrigger className="glass-input">
                                        <SelectValue placeholder="Select Category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PROPERTY_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Starting Price (AED)</Label>
                                <Input
                                    type="number"
                                    value={formData.starting_price}
                                    onChange={e => setFormData({ ...formData, starting_price: e.target.value })}
                                    placeholder="2,500,000"
                                    className="glass-input"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Location & Status */}
                <Card className="bg-background border-white/10">
                    <CardHeader>
                        <CardTitle className="text-xl font-light text-primary font-cinematic uppercase tracking-widest">Location & Status</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>City</Label>
                                <Select value={formData.city} onValueChange={v => setFormData({ ...formData, city: v })}>
                                    <SelectTrigger className="glass-input">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>District</Label>
                                <Input
                                    value={formData.district}
                                    onChange={e => setFormData({ ...formData, district: e.target.value })}
                                    placeholder="e.g., Downtown Dubai"
                                    required
                                    className="glass-input"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Construction Status</Label>
                                <Select value={formData.construction_status} onValueChange={v => setFormData({ ...formData, construction_status: v })}>
                                    <SelectTrigger className="glass-input">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CONSTRUCTION_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Sale Status</Label>
                                <Select value={formData.sale_status} onValueChange={v => setFormData({ ...formData, sale_status: v })}>
                                    <SelectTrigger className="glass-input">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {SALE_STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Handover Date</Label>
                            <Input
                                type="date"
                                value={formData.completion_date}
                                onChange={e => setFormData({ ...formData, completion_date: e.target.value })}
                                className="glass-input"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Media Uploads */}
                <Card className="bg-background border-white/10 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-xl font-light text-primary font-cinematic uppercase tracking-widest">Media & Assets</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Cover Image */}
                            <div className="space-y-4">
                                <Label>Cover Image</Label>
                                <div className="relative aspect-video rounded-lg border-2 border-dashed border-white/10 bg-card/50 flex flex-col items-center justify-center overflow-hidden group">
                                    {formData.media.cover_image ? (
                                        <>
                                            <img
                                                src={formData.media.cover_image}
                                                className="w-full h-full object-cover"
                                                alt="Cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=1000&auto=format&fit=crop";
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Button variant="destructive" size="icon" onClick={() => setFormData({ ...formData, media: { ...formData.media, cover_image: null } })}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <ImageIcon className="h-8 w-8 text-zinc-700 mb-2" />
                                            <Label htmlFor="cover-upload" className="cursor-pointer text-xs text-muted-foreground hover:text-primary">
                                                Upload Cover Image
                                                <Input id="cover-upload" type="file" className="hidden" accept="image/*" onChange={e => handleFileUpload(e, 'cover')} />
                                            </Label>
                                        </>
                                    )}
                                    {uploading === 'cover' && <div className="absolute inset-0 bg-black/60 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}
                                </div>
                            </div>

                            {/* Gallery */}
                            <div className="space-y-4 md:col-span-2">
                                <Label>Project Gallery</Label>
                                <div className="grid grid-cols-4 md:grid-cols-6 gap-3">
                                    {formData.media.gallery.map((url: string, idx: number) => (
                                        <div key={idx} className="relative aspect-square rounded-md border border-white/10 bg-card/50 overflow-hidden group">
                                            <img src={url} className="w-full h-full object-cover" alt={`Gallery ${idx}`} />
                                            <button
                                                type="button"
                                                onClick={() => removeMedia('gallery', url)}
                                                className="absolute top-1 right-1 bg-red-500 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X className="h-3 w-3 text-white" />
                                            </button>
                                        </div>
                                    ))}
                                    <Label htmlFor="gallery-upload" className="relative aspect-square rounded-md border-2 border-dashed border-white/10 bg-card/50 flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                                        <Plus className="h-4 w-4 text-zinc-700" />
                                        <Input id="gallery-upload" type="file" className="hidden" multiple accept="image/*" onChange={e => handleFileUpload(e, 'gallery')} />
                                    </Label>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Brochure */}
                            <div className="space-y-2">
                                <Label>Brochure (PDF)</Label>
                                <div className="flex items-center gap-3 p-3 rounded-lg border border-white/10 bg-card/50">
                                    <FileText className="h-5 w-5 text-primary" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm truncate">{formData.media.brochure ? 'Selected PDF' : 'No brochure uploaded'}</p>
                                    </div>
                                    <Label htmlFor="brochure-upload" className="cursor-pointer text-xs font-semibold text-primary hover:underline">
                                        {formData.media.brochure ? 'Change' : 'Upload'}
                                        <Input id="brochure-upload" type="file" className="hidden" accept="application/pdf" onChange={e => handleFileUpload(e, 'brochure')} />
                                    </Label>
                                </div>
                            </div>

                            {/* Video URL */}
                            <div className="space-y-2">
                                <Label>Video URL (or direct link)</Label>
                                <div className="relative">
                                    <Video className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="https://vimeo.com/..."
                                        value={formData.media.video || ''}
                                        onChange={e => setFormData({ ...formData, media: { ...formData.media, video: e.target.value } })}
                                        className="glass-input pl-10"
                                    />
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Plan */}
                <Card className="bg-background border-white/10 md:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-xl font-light text-primary font-cinematic uppercase tracking-widest">Payment Plan Builder</CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={addMilestone} className="border-primary/30 text-primary hover:bg-primary/10">
                            <Plus className="h-4 w-4 mr-2" /> Add Milestone
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {formData.payment_plan.map((item: any, idx: number) => (
                                <div key={idx} className="grid grid-cols-12 gap-3 items-end p-4 rounded-xl border border-white/10 bg-card/30">
                                    <div className="col-span-5 space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Milestone</Label>
                                        <Input
                                            placeholder="e.g. On Booking"
                                            value={item.milestone}
                                            onChange={e => updateMilestone(idx, 'milestone', e.target.value)}
                                            className="glass-input h-9"
                                        />
                                    </div>
                                    <div className="col-span-2 space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Percentage</Label>
                                        <Input
                                            type="number"
                                            placeholder="10"
                                            value={item.percentage}
                                            onChange={e => updateMilestone(idx, 'percentage', e.target.value)}
                                            className="glass-input h-9"
                                        />
                                    </div>
                                    <div className="col-span-4 space-y-2">
                                        <Label className="text-[10px] uppercase font-bold text-zinc-500">Payment Date / Multi</Label>
                                        <Input
                                            placeholder="e.g. Dec 2025"
                                            value={item.due_date}
                                            onChange={e => updateMilestone(idx, 'due_date', e.target.value)}
                                            className="glass-input h-9"
                                        />
                                    </div>
                                    <div className="col-span-1">
                                        <Button type="button" variant="ghost" size="icon" onClick={() => removeMilestone(idx)} className="text-red-500 hover:text-red-400 hover:bg-red-500/10">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {formData.payment_plan.length === 0 && (
                                <p className="text-center py-8 text-muted-foreground italic border-2 border-dashed border-white/10 rounded-lg">
                                    No payment milestones defined.
                                </p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Content & Description */}
                <Card className="bg-background border-white/10 md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-xl font-light text-primary font-cinematic uppercase tracking-widest">Description & Highlights</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label>Full Project Description</Label>
                            <Textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="Write a detailed property overview..."
                                className="glass-input min-h-[150px]"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <Label>Key Highlights</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newHighlight}
                                        onChange={e => setNewHighlight(e.target.value)}
                                        placeholder="e.g., Waterfront Living"
                                        className="glass-input"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newHighlight) { setFormData({ ...formData, key_highlights: [...formData.key_highlights, newHighlight] }); setNewHighlight(''); } } }}
                                    />
                                    <Button type="button" onClick={() => { if (newHighlight) { setFormData({ ...formData, key_highlights: [...formData.key_highlights, newHighlight] }); setNewHighlight(''); } }} variant="outline" className="border-primary/30 text-primary">Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.key_highlights.map((h: string, i: number) => (
                                        <span key={i} className="px-2 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs flex items-center gap-1">
                                            {h}
                                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFormData({ ...formData, key_highlights: formData.key_highlights.filter((_: any, idx: number) => idx !== i) })} />
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Label>Amenities</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={newAmenity}
                                        onChange={e => setNewAmenity(e.target.value)}
                                        placeholder="e.g., Infinity Pool"
                                        className="glass-input"
                                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (newAmenity) { setFormData({ ...formData, amenities: [...formData.amenities, newAmenity] }); setNewAmenity(''); } } }}
                                    />
                                    <Button type="button" onClick={() => { if (newAmenity) { setFormData({ ...formData, amenities: [...formData.amenities, newAmenity] }); setNewAmenity(''); } }} variant="outline" className="border-primary/30 text-primary">Add</Button>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {formData.amenities.map((a: string, i: number) => (
                                        <span key={i} className="px-2 py-1 rounded bg-zinc-800 border border-zinc-700 text-foreground text-xs flex items-center gap-1">
                                            {a}
                                            <X className="h-3 w-3 cursor-pointer" onClick={() => setFormData({ ...formData, amenities: formData.amenities.filter((_: any, idx: number) => idx !== i) })} />
                                        </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end gap-4 pb-12 sticky bottom-0 bg-background/80 backdrop-blur-md p-4 rounded-xl border-t border-white/5 z-20">
                <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button type="submit" disabled={loading} className="bg-primary hover:bg-accent-green-light text-black font-semibold px-8 accent-glow">
                    {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {project?.id ? 'Update Project' : 'Create Project'}
                </Button>
            </div>
        </form>
    );
}
