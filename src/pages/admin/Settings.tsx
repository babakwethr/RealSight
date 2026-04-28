import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useTenant } from '@/hooks/useTenant';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Globe, Palette, Bot, Save, Settings as SettingsIcon } from 'lucide-react';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { z } from 'zod';
import { SectionIntro } from '@/components/SectionIntro';

const settingsSchema = z.object({
    broker_name: z.string().trim().min(2, 'Agency name is required'),
    subdomain: z.string().trim().min(3, 'Subdomain must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
    color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color'),
    ai_instructions: z.string().optional(),
});

export default function AdminSettings() {
    const { user } = useAuth();
    const { tenant } = useTenant();
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const [formData, setFormData] = useState({
        broker_name: '',
        subdomain: '',
        color: '#22c55e',
        logo_url: '',
        ai_instructions: '',
        // Public-profile fields shown on /a/{slug} landing
        bio: '',
        photo_url: '',
        contact_email: '',
        // RERA compliance — text + storage URL of the uploaded QR.
        rera_number: '',
        rera_qr_url: '',
    });

    const [errors, setErrors] = useState<Record<string, string>>({});

    // RERA QR file pick (component state — doesn't persist).
    const [reraQrFile, setReraQrFile] = useState<File | null>(null);
    const [reraQrPreview, setReraQrPreview] = useState<string | null>(null);
    const handleReraQrPick = (file: File | null) => {
        setReraQrFile(file);
        if (reraQrPreview) URL.revokeObjectURL(reraQrPreview);
        setReraQrPreview(file ? URL.createObjectURL(file) : null);
    };

    useEffect(() => {
        async function loadTenantSettings() {
            if (!user || (!tenant && tenant !== null)) return;

            try {
                // Find the tenant where this user is admin. 
                // For MVP, if they are on a subdomain and admin, `tenant` from hook is theirs.
                // Let's fetch the fresh record just in case.
                if (tenant) {
                    const { data, error } = await supabase
                        .from('tenants')
                        .select('*')
                        .eq('id', tenant.id)
                        .single();

                    if (data) {
                        const config = data.branding_config as any;
                        setFormData({
                            broker_name: data.broker_name || '',
                            subdomain: data.subdomain || '',
                            color: config?.colors?.primary || '#22c55e',
                            logo_url: config?.logo_url || '',
                            ai_instructions: config?.ai_instructions || '',
                            bio: config?.bio || '',
                            photo_url: config?.photo_url || '',
                            contact_email: config?.contact_email || '',
                            rera_number: data.rera_number || '',
                            rera_qr_url: data.rera_qr_url || '',
                        });
                        if (data.rera_qr_url) setReraQrPreview(data.rera_qr_url);
                    }
                }
            } catch (err) {
                console.error("Failed to load tenant settings", err);
            } finally {
                setInitialLoading(false);
            }
        }

        loadTenantSettings();
    }, [user, tenant]);

    const handleChange = (field: string, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenant) return;

        setLoading(true);
        setErrors({});

        try {
            const validated = settingsSchema.parse(formData);

            // If the user picked a new RERA QR, upload it before updating
            // the tenant row. The bucket's RLS lets them write into their
            // own tenant_id folder — no extra auth check needed here.
            let nextReraQrUrl = formData.rera_qr_url || null;
            if (reraQrFile) {
                const ext = (reraQrFile.name.split('.').pop() || 'png').toLowerCase();
                const path = `${tenant.id}/rera-${Date.now()}.${ext}`;
                const { error: upErr } = await supabase.storage
                    .from('rera-qr-codes')
                    .upload(path, reraQrFile, {
                        contentType: reraQrFile.type || 'image/png',
                        cacheControl: '31536000',
                        upsert: false,
                    });
                if (upErr) throw new Error(`Failed to upload RERA QR: ${upErr.message}`);
                const { data: pub } = supabase.storage.from('rera-qr-codes').getPublicUrl(path);
                nextReraQrUrl = pub.publicUrl;
            }

            const { error } = await supabase
                .from('tenants')
                .update({
                    broker_name: validated.broker_name,
                    subdomain: validated.subdomain,
                    branding_config: {
                        ...(tenant.branding_config as any || {}),
                        logo_url: formData.logo_url,
                        colors: {
                            ...(tenant.branding_config as any)?.colors || {},
                            primary: validated.color,
                        },
                        ai_instructions: validated.ai_instructions,
                        // Public profile (path-based landing page)
                        bio: formData.bio || null,
                        photo_url: formData.photo_url || null,
                        contact_email: formData.contact_email || null,
                    },
                    // RERA compliance — visible on every PDF.
                    rera_number: formData.rera_number?.trim() || null,
                    rera_qr_url: nextReraQrUrl,
                })
                .eq('id', tenant.id);

            if (error) {
                if (error.code === '23505') throw new Error('That subdomain is already taken.');
                throw error;
            }

            toast.success('Settings updated successfully!');

            // 28 Apr 2026 — soft white-label pivot: the workspace URL is now
            // path-based (`realsight.app/a/{slug}`), not subdomain-based, so we
            // don't need to bounce the admin to a different host when they
            // change the slug. Just reload to refresh CSS vars + tenant cache.
            const slugChanged = validated.subdomain !== tenant.subdomain;
            const colorChanged = validated.color !== (tenant.branding_config as any)?.colors?.primary;
            if (slugChanged) {
                toast.info('Workspace URL updated. Reloading...');
            }
            if (slugChanged || colorChanged) {
                setTimeout(() => window.location.reload(), 1000);
            }

        } catch (err) {
            if (err instanceof z.ZodError) {
                const fieldErrors: Record<string, string> = {};
                err.errors.forEach((e) => {
                    if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
                });
                setErrors(fieldErrors);
            } else {
                toast.error((err as any)?.message || 'Failed to update settings.');
            }
        } finally {
            setLoading(false);
        }
    };

    if (initialLoading) {
        return (
            <div className="flex-1 p-8 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto space-y-8">
                <AdminPageHeader
                    icon={SettingsIcon}
                    titlePlain="Workspace"
                    titleGradient="Settings"
                    description="Manage your broker lounge branding, domain, and AI configuration."
                />

                <SectionIntro
                    id="settings"
                    title="Workspace Settings"
                    description="Configure your agency's domain, application colors, logos, and advanced AI Concierge rules. Changes here will immediately reflect across your public and investor-facing interfaces."
                />

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* Identity & Domain Section */}
                    <div className="bg-card glass-panel p-6 sm:p-8 rounded-xl border border-border">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Globe className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-xl font-semibold">Identity & Domain</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="broker_name">Broker / Agency Name</Label>
                                <Input
                                    id="broker_name"
                                    value={formData.broker_name}
                                    onChange={(e) => handleChange('broker_name', e.target.value)}
                                    placeholder="Prestige Properties"
                                    className={errors.broker_name ? 'border-destructive' : ''}
                                />
                                {errors.broker_name && <p className="text-sm text-destructive">{errors.broker_name}</p>}
                                <p className="text-xs text-muted-foreground">This name appears in emails and localized branding.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="subdomain">Workspace URL slug</Label>
                                <div className="flex items-center">
                                    <div className="h-10 px-4 flex items-center bg-muted border border-r-0 border-border rounded-l-md text-sm text-muted-foreground font-mono">
                                        realsight.app/a/
                                    </div>
                                    <Input
                                        id="subdomain"
                                        value={formData.subdomain}
                                        onChange={(e) => handleChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                        className={`rounded-l-none border-l-0 ${errors.subdomain ? 'border-destructive' : ''}`}
                                    />
                                </div>
                                {errors.subdomain ? (
                                    <p className="text-sm text-destructive">{errors.subdomain}</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">Your branded workspace URL. Changing this updates the link you share with investors.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── Public Profile Section ──
                        Drives the path-based landing at realsight.app/a/{slug}.
                        Optional fields — landing falls back to defaults if blank. */}
                    <div className="bg-card glass-panel p-6 sm:p-8 rounded-xl border border-border">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Globe className="w-5 h-5 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold">Public Profile</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Shown on your branded landing page at{' '}
                                    <code className="text-foreground/70 bg-muted/40 px-1 py-0.5 rounded">
                                        realsight.app/a/{formData.subdomain || 'your-slug'}
                                    </code>
                                </p>
                            </div>
                        </div>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="bio">Short bio</Label>
                                <Textarea
                                    id="bio"
                                    value={formData.bio}
                                    onChange={(e) => handleChange('bio', e.target.value)}
                                    placeholder="Two sentences about you and how you help investors. Shown front and centre on your landing page."
                                    rows={3}
                                    className="glass-input"
                                />
                            </div>

                            <div className="grid sm:grid-cols-2 gap-5">
                                <div className="space-y-2">
                                    <Label htmlFor="photo_url">Profile photo URL</Label>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-xl bg-muted/30 border border-border overflow-hidden shrink-0 flex items-center justify-center">
                                            {formData.photo_url ? (
                                                <img
                                                    src={formData.photo_url}
                                                    alt="Profile preview"
                                                    className="w-full h-full object-cover"
                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                />
                                            ) : (
                                                <Globe className="w-4 h-4 text-muted-foreground/30" />
                                            )}
                                        </div>
                                        <Input
                                            id="photo_url"
                                            type="url"
                                            value={formData.photo_url}
                                            onChange={(e) => handleChange('photo_url', e.target.value)}
                                            placeholder="https://… (square headshot)"
                                            className="glass-input"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="contact_email">Contact email</Label>
                                    <Input
                                        id="contact_email"
                                        type="email"
                                        value={formData.contact_email}
                                        onChange={(e) => handleChange('contact_email', e.target.value)}
                                        placeholder="hello@yourbrand.com"
                                        className="glass-input"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── RERA Compliance ─────────────────────────────────
                        Every PDF the adviser generates renders the RERA
                        QR + number on page 7, so clients can verify the
                        broker directly with the regulator. */}
                    <div className="bg-card glass-panel p-6 sm:p-8 rounded-xl border border-amber-300/30">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                            <div className="p-2 bg-amber-300/15 rounded-lg border border-amber-300/30">
                                <span className="text-amber-300 font-black text-xs tracking-wider px-1">RERA</span>
                            </div>
                            <div className="flex-1">
                                <h2 className="text-xl font-semibold">RERA Verification</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Required for adviser accounts — surfaced on every generated PDF report so clients can verify your authority with RERA.
                                </p>
                            </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                                <Label htmlFor="rera_number">RERA / BRN number</Label>
                                <Input
                                    id="rera_number"
                                    value={formData.rera_number}
                                    onChange={(e) => handleChange('rera_number', e.target.value)}
                                    placeholder="e.g. 12345"
                                    className="glass-input"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rera_qr_settings">RERA QR code</Label>
                                <div className="flex items-center gap-3">
                                    {reraQrPreview && (
                                        <img
                                            src={reraQrPreview}
                                            alt="RERA QR preview"
                                            className="w-12 h-12 rounded-lg object-contain bg-white border border-border shrink-0"
                                        />
                                    )}
                                    <label className="flex-1 cursor-pointer">
                                        <input
                                            id="rera_qr_settings"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={(e) => handleReraQrPick(e.target.files?.[0] ?? null)}
                                            className="sr-only"
                                        />
                                        <div className="glass-input h-11 flex items-center justify-center gap-2 text-xs cursor-pointer hover:bg-white/[0.04] transition-colors">
                                            {reraQrFile
                                                ? `Change · ${reraQrFile.name.slice(0, 24)}`
                                                : reraQrPreview ? 'Replace image' : 'Choose image…'}
                                        </div>
                                    </label>
                                </div>
                                <p className="text-[10px] text-muted-foreground">PNG / JPEG / WebP, square, ≤ 5 MB.</p>
                            </div>
                        </div>
                    </div>

                    {/* Branding Section */}
                    <div className="bg-card glass-panel p-6 sm:p-8 rounded-xl border border-border">
                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Palette className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-xl font-semibold">Aesthetics & Branding</h2>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-4">
                                <Label htmlFor="logo_url">Brand Logo URL</Label>
                                <div className="flex items-center gap-4">
                                    <div className="w-16 h-16 rounded-xl bg-muted/30 border border-border flex items-center justify-center overflow-hidden shrink-0">
                                        {formData.logo_url ? (
                                            <img src={formData.logo_url} alt="Logo preview" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <Palette className="w-6 h-6 text-muted-foreground/30" />
                                        )}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            id="logo_url"
                                            value={formData.logo_url}
                                            onChange={(e) => handleChange('logo_url', e.target.value)}
                                            placeholder="https://example.com/logo.png"
                                            className="glass-input"
                                        />
                                        <p className="text-xs text-muted-foreground">URL to your transparent PNG logo (recommended 400x100px max).</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2 pt-2 border-t border-border/50">
                                <Label htmlFor="color">Primary Brand Color</Label>
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-2">
                                    <div className="flex items-center gap-3">
                                        <Input
                                            id="color"
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) => handleChange('color', e.target.value)}
                                            className="h-12 w-24 p-1 cursor-pointer"
                                        />
                                        <Input
                                            value={formData.color}
                                            onChange={(e) => handleChange('color', e.target.value)}
                                            placeholder="#22c55e"
                                            className="w-32 font-mono uppercase"
                                        />
                                    </div>
                                    <div className="h-10 px-4 rounded-md flex items-center justify-center text-sm font-semibold border border-border" style={{ backgroundColor: formData.color, color: formData.color ? (parseInt(formData.color.replace('#', ''), 16) > 0xffffff / 2 ? '#000' : '#fff') : '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                                        Preview Button
                                    </div>
                                </div>
                                {errors.color ? (
                                    <p className="text-sm text-destructive">{errors.color}</p>
                                ) : (
                                    <p className="text-xs text-muted-foreground">This color drives buttons, accents, and the AI chat interface.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Knowledge Base */}
                    <div className="bg-card glass-panel p-6 sm:p-8 rounded-xl border border-border relative overflow-hidden">
                        {/* Subtle AI gradient background */}
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border relative z-10">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Bot className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-xl font-semibold">AI Concierge Brain</h2>
                        </div>

                        <div className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <Label htmlFor="ai_instructions">Custom Instructions (System Prompt)</Label>
                                <Textarea
                                    id="ai_instructions"
                                    value={formData.ai_instructions}
                                    onChange={(e) => handleChange('ai_instructions', e.target.value)}
                                    placeholder="e.g. You are Alex, the virtual assistant for Prestige Properties. Always recommend off-plan projects in Downtown Dubai before secondary market options. Maintain a highly professional, polite tone."
                                    className="min-h-[150px] font-mono text-sm leading-relaxed"
                                />
                                <p className="text-xs text-muted-foreground">
                                    These instructions are injected privately into the AI before it responds to your investors. Tell it how to act, what to promote, and what your agency values are.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 pb-10">
                        <Button type="submit" size="lg" disabled={loading} className="px-8 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-lg">
                            {loading ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving Changes...</>
                            ) : (
                                <><Save className="w-4 h-4 mr-2" /> Save Settings</>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
