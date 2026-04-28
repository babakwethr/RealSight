import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useUserRole } from '@/hooks/useUserRole';
import { getUpsellTarget, isAdviserUser } from '@/lib/upsell';
import { User, Mail, Phone, Shield, Bell, LogOut, Globe, Languages, Loader2, CheckCircle2, ShieldCheck, ShieldOff, Copy, Eye, EyeOff, Zap, ArrowRight, CreditCard, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { ReferAFriendCard } from '@/components/ReferAFriendCard';
import { FounderBadge } from '@/components/FounderBadge';

const profileSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(100),
  phone: z.string().trim().max(50).optional(),
  country: z.string().max(100).optional(),
  preferred_language: z.string().max(50).optional(),
  notes: z.string().max(2000).optional(),
});

const languages = ['English', 'Arabic', 'Farsi', 'Russian', 'French', 'Hindi', 'Chinese'];

type MfaStatus = 'loading' | 'disabled' | 'enrolling' | 'verifying' | 'enabled';

export default function Account() {
  const { user, signOut } = useAuth();
  const { planName, plan, isPro, isAdviser } = useSubscription();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    country: '',
    preferred_language: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [showNewPassword, setShowNewPassword] = useState(false);

  // 2FA state
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>('loading');
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      try {
        const [profileRes, investorRes] = await Promise.all([
          supabase.from('profiles').select('full_name, country, preferred_language').eq('user_id', user.id).maybeSingle(),
          supabase.from('investors').select('phone, country, preferred_language, notes').eq('user_id', user.id).maybeSingle(),
        ]);
        setFormData({
          full_name: profileRes.data?.full_name || '',
          phone: investorRes.data?.phone || '',
          country: profileRes.data?.country || investorRes.data?.country || '',
          preferred_language: profileRes.data?.preferred_language || investorRes.data?.preferred_language || '',
          notes: investorRes.data?.notes || '',
        });
      } catch (error) {
        console.error('Error fetching profile:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [user]);

  // Check current MFA status on mount
  useEffect(() => {
    const checkMfaStatus = async () => {
      try {
        const { data: factors } = await supabase.auth.mfa.listFactors();
        const verified = factors?.totp?.find(f => f.status === 'verified');
        if (verified) {
          setMfaFactorId(verified.id);
          setMfaStatus('enabled');
        } else {
          setMfaStatus('disabled');
        }
      } catch {
        setMfaStatus('disabled');
      }
    };
    checkMfaStatus();
  }, []);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setErrors({});
    try {
      const validated = profileSchema.parse(formData);
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ full_name: validated.full_name, country: validated.country || null, preferred_language: validated.preferred_language || null })
        .eq('user_id', user.id);
      if (profileError) throw profileError;

      const { error: investorError } = await supabase
        .from('investors')
        .update({ name: validated.full_name, phone: validated.phone || null, country: validated.country || null, preferred_language: validated.preferred_language || null, notes: validated.notes || null })
        .eq('user_id', user.id);
      if (investorError) throw investorError;

      // Also update Supabase auth user metadata so the name reflects everywhere
      await supabase.auth.updateUser({ data: { full_name: validated.full_name } });

      // Invalidate cached profile name so dashboard updates immediately
      queryClient.invalidateQueries({ queryKey: ['profile-name'] });

      toast.success('Profile updated successfully');
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {};
        err.errors.forEach((e) => { if (e.path[0]) fieldErrors[e.path[0] as string] = e.message; });
        setErrors(fieldErrors);
      } else {
        toast.error('Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    const errs: Record<string, string> = {};
    if (!passwordData.newPassword || passwordData.newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters';
    if (passwordData.newPassword !== passwordData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (Object.keys(errs).length > 0) { setPasswordErrors(errs); return; }

    setPasswordSaving(true);
    setPasswordErrors({});
    try {
      const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
      if (error) throw error;
      toast.success('Password updated successfully!');
      setShowPasswordForm(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

  // ── 2FA Handlers ─────────────────────────────────────────────────────────────

  const handleEnroll2FA = async () => {
    setMfaLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Realsight' });
      if (error) throw error;
      setQrCodeUrl(data.totp.qr_code);
      setTotpSecret(data.totp.secret);
      setMfaFactorId(data.id);
      setMfaStatus('enrolling');
    } catch (error: any) {
      toast.error(error.message || 'Failed to start 2FA setup');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!mfaFactorId || otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code from your authenticator app');
      return;
    }
    setMfaLoading(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: mfaFactorId });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code: otpCode,
      });
      if (verifyError) throw verifyError;

      setMfaStatus('enabled');
      setQrCodeUrl(null);
      setTotpSecret(null);
      setOtpCode('');
      toast.success('Two-factor authentication enabled! 🔐');
    } catch (error: any) {
      toast.error('Invalid code. Please try again.');
      setOtpCode('');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (!mfaFactorId) return;
    const confirmed = window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.');
    if (!confirmed) return;

    setMfaLoading(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId: mfaFactorId });
      if (error) throw error;
      setMfaStatus('disabled');
      setMfaFactorId(null);
      toast.success('Two-factor authentication disabled');
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA');
    } finally {
      setMfaLoading(false);
    }
  };

  const handleCancelEnroll = async () => {
    // Unenroll the unverified factor
    if (mfaFactorId) {
      await supabase.auth.mfa.unenroll({ factorId: mfaFactorId }).catch(() => { });
    }
    setMfaStatus('disabled');
    setQrCodeUrl(null);
    setTotpSecret(null);
    setOtpCode('');
    setMfaFactorId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-2xl">
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-foreground">My Account</h1>
          <FounderBadge variant="pill" />
        </div>
        <p className="text-muted-foreground mt-1">Manage my profile and preferences</p>
      </div>

      {/* Founder welcome (only shows for the first 1,000 signups) */}
      <FounderBadge variant="banner" />

      {/* Refer-a-friend — both sides get 1 free month (LAUNCH_PLAN.md §14 step 9) */}
      <ReferAFriendCard variant="card" />

      {/* Profile Section */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-primary/20 flex items-center justify-center">
            <User className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {formData.full_name || user?.email?.split('@')[0]}
            </h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="flex items-center gap-2"><User className="h-4 w-4" /> Full Name *</Label>
              <Input id="fullName" value={formData.full_name} onChange={(e) => handleChange('full_name', e.target.value)} className={`bg-input/50 border-border ${errors.full_name ? 'border-destructive' : ''}`} />
              {errors.full_name && <p className="text-sm text-destructive">{errors.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2"><Mail className="h-4 w-4" /> Email</Label>
              <Input id="email" defaultValue={user?.email || ''} disabled className="bg-input/50 border-border opacity-60" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2"><Phone className="h-4 w-4" /> Phone Number</Label>
              <Input id="phone" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} placeholder="+971 50 123 4567" className="bg-input/50 border-border" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country" className="flex items-center gap-2"><Globe className="h-4 w-4" /> Country</Label>
              <Input id="country" value={formData.country} onChange={(e) => handleChange('country', e.target.value)} placeholder="e.g. United Arab Emirates" className="bg-input/50 border-border" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Languages className="h-4 w-4" /> Preferred Language</Label>
            <Select value={formData.preferred_language} onValueChange={(value) => handleChange('preferred_language', value)}>
              <SelectTrigger className="bg-input/50 border-border"><SelectValue placeholder="Select language" /></SelectTrigger>
              <SelectContent>
                {languages.map((lang) => <SelectItem key={lang} value={lang}>{lang}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} placeholder="Any additional notes or preferences..." rows={3} className="bg-input/50 border-border resize-none" />
          </div>

          <Button onClick={handleSave} disabled={saving} className="bg-primary hover:bg-accent-green-dark text-primary-foreground">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Email Notifications', desc: 'Receive updates via email' },
            { label: 'Payment Reminders', desc: 'Get notified before due dates' },
            { label: 'Project Updates', desc: 'News about my investments' },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
              <Switch defaultChecked />
            </div>
          ))}
        </div>
      </div>

      {/* Security Section */}
      <div className="glass-panel p-6">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Security</h2>
        </div>

        <div className="space-y-4">
          {/* Change Password */}
          <Button
            variant="outline"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="w-full justify-start border-border text-foreground hover:bg-white/10 hover:text-foreground"
          >
            Change Password
          </Button>

          {showPasswordForm && (
            <div className="space-y-3 p-4 rounded-lg bg-white/5 border border-border">
              <div className="space-y-1">
                <Label htmlFor="newPassword" className="text-sm text-foreground/80">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="At least 8 characters"
                    className="bg-input/50 border-border pr-10"
                  />
                  <button type="button" onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {passwordErrors.newPassword && <p className="text-xs text-destructive">{passwordErrors.newPassword}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="confirmPassword" className="text-sm text-foreground/80">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(p => ({ ...p, confirmPassword: e.target.value }))}
                  placeholder="Repeat new password"
                  className="bg-input/50 border-border"
                />
                {passwordErrors.confirmPassword && <p className="text-xs text-destructive">{passwordErrors.confirmPassword}</p>}
              </div>
              <div className="flex gap-2">
                <Button onClick={handlePasswordChange} disabled={passwordSaving} className="bg-primary hover:bg-accent-green-dark text-primary-foreground" size="sm">
                  {passwordSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Save Password
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setShowPasswordForm(false); setPasswordData({ newPassword: '', confirmPassword: '' }); setPasswordErrors({}); }} className="text-muted-foreground hover:text-foreground hover:bg-white/10">
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Two-Factor Authentication */}
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`h-9 w-9 rounded-full flex items-center justify-center ${mfaStatus === 'enabled' ? 'bg-emerald-500/15' : 'bg-white/5'}`}>
                  {mfaStatus === 'enabled'
                    ? <ShieldCheck className="h-5 w-5 text-emerald-400" />
                    : <Shield className="h-5 w-5 text-muted-foreground" />
                  }
                </div>
                <div>
                  <p className="font-medium text-foreground">Two-Factor Authentication</p>
                  <p className="text-xs text-muted-foreground">
                    {mfaStatus === 'enabled' ? 'Your account is protected with TOTP 2FA' : 'Add an extra layer of security'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {mfaStatus === 'enabled' && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Enabled
                  </Badge>
                )}
                {mfaStatus === 'loading' && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                {mfaStatus === 'disabled' && (
                  <Button size="sm" onClick={handleEnroll2FA} disabled={mfaLoading} className="bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 hover:text-primary">
                    {mfaLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Enable
                  </Button>
                )}
                {mfaStatus === 'enabled' && (
                  <Button size="sm" variant="ghost" onClick={handleDisable2FA} disabled={mfaLoading} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                    {mfaLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ShieldOff className="h-3.5 w-3.5 mr-1" />}
                    Disable
                  </Button>
                )}
              </div>
            </div>

            {/* Enrollment Flow */}
            {(mfaStatus === 'enrolling' || mfaStatus === 'verifying') && qrCodeUrl && (
              <div className="border-t border-border p-4 bg-white/3 space-y-4">
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-foreground">Scan with your authenticator app</p>
                  <p className="text-xs text-muted-foreground">Google Authenticator · Authy · 1Password · Microsoft Authenticator</p>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-xl">
                    <img src={qrCodeUrl} alt="2FA QR Code" className="h-44 w-44" />
                  </div>
                </div>

                {/* Manual secret */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground text-center">Can't scan? Enter this key manually:</p>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-border">
                    <code className={`flex-1 text-xs font-mono text-foreground/80 break-all ${!showSecret ? 'blur-sm select-none' : ''}`}>
                      {totpSecret}
                    </code>
                    <button type="button" onClick={() => setShowSecret(!showSecret)} className="text-muted-foreground hover:text-foreground shrink-0">
                      {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                    {showSecret && (
                      <button type="button" onClick={() => { navigator.clipboard.writeText(totpSecret || ''); toast.success('Secret copied!'); }} className="text-muted-foreground hover:text-foreground shrink-0">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* OTP verification */}
                <div className="space-y-2">
                  <Label className="text-sm text-foreground/80">Enter the 6-digit code to confirm setup</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className="bg-input/50 border-border text-center text-xl tracking-[0.4em] font-mono"
                    autoComplete="one-time-code"
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={handleVerify2FA}
                    disabled={mfaLoading || otpCode.length !== 6}
                    className="flex-1 bg-primary hover:bg-accent-green-dark text-primary-foreground"
                  >
                    {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                    Confirm & Enable 2FA
                  </Button>
                  <Button variant="ghost" onClick={handleCancelEnroll} className="text-muted-foreground hover:text-foreground hover:bg-white/10">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Subscription & Billing ── */}
      <div className="rounded-2xl backdrop-blur-md bg-white/[0.04] border border-white/[0.08] p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Subscription & Billing
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage your plan and payment details</p>
          </div>
        </div>

        {/* Current plan card */}
        <div className={`rounded-xl p-4 mb-4 border ${plan === 'free' ? 'bg-white/[0.03] border-white/[0.08]' : 'bg-primary/[0.08] border-primary/25'}`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className={`h-4 w-4 ${plan === 'free' ? 'text-muted-foreground' : 'text-primary'}`} />
                <span className="text-sm font-black text-foreground">{planName}</span>
                {plan !== 'free' && (
                  <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30 uppercase tracking-wide">
                    Active
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {plan === 'free'
                  ? 'Free forever — upgrade to unlock market intelligence, deal analyzer, heatmap and more'
                  : 'Your plan renews monthly · cancel anytime from the Stripe portal'}
              </p>
            </div>
            {plan !== 'free' && (
              <a href="https://billing.stripe.com/p/login/test_00g" target="_blank" rel="noopener noreferrer"
                className="shrink-0 text-xs font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1 ml-4">
                Manage billing <ArrowRight className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* Upgrade CTA — plan-aware via getUpsellTarget(). Free investor sees
            Investor Pro; free adviser-path sees Adviser Pro; top-tier sees no
            CTA. (28 Apr 2026 — was previously hardcoded "Portfolio Pro · $29".) */}
        {(() => {
          const upsell = getUpsellTarget(
            plan,
            isAdviserUser({ isAdmin, signupRole: user?.user_metadata?.signup_role }),
          );
          if (!upsell) return null;
          const isAdviserUpsell = upsell.targetPlan === 'adviser_pro';
          return (
            <Link
              to="/billing"
              className="flex items-center justify-between gap-3 w-full px-4 py-3 rounded-xl transition-colors"
              style={{
                // Adviser Pro upsell uses amber/gold — premium, eye-catchy on
                // dark cards, paired with dark text for AA contrast.
                background: isAdviserUpsell
                  ? 'linear-gradient(135deg, #FFD15C 0%, #FFB020 50%, #FF8A1F 100%)'
                  : 'hsl(var(--primary))',
                color: isAdviserUpsell ? '#0a0814' : 'hsl(var(--primary-foreground))',
              }}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-black">{upsell.headline}</p>
                    {upsell.promoActive && (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/20 leading-none">
                        -{upsell.discountPct}%
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] opacity-80">
                    {upsell.blurb} · {upsell.promoActive && (
                      <span className="opacity-60 line-through mr-1">{upsell.regularPrice}</span>
                    )}
                    <span className="font-bold">{upsell.price}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold shrink-0">
                30 days free <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })()}

        {/* Plan features summary */}
        {plan !== 'free' && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mb-3">Included in your plan</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                isPro && 'Market Intelligence',
                isPro && 'Dubai Heatmap',
                isPro && 'Deal Analyzer',
                isPro && 'Watchlist & Compare',
                isAdviser && 'Opportunity Signals',
                isAdviser && 'Top Picks',
                isAdviser && 'Global Radar',
                isAdviser && 'Unlimited AI Concierge',
              ].filter(Boolean).map(feature => (
                <div key={feature as string} className="flex items-center gap-1.5 text-xs text-foreground/70">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="glass-panel p-6 border-destructive/30">
        <h2 className="text-lg font-semibold text-destructive mb-4">Danger Zone</h2>
        <Button variant="destructive" onClick={signOut} className="w-full">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
