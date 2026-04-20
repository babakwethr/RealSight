import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, Phone, Globe, Languages, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { Logo } from '@/components/Logo';
import { useTenant } from '@/hooks/useTenant';

// Investor Schema
const investorSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100, 'Name must be under 100 characters'),
  phone: z.string().trim().min(1, 'Phone number is required').max(50, 'Phone must be under 50 characters'),
  country: z.string().max(100, 'Country must be under 100 characters').optional(),
  preferred_language: z.string().max(50, 'Language must be under 50 characters').optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional().or(z.literal('')),
});

// Advisor/Broker Schema
const brokerSchema = z.object({
  broker_name: z.string().trim().min(2, 'Agency name is required'),
  subdomain: z.string().trim().min(3, 'Subdomain must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens allowed'),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Must be a valid hex color'),
});

const languages = [
  'English',
  'Arabic',
  'Spanish',
  'French',
  'Farsi',
  'Russian',
];

const countries = [
  'United Arab Emirates',
  'Saudi Arabia',
  'United States',
  'United Kingdom',
  'Germany',
  'France',
  'Spain',
  'Netherlands',
  'Singapore',
  'India',
  'Pakistan',
  'Canada',
  'Australia',
  'Switzerland',
  'Turkey',
  'Egypt',
  'Kuwait',
  'Bahrain',
  'Qatar',
  'Oman',
  'Jordan',
  'Lebanon',
  'Iran',
  'Russia',
  'China',
  'Other',
];

