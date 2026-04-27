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

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved).formData;
    }
    return {
      broker_name: user?.user_metadata?.full_name || '',
      logo_url: '',
      color: BRAND_PRESETS[0].color,
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
    if (step === 1 && formData.broker_name.trim().length < 2) {
      newErrors.broker_name = 'Agency name is required';
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
      
      const { error: updateError } = await supabase
        .from('tenants')
        .update({
            branding_config: {
                colors: { primary: formData.color },
                logo_url: formData.logo_url,
                ai_instructions: aiInstructions,
                welcome_text: formData.welcome_message
            }
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
