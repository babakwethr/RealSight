import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { Loader2, ArrowRight, ArrowLeft, CheckCircle2, Building2, Globe, Bot, Send, Sparkles } from 'lucide-react';
import { verifyReraQr, reraQrCheckMessage, type ReraQrCheck } from '@/lib/verifyReraQr';
import { Logo } from '@/components/Logo';

// Define preset colors
const BRAND_PRESETS = [
  { id: 'gold', color: '#caaf6c', name: 'Premium Gold' },
  { id: 'emerald', color: '#10b981', name: 'Emerald Green' },
  { id: 'sapphire', color: '#3b82f6', name: 'Sapphire Blue' },
];

const TONE_PRESETS = [
  { id: 'professional', label: 'Professional & Direct', desc: 'Formal, concise, highly professional.' },
  { id: 'welcoming', label: 'Warm & Welcoming', desc: 'Friendly, helpful, conversational.' },
  { id: 'luxury', label: 'Exclusive & Luxury', desc: 'Sophisticated, premium, attentive.' },
];

const STORAGE_KEY = 'realsight_wizard_state';

export default function SetupWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Load initial state from local storage or default
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved).step : 1;
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // RERA QR file — kept out of formData/localStorage because File can't
  // be serialised. Uploaded to Supabase Storage in handleLaunch once
  // the tenant_id exists.
  const [reraQrFile, setReraQrFile] = useState<File | null>(null);
  const [reraQrPreview, setReraQrPreview] = useState<string | null>(null);
  const [reraQrCheck, setReraQrCheck] = useState<ReraQrCheck | null>(null);
  const [reraVerifying, setReraVerifying] = useState(false);

  const handleReraQrPick = async (file: File | null) => {
    setReraQrFile(file);
    setReraQrCheck(null);
    if (errors.rera_qr_url) setErrors(prev => ({ ...prev, rera_qr_url: '' }));
    if (reraQrPreview) URL.revokeObjectURL(reraQrPreview);
    setReraQrPreview(file ? URL.createObjectURL(file) : null);
    if (!file) return;
    setReraVerifying(true);
    const check = await verifyReraQr(file);
    setReraQrCheck(check);
    setReraVerifying(false);
    if (check.status !== 'ok') {
      const msg = reraQrCheckMessage(check);
      toast.error(msg.line, { description: msg.detail });
    }
  };

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved).formData;
    }
    return {
      broker_name: user?.user_metadata?.full_name || '',
      logo_url: '',
      color: BRAND_PRESETS[0].color,
      // Public-profile fields — surface on the path-based landing
      // (realsight.app/a/{slug}) and on every branded report. All optional;
      // the landing page falls back to sensible defaults when missing.
      photo_url: '',
      bio: '',
      contact_email: user?.email || '',
      // RERA compliance — required for adviser tenants. The number is
      // typed; the QR is a Supabase Storage URL after upload.
      rera_number: '',
      rera_qr_url: '',
      // ──────────────────────────────────────────────────────────────────
      subdomain: '',
      concierge_name: 'Alex',
      concierge_tone: 'professional',
      welcome_message: 'Welcome to your private investor lounge. Let us know how we can assist you today.',
    };
  });

  // Persist state to local storage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, formData }));
  }, [step, formData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    if (step === 1) {
      if (formData.broker_name.trim().length < 2) {
        newErrors.broker_name = 'Agency name is required';
      }
      // RERA compliance is mandatory for advisers — every UAE-licensed
      // broker has a RERA-issued QR + registration number. The QR is
      // additionally validated client-side: the QR must encode a URL on
      // a dubailand.gov.ae host (we don't trust arbitrary uploads).
      if (!formData.rera_number || formData.rera_number.trim().length < 3) {
        newErrors.rera_number = 'Your RERA number is required';
      }
      if (!reraQrFile) {
        newErrors.rera_qr_url = 'Please upload your RERA QR code';
      } else if (!reraQrCheck || reraQrCheck.status !== 'ok') {
        newErrors.rera_qr_url = 'The QR you uploaded does not link to a valid RERA verification URL.';
      }
    }
    if (step === 2) {
      if (formData.subdomain.trim().length < 3) {
        newErrors.subdomain = 'Subdomain must be at least 3 characters';
      } else if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
        newErrors.subdomain = 'Only lowercase letters, numbers, and hyphens allowed';
      }
    }
    if (step === 3 && formData.concierge_name.trim().length < 2) {
      newErrors.concierge_name = 'Name is required';
    }
    if (step === 4 && formData.welcome_message.trim().length < 10) {
      newErrors.welcome_message = 'Please provide a meaningful welcome message';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setStep((s) => Math.min(s + 1, 5));
  };

  const handleBack = () => setStep((s) => Math.max(s - 1, 1));

  const handleLaunch = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // 1. Create tenant & assign admin role via RPC
      const { data: rpcResultRaw, error: rpcError } = await supabase.rpc('setup_advisor_platform', {
        p_broker_name: formData.broker_name,
        p_subdomain: formData.subdomain,
        p_brand_color: formData.color,
      });

      if (rpcError) throw rpcError;
      
      const rpcResult = rpcResultRaw as any;
      if (rpcResult && !rpcResult.success) throw new Error(rpcResult.error);

      // 2. Update the tenant record with the remaining config details
      const aiInstructions = `You are ${formData.concierge_name}, the AI concierge. Tone: ${formData.concierge_tone}. Assist the user based on these parameters.`;
      
      // Upload the RERA QR image to Supabase Storage now that we have
      // a tenant_id (the bucket's RLS policy requires the first folder
      // segment to match the user's tenant_id from profiles).
      let reraQrPublicUrl: string | null = formData.rera_qr_url || null;
      if (reraQrFile) {
        const ext = (reraQrFile.name.split('.').pop() || 'png').toLowerCase();
        const path = `${rpcResult.tenant_id}/rera-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('rera-qr-codes')
          .upload(path, reraQrFile, {
            contentType: reraQrFile.type || 'image/png',
            cacheControl: '31536000',
            upsert: false,
          });
        if (upErr) throw new Error(`Failed to upload RERA QR: ${upErr.message}`);
        const { data: pub } = supabase.storage.from('rera-qr-codes').getPublicUrl(path);
        reraQrPublicUrl = pub.publicUrl;
      }

      const { error: updateError } = await supabase
        .from('tenants')
        .update({
            branding_config: {
                colors: { primary: formData.color },
                logo_url: formData.logo_url,
                photo_url: formData.photo_url || null,
                bio: formData.bio || null,
                contact_email: formData.contact_email || null,
                ai_instructions: aiInstructions,
                welcome_text: formData.welcome_message,
            },
            // RERA compliance — surfaces on every PDF agent card and
            // is shown next to the QR for adviser verification.
            rera_number: formData.rera_number?.trim() || null,
            rera_qr_url: reraQrPublicUrl,
            rera_qr_decoded_url: reraQrCheck?.status === 'ok' ? reraQrCheck.decodedUrl : null,
            rera_verified: reraQrCheck?.status === 'ok',
        })
        .eq('id', rpcResult.tenant_id);

      if (updateError) throw updateError;

      // 3. Update user metadata
      await supabase.auth.updateUser({
        data: {
          tenant_id: rpcResult.tenant_id,
          full_name: formData.broker_name,
        }
      });

      toast.success('Your workspace is ready!');
      
      // Delay before redirecting to let session updates propagate
      localStorage.removeItem(STORAGE_KEY);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1500);

    } catch (err: any) {
      toast.error(err.message || 'Failed to finish setup.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen cinematic-bg flex flex-col items-center justify-center p-4">
      {/* Background elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <div className="flex justify-center mb-8">
          <Logo variant="white" height="h-10" />
        </div>

        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl bg-card border border-border">
          {/* Progress Bar */}
          <div className="bg-muted/50 px-8 py-4 border-b border-border flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Step {step} of 5
            </span>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-8 rounded-full transition-colors duration-300 ${
                    s === step ? 'bg-primary' : s < step ? 'bg-primary/40' : 'bg-muted-foreground/20'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="p-8">
            {/* Step 1: Brand Basics */}
            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="mb-8">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Brand Basics</h2>
                  <p className="text-muted-foreground">Let's set up your agency identity.</p>
                </div>

                <div className="space-y-3">
                  <Label>Agency / Broker Name</Label>
                  <Input
                    value={formData.broker_name}
                    onChange={(e) => {
                      handleChange('broker_name', e.target.value);
                      if (!formData.subdomain) {
                        handleChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }
                    }}
                    placeholder="E.g. Prestige Properties"
                    className={`glass-input h-12 ${errors.broker_name ? 'border-destructive' : ''}`}
                    autoFocus
                  />
                  {errors.broker_name && <p className="text-sm text-destructive">{errors.broker_name}</p>}
                </div>

                <div className="space-y-3 pt-4">
                  <Label>Brand Accent Color</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {BRAND_PRESETS.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleChange('color', preset.color)}
                        className={`relative rounded-xl p-4 flex flex-col items-center gap-2 border-2 transition-all ${
                          formData.color === preset.color ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-border bg-muted/20'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-full shadow-inner" style={{ backgroundColor: preset.color }} />
                        <span className="text-xs font-medium text-foreground">{preset.name}</span>
                        {formData.color === preset.color && (
                          <div className="absolute top-2 right-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* ── Public profile (optional but recommended) ──
                    These three fields surface on the path-based landing
                    page (realsight.app/a/{slug}) that prospective investors
                    see before they sign up. All optional — the page falls
                    back to sensible defaults if you skip them. */}
                <div className="space-y-3 pt-6 border-t border-border/40">
                  <p className="text-[10px] uppercase font-black tracking-[0.18em] text-muted-foreground/80">
                    Public profile <span className="font-normal normal-case tracking-normal text-muted-foreground/60">(optional · shown on your landing page)</span>
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Short bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleChange('bio', e.target.value)}
                      placeholder="Two sentences about you and how you help investors. Shown on your branded landing page."
                      rows={3}
                      className="glass-input"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="photo_url">Profile photo URL</Label>
                    <Input
                      id="photo_url"
                      type="url"
                      value={formData.photo_url}
                      onChange={(e) => handleChange('photo_url', e.target.value)}
                      placeholder="https://… (a square headshot works best)"
                      className="glass-input h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact_email">Contact email</Label>
                    <Input
                      id="contact_email"
                      type="email"
                      value={formData.contact_email}
                      onChange={(e) => handleChange('contact_email', e.target.value)}
                      placeholder="hello@yourbrand.com"
                      className="glass-input h-11"
                    />
                  </div>
                </div>

                {/* ── RERA compliance — required for adviser tenants ── */}
                <div className="mt-8 rounded-xl border border-amber-300/25 bg-amber-300/[0.04] p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-300/15 border border-amber-300/30 flex items-center justify-center shrink-0">
                      <span className="text-amber-300 font-black text-xs tracking-wider">RERA</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base font-bold text-foreground leading-tight">
                        RERA verification <span className="text-red-400">*</span>
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Required for every UAE-licensed broker. Your RERA QR code and registration number appear on every PDF report you generate, so clients can verify you directly with the Real Estate Regulatory Agency.
                      </p>
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rera_number">RERA / BRN number <span className="text-red-400">*</span></Label>
                      <Input
                        id="rera_number"
                        value={formData.rera_number}
                        onChange={(e) => handleChange('rera_number', e.target.value)}
                        placeholder="e.g. 12345"
                        className={`glass-input h-11 ${errors.rera_number ? 'border-destructive' : ''}`}
                      />
                      {errors.rera_number && <p className="text-xs text-destructive">{errors.rera_number}</p>}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rera_qr">RERA QR code <span className="text-red-400">*</span></Label>
                      <div className="flex items-center gap-3">
                        {reraQrPreview && (
                          <img
                            src={reraQrPreview}
                            alt="RERA QR preview"
                            className="w-12 h-12 rounded-lg object-contain bg-white border border-white/10"
                          />
                        )}
                        <label className="flex-1 cursor-pointer">
                          <input
                            id="rera_qr"
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={(e) => handleReraQrPick(e.target.files?.[0] ?? null)}
                            className="sr-only"
                          />
                          <div className={`glass-input h-11 flex items-center justify-center gap-2 text-xs cursor-pointer hover:bg-white/[0.04] transition-colors ${errors.rera_qr_url ? 'border-destructive' : ''}`}>
                            {reraQrFile ? `Change · ${reraQrFile.name.slice(0, 24)}` : 'Choose image…'}
                          </div>
                        </label>
                      </div>
                      {errors.rera_qr_url && <p className="text-xs text-destructive">{errors.rera_qr_url}</p>}
                      {reraVerifying && (
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Verifying QR…
                        </div>
                      )}
                      {!reraVerifying && reraQrCheck && (() => {
                        const m = reraQrCheckMessage(reraQrCheck);
                        const cls = m.tone === 'ok'
                          ? 'border-emerald-400/40 bg-emerald-400/[0.06] text-emerald-300'
                          : 'border-red-400/40 bg-red-400/[0.06] text-red-300';
                        return (
                          <div className={`rounded-lg border px-3 py-2 text-[11px] ${cls}`}>
                            <p className="font-bold">{m.line}</p>
                            {m.detail && <p className="opacity-80 mt-0.5">{m.detail}</p>}
                          </div>
                        );
                      })()}
                      <p className="text-[10px] text-muted-foreground">PNG / JPEG / WebP, square, ≤ 5 MB. The QR must link to dubailand.gov.ae.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Workspace URL */}
            {step === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="mb-8">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Globe className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Workspace URL</h2>
                  <p className="text-muted-foreground">This will be your branded link for clients.</p>
                </div>

                <div className="space-y-3">
                  <Label>Choose your URL slug</Label>
                  <div className="flex items-center shadow-sm">
                    <div className="h-12 px-4 flex items-center bg-muted/50 border border-r-0 border-border rounded-l-md text-sm text-muted-foreground font-mono font-medium">
                      realsight.app/a/
                    </div>
                    <Input
                      value={formData.subdomain}
                      onChange={(e) => handleChange('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="acme"
                      className={`glass-input h-12 flex-1 rounded-l-none border-l-0 focus-visible:z-10 ${errors.subdomain ? 'border-destructive' : ''}`}
                      autoFocus
                    />
                  </div>
                  {errors.subdomain ? (
                    <p className="text-sm text-destructive">{errors.subdomain}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">This is your branded workspace URL — share it directly with investors. Custom domains coming later.</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Concierge */}
            {step === 3 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="mb-8">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">AI Concierge</h2>
                  <p className="text-muted-foreground">Set up your 24/7 AI virtual assistant.</p>
                </div>

                <div className="space-y-3">
                  <Label>Concierge Name</Label>
                  <Input
                    value={formData.concierge_name}
                    onChange={(e) => handleChange('concierge_name', e.target.value)}
                    placeholder="E.g. Alex"
                    className={`glass-input h-12 ${errors.concierge_name ? 'border-destructive' : ''}`}
                    autoFocus
                  />
                  {errors.concierge_name && <p className="text-sm text-destructive">{errors.concierge_name}</p>}
                </div>

                <div className="space-y-3 pt-4">
                  <Label>Communication Tone</Label>
                  <RadioGroup
                    value={formData.concierge_tone}
                    onValueChange={(v) => handleChange('concierge_tone', v)}
                    className="grid gap-3"
                  >
                    {TONE_PRESETS.map((t) => (
                      <div key={t.id} className="relative flex items-center p-4 border border-border/50 bg-muted/20 rounded-xl cursor-pointer hover:border-border transition-colors">
                        <RadioGroupItem value={t.id} id={t.id} className="absolute left-4 top-1/2 -translate-y-1/2" />
                        <div className="pl-8">
                          <Label htmlFor={t.id} className="font-semibold cursor-pointer">{t.label}</Label>
                          <p className="text-sm text-muted-foreground mt-0.5">{t.desc}</p>
                        </div>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              </div>
            )}

            {/* Step 4: Client Experience */}
            {step === 4 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="mb-8">
                  <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <Send className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Client Experience</h2>
                  <p className="text-muted-foreground">What your clients see when they log in.</p>
                </div>

                <div className="space-y-3">
                  <Label>Workspace Greeting</Label>
                  <Textarea
                    value={formData.welcome_message}
                    onChange={(e) => handleChange('welcome_message', e.target.value)}
                    placeholder="Welcome to your private lounge..."
                    className={`glass-input min-h-[120px] resize-none ${errors.welcome_message ? 'border-destructive' : ''}`}
                    autoFocus
                  />
                  {errors.welcome_message ? (
                    <p className="text-sm text-destructive">{errors.welcome_message}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Appears at the top of the investor dashboard.</p>
                  )}
                </div>
              </div>
            )}

            {/* Step 5: Review */}
            {step === 5 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                <div className="mb-4 text-center">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/20">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">Ready to Launch</h2>
                  <p className="text-muted-foreground mt-1">Review your workspace configuration.</p>
                </div>

                <div className="bg-muted/30 border border-border/50 rounded-xl p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-sm text-muted-foreground">Agency Name</span>
                    <span className="text-sm font-medium col-span-2 text-right">{formData.broker_name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-sm text-muted-foreground">URL</span>
                    <span className="text-sm font-medium col-span-2 text-right">realsight.app/a/{formData.subdomain}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-sm text-muted-foreground">Theme</span>
                    <span className="text-sm font-medium col-span-2 text-right flex items-center justify-end gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: formData.color }} />
                      {BRAND_PRESETS.find(p => p.color === formData.color)?.name}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <span className="text-sm text-muted-foreground">Concierge</span>
                    <span className="text-sm font-medium col-span-2 text-right">{formData.concierge_name} ({formData.concierge_tone})</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-border">
              {step > 1 ? (
                <Button variant="ghost" onClick={handleBack} disabled={loading} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              ) : (
                <div /> // Spacer
              )}

              {step < 5 ? (
                <Button onClick={handleNext} className="bg-foreground text-background hover:bg-foreground/90 font-semibold px-8 shadow-md">
                  Continue
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button onClick={handleLaunch} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 shadow-lg shadow-primary/20">
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Launching...</>
                  ) : (
                    'Launch Workspace'
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