export default function Onboarding() {
  const { user, loading: authLoading } = useAuth();
  const { tenant } = useTenant();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(true);

  // Determine which form to show based on user metadata, NOT domain
  const signupRole = user?.user_metadata?.signup_role || 'investor';
  const isAdvisorFlow = signupRole === 'advisor';

  // Investor Form State
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    country: '',
    preferred_language: '',
    password: '',
  });

  // Broker Form State
  const [brokerData, setBrokerData] = useState({
    broker_name: '',
    subdomain: '',
    color: '#caaf6c',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [isInviteFlow, setIsInviteFlow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if this is an invitation flow (from URL params)
    const params = new URLSearchParams(window.location.search);
    if (params.get('invite') === 'true' || window.location.hash.includes('invite')) {
      setIsInviteFlow(true);
    }
  }, []);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setCheckingStatus(false);
        return;
      }

      try {
        // Check if user already has complete profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, country, preferred_language, tenant_id')
          .eq('user_id', user.id)
          .maybeSingle();

        const { data: investor } = await supabase
          .from('investors')
          .select('phone, country, preferred_language')
          .eq('user_id', user.id)
          .maybeSingle();

        // For advisors: complete means they have a real tenant (not the default UUID)
        // For investors: complete means they have name + phone
        const isComplete = (() => {
          if (!profile?.full_name) return false;
          if (isAdvisorFlow) {
            return profile.tenant_id && profile.tenant_id !== '00000000-0000-0000-0000-000000000000';
          }
          if (!investor?.phone) return false;
          return investor.phone !== '0000000000';
        })();

        if (isComplete) {
          navigate(isAdvisorFlow ? '/admin/investors' : '/dashboard', { replace: true });
          return;
        }

        // Pre-fill with existing data
        setFormData({
          full_name: profile?.full_name || user.user_metadata?.full_name || '',
          phone: investor?.phone && investor.phone !== '0000000000' ? investor.phone : '',
          country: profile?.country || investor?.country || '',
          preferred_language: profile?.preferred_language || investor?.preferred_language || '',
          password: '',
        });

        // Pre-fill broker name from user name if advisor flow
        if (isAdvisorFlow) {
          setBrokerData(prev => ({
            ...prev,
            broker_name: prev.broker_name || user.user_metadata?.full_name || '',
          }));
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };

    if (!authLoading) {
      checkOnboardingStatus();
    }
  }, [user, authLoading, navigate, isAdvisorFlow]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleBrokerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setErrors({});

    try {
      const validated = brokerSchema.parse(brokerData);

      // Use server-side RPC to create tenant, update profile, and assign admin role
      // This bypasses RLS restrictions via SECURITY DEFINER
      const { data: rpcResult, error: rpcError } = await supabase.rpc('setup_advisor_platform', {
        p_broker_name: validated.broker_name,
        p_subdomain: validated.subdomain,
        p_brand_color: validated.color,
      });

      if (rpcError) throw rpcError;
      if (rpcResult && !rpcResult.success) throw new Error(rpcResult.error);

      // Update user metadata with tenant_id
      await supabase.auth.updateUser({
        data: {
          tenant_id: rpcResult.tenant_id,
          full_name: validated.broker_name,
        }
      });

      toast.success('Advisor lounge created successfully!');

      // Full page reload to reset useUserRole hook with fresh data
      window.location.href = '/admin/investors';

    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error((err as any)?.message || 'Failed to create advisor lounge.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvestorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setErrors({});

    try {
      const validated = investorSchema.parse(formData);

      const targetTenantId = tenant?.id || '00000000-0000-0000-0000-000000000000';

      // Save profile and investor via RPC (uses auth.uid() server-side)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('save_onboarding_profile', {
        p_full_name: validated.full_name,
        p_phone: validated.phone,
        p_country: validated.country || null,
        p_preferred_language: validated.preferred_language || null,
        p_tenant_id: targetTenantId,
      });

      if (rpcError) throw rpcError;
      if (rpcResult && !rpcResult.success) throw new Error(rpcResult.error);

      if (isInviteFlow && validated.password) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: validated.password,
        });
        if (passwordError) throw passwordError;
      }

      toast.success('Profile completed successfully!');
      // Full page reload to reset useUserRole hook with fresh data
      window.location.href = '/dashboard';
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) fieldErrors[e.path[0] as string] = e.message;
        });
        setErrors(fieldErrors);
      } else {
        toast.error(`Failed to save profile: ${(err as any)?.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (authLoading || checkingStatus) {
    return (
      <div className="min-h-screen flex items-center justify-center relative bg-background">
        <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-primary/5" />
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative bg-background">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-primary/5" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3 pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
      </div>

      <div className="relative w-full max-w-md z-10">
        {/* Logo */}
        <div className="flex items-center justify-center mb-10 animate-fade-in">
          <Logo variant="white" height="h-12" />
        </div>
        {/* Onboarding Card */}
        <div className="glass-panel p-8 animate-slide-up">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground">
              {isAdvisorFlow ? 'Setup Your Advisor Platform' : 'Complete Your Profile'}
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              {isAdvisorFlow
                ? 'Create your white-label AI Investor Lounge for your clients.'
                : 'Please provide a few details to get started.'}
            </p>
          </div>

          {isAdvisorFlow ? (
            <form onSubmit={handleBrokerSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="broker_name" className="text-foreground/80">Broker/Agency Name *</Label>
                <Input
                  id="broker_name"
                  value={brokerData.broker_name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setBrokerData(prev => ({
                      ...prev,
                      broker_name: name,
                      subdomain: prev.subdomain || name.toLowerCase().replace(/[^a-z0-9]/g, '')
                    }));
                  }}
                  placeholder="e.g. Prestige Properties"
                  className={`glass-input ${errors.broker_name ? 'border-destructive' : ''}`}
                />
                {errors.broker_name && <p className="text-sm text-destructive">{errors.broker_name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="subdomain" className="text-foreground/80">Choose Subdomain *</Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain"
                    value={brokerData.subdomain}
                    onChange={(e) => setBrokerData(prev => ({ ...prev, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                    placeholder="prestige"
                    className={`glass-input flex-1 rounded-r-none border-r-0 ${errors.subdomain ? 'border-destructive' : ''}`}
                  />
                  <div className="h-10 px-3 flex items-center bg-card border border-l-0 border-white/10 rounded-r-md text-sm text-zinc-400 font-mono">
                    .realsight.app
                  </div>
                </div>
                {errors.subdomain ? (
                  <p className="text-sm text-destructive">{errors.subdomain}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">This is where your clients will log in.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="color" className="text-foreground/80">Brand Accent Color</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="color"
                    type="color"
                    value={brokerData.color}
                    onChange={(e) => setBrokerData(prev => ({ ...prev, color: e.target.value }))}
                    className="h-10 w-20 p-1 glass-input cursor-pointer"
                  />
                  <Input
                    value={brokerData.color}
                    onChange={(e) => setBrokerData(prev => ({ ...prev, color: e.target.value }))}
                    placeholder="#caaf6c"
                    className="glass-input font-mono uppercase"
                  />
                </div>
                {errors.color && <p className="text-sm text-destructive">{errors.color}</p>}
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-accent-green-dark text-black font-semibold py-6 mt-4 transition-all">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating Platform...</> : 'Launch Advisor Platform'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleInvestorSubmit} className="space-y-5">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-foreground/80 flex items-center gap-2">
                  <User className="h-4 w-4" /> Full Name *
                </Label>
                <Input
                  id="full_name"
                  value={formData.full_name}
                  onChange={(e) => handleChange('full_name', e.target.value)}
                  placeholder="Your full name"
                  className={`glass-input ${errors.full_name ? 'border-destructive' : ''}`}
                />
                {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-foreground/80 flex items-center gap-2">
                  <Phone className="h-4 w-4" /> Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  placeholder="+1 555 123 4567"
                  className={`glass-input ${errors.phone ? 'border-destructive' : ''}`}
                />
                {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label className="text-foreground/80 flex items-center gap-2">
                  <Globe className="h-4 w-4" /> Country
                </Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => handleChange('country', value)}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Language */}
              <div className="space-y-2">
                <Label className="text-foreground/80 flex items-center gap-2">
                  <Languages className="h-4 w-4" /> Preferred Language
                </Label>
                <Select
                  value={formData.preferred_language}
                  onValueChange={(value) => handleChange('preferred_language', value)}
                >
                  <SelectTrigger className="glass-input">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Password (only for invite flow) */}
              {isInviteFlow && (
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-foreground/80 flex items-center gap-2">
                    <Lock className="h-4 w-4" /> Create Password *
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleChange('password', e.target.value)}
                      placeholder="Create a secure password"
                      className={`glass-input pr-10 ${errors.password ? 'border-destructive' : ''}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password ? (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground">Minimum 8 characters</p>
                  )}
                </div>
              )}

              {/* Submit */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold accent-glow py-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Continue to Dashboard'
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
