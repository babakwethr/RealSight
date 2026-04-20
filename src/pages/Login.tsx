import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, ArrowLeft, ShieldCheck, Briefcase, User, TrendingUp, BarChart3, FileText, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignupRole = 'investor' | 'advisor';

// Premium auth background — cinematic dark with ambient glow
const Background = () => (
  <div className="fixed inset-0 z-0 pointer-events-none" style={{ background: '#0B1120' }}>
    <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30"
      style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.4) 0%, transparent 70%)' }} />
    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
      style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.4) 0%, transparent 70%)' }} />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[150px] opacity-10"
      style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.5) 0%, transparent 60%)' }} />
    {/* Subtle grid */}
    <div className="absolute inset-0 opacity-[0.03]"
      style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
  </div>
);

// Google OAuth handler
const handleGoogleAuth = async () => {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
};

// Google icon SVG
const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function Login() {
  const location = useLocation();
  const params = new URLSearchParams(location.search);

  // Read URL params: mode=signup opens signup, role=advisor preselects advisor
  const [isLogin, setIsLogin] = useState(params.get('mode') !== 'signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [signupComplete, setSignupComplete] = useState(false);

  // Role selection for signup
  const [signupRole, setSignupRole] = useState<SignupRole>(
    params.get('role') === 'advisor' ? 'advisor' : 'investor'
  );

  // Sync isLogin and signupRole whenever the URL search params change
  // (handles in-app navigation via <Link> where useState initializer won't re-run)
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (p.get('mode') === 'signup') {
      setIsLogin(false);
    }
    if (p.get('role') === 'advisor') {
      setSignupRole('advisor');
    }
  }, [location.search]);

  // MFA step
  const [otpCode, setOtpCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);
  const otpRef = useRef<HTMLInputElement>(null);

  const { user, signIn, signUp, loading: authLoading, mfaRequired, verifyMfa } = useAuth();
  const { needsOnboarding, isAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();

  const from = location.state?.from?.pathname || '/dashboard';
  const selectedPlan = params.get('plan');

  // Force logout when ?logout=true is in the URL
  useEffect(() => {
    if (params.get('logout') === 'true') {
      supabase.auth.signOut().then(() => {
        window.location.href = '/login';
      });
    }
  }, []);

  // Redirect if already logged in - role-based routing
  useEffect(() => {
    if (user && !authLoading && !roleLoading && !mfaRequired) {
      if (needsOnboarding) {
        navigate('/onboarding', { replace: true });
      } else if (isAdmin) {
        navigate('/admin/investors', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    }
  }, [user, authLoading, roleLoading, needsOnboarding, isAdmin, mfaRequired, navigate, from]);

  // Focus OTP input when MFA step appears
  useEffect(() => {
    if (mfaRequired) {
      setTimeout(() => otpRef.current?.focus(), 100);
    }
  }, [mfaRequired]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error('Enter your email address');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await supabase.functions.invoke('send-password-reset', {
        body: { email: forgotEmail },
      });
      if (res.error) throw res.error;
      toast.success('If an account exists with that email, a reset link has been sent');
    } catch (err: any) {
      toast.success('If an account exists with that email, a reset link has been sent');
    } finally {
      setForgotLoading(false);
      setForgotMode(false);
      setForgotEmail('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      loginSchema.parse({ email, password });

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('Invalid email or password');
          } else if (error.message.includes('Email not confirmed')) {
            toast.error('Please verify your email before signing in. Check your inbox for a confirmation link.');
          } else {
            toast.error(error.message);
          }
        } else if (!mfaRequired) {
          toast.success('Welcome back!');
        }
      } else {
        if (!fullName.trim()) {
          toast.error('Please enter your full name');
          setLoading(false);
          return;
        }
        const { error } = await signUp(email, password, fullName, signupRole);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('This email is already registered. Please sign in.');
          } else {
            toast.error(error.message);
          }
        } else {
          setSignupComplete(true);
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      toast.error('Please enter the 6-digit code from your authenticator app');
      return;
    }
    setMfaLoading(true);
    try {
      const { error } = await verifyMfa(otpCode);
      if (error) {
        toast.error('Invalid code. Please try again.');
        setOtpCode('');
        otpRef.current?.focus();
      } else {
        toast.success('Welcome back!');
      }
    } finally {
      setMfaLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <Background />
        <Loader2 className="h-8 w-8 animate-spin text-primary relative z-10" />
      </div>
    );
  }

  // Post-signup confirmation screen
  if (signupComplete && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <Background />
        <div className="relative w-full max-w-md z-10">
          <div className="flex items-center justify-center mb-8 animate-fade-in">
            <Logo variant="white" height="h-16" showTagline={true} />
          </div>
          <div className="glass-panel p-8 animate-slide-up text-center">
            <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center mx-auto mb-4">
              <ShieldCheck className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Check Your Email</h2>
            <p className="text-muted-foreground text-sm mb-6">
              We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              <br />Click the link to activate your account.
            </p>
            <button
              type="button"
              onClick={() => { setSignupComplete(false); setIsLogin(true); }}
              className="text-sm text-primary hover:underline"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MFA Challenge Step
  if (mfaRequired) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <Background />
        <div className="relative w-full max-w-md z-10">
          <div className="flex items-center justify-center mb-8 animate-fade-in">
            <Logo variant="white" height="h-16" showTagline={true} />
          </div>
          <div className="glass-panel p-8 animate-slide-up">
            <div className="flex flex-col items-center mb-6 gap-3">
              <div className="h-14 w-14 rounded-full bg-primary/15 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-foreground">Two-Factor Authentication</h2>
                <p className="text-muted-foreground text-sm mt-1">
                  Enter the 6-digit code from your authenticator app
                </p>
              </div>
            </div>

            <form onSubmit={handleMfaVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp" className="text-foreground/80">Authentication Code</Label>
                <Input
                  id="otp"
                  ref={otpRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="glass-input text-center text-2xl tracking-[0.5em] font-mono"
                  autoComplete="one-time-code"
                />
              </div>

              <Button
                type="submit"
                disabled={mfaLoading || otpCode.length !== 6}
                className="w-full bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold accent-glow"
              >
                {mfaLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Verify & Sign In
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Open Google Authenticator, Authy, or 1Password to get your code
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Forgot Password Panel
  if (forgotMode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <Background />
        <div className="relative w-full max-w-md z-10">
          <div className="flex items-center justify-center mb-8 animate-fade-in">
            <Logo variant="white" height="h-16" showTagline={true} />
          </div>
          <div className="glass-panel p-8 animate-slide-up">
            <div className="mb-6">
              <h2 className="text-2xl font-semibold text-foreground">Reset Password</h2>
              <p className="text-muted-foreground text-sm mt-1">
                Enter your email and we'll send you a reset link
              </p>
            </div>
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgotEmail" className="text-foreground/80">Email</Label>
                <Input
                  id="forgotEmail"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoFocus
                  className="glass-input"
                />
              </div>
              <Button
                type="submit"
                disabled={forgotLoading}
                className="w-full bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold accent-glow"
              >
                {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Reset Link
              </Button>
            </form>
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => { setForgotMode(false); setForgotEmail(''); }}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Login / Sign Up — redesigned per Linear DESIGN.md + CI
  return (
    <div className="min-h-screen flex relative" style={{ background: '#0B1120' }}>
      <Background />

      {/* Back to home */}
      <Link to="/" className="fixed top-5 left-5 z-20 flex items-center gap-1.5 text-white/40 hover:text-white/70 transition-colors text-sm">
        <ArrowLeft className="h-4 w-4" />
        <span>Back</span>
      </Link>

      {/* Left panel — compact, no justify-between gap */}
      <div className="hidden lg:flex flex-col w-1/2 p-10 relative z-10 gap-8">
        <Logo variant="white" className="h-6 w-auto max-w-[140px]" />

        <div className="flex-1 flex flex-col justify-center">
          <h1 className="text-4xl font-black text-white leading-[1.1] mb-4" style={{ letterSpacing: '-0.03em' }}>
            Dubai real estate<br />
            <span className="gradient-heading">intelligence</span><br />
            at your fingertips.
          </h1>
          <p className="text-white/50 text-sm mb-8 leading-relaxed">
            Real DLD data. AI-powered analysis.<br />
            Professional reports in seconds.
          </p>
          <div className="space-y-3">
            {[
              { icon: BarChart3, text: 'Live Dubai market data from DLD', color: 'text-primary' },
              { icon: FileText, text: 'AI investment reports — download as PDF', color: 'text-blue-400' },
              { icon: TrendingUp, text: 'Deal Analyzer with yield scenarios', color: 'text-purple-400' },
              { icon: Zap, text: 'Market Score — know when to buy', color: 'text-amber-400' },
            ].map(({ icon: Icon, text, color }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/[0.08] flex items-center justify-center shrink-0">
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <span className="text-white/60 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/25 text-xs">Trusted by Dubai real estate investors and advisers.</p>
      </div>

      {/* Right panel — auth form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <Logo variant="white" className="h-7 w-auto" />
          </div>

          {/* Card */}
          <div className="rounded-2xl backdrop-blur-md bg-white/[0.05] border border-white/[0.10] p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_24px_80px_rgba(0,0,0,0.5)]">
            {/* Headline */}
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white mb-1" style={{ letterSpacing: '-0.02em' }}>
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-white/40 text-sm">
                {isLogin
                  ? 'Sign in to your RealSight dashboard'
                  : !isLogin && signupRole === 'investor'
                    ? 'Free account — no credit card needed'
                    : 'Start your 30-day free trial'}
              </p>
            </div>

            {/* Google OAuth */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-white text-gray-800 text-sm font-bold hover:bg-gray-50 transition-colors mb-5 shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px bg-white/[0.08]" />
              <span className="text-white/25 text-xs font-medium">or with email</span>
              <div className="flex-1 h-px bg-white/[0.08]" />
            </div>

            {/* Role selector (signup only) */}
            {!isLogin && (
              <div className="mb-5">
                <Label className="text-white/50 text-xs font-medium mb-2 block uppercase tracking-wider">
                  I am signing up as
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { role: 'investor', icon: User, label: 'Investor', sub: 'Track my portfolio' },
                    { role: 'advisor', icon: Briefcase, label: 'Adviser', sub: 'Manage clients' },
                  ] as const).map(({ role, icon: Icon, label, sub }) => (
                    <button
                      key={role}
                      type="button"
                      onClick={() => setSignupRole(role)}
                      className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                        signupRole === role
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/[0.14] hover:text-white/60'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-bold">{label}</span>
                      <span className="text-[10px] opacity-70">{sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div>
                  <Label className="text-white/50 text-xs font-medium mb-1.5 block">Full Name</Label>
                  <Input
                    type="text"
                    value={fullName}
                    onChange={e => setFullName(e.target.value)}
                    placeholder="Your full name"
                    required
                    className="bg-white/[0.05] border-white/[0.10] text-white placeholder:text-white/25 focus:border-primary focus:bg-white/[0.07] rounded-xl h-11"
                  />
                </div>
              )}
              <div>
                <Label className="text-white/50 text-xs font-medium mb-1.5 block">Email</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-white/[0.05] border-white/[0.10] text-white placeholder:text-white/25 focus:border-primary focus:bg-white/[0.07] rounded-xl h-11"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <Label className="text-white/50 text-xs font-medium">Password</Label>
                  {isLogin && (
                    <button type="button" onClick={() => { setForgotEmail(email); setForgotMode(true); }}
                      className="text-xs text-white/35 hover:text-primary transition-colors">
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    minLength={8}
                    className="bg-white/[0.05] border-white/[0.10] text-white placeholder:text-white/25 focus:border-primary focus:bg-white/[0.07] rounded-xl h-11 pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-black hover:bg-primary/90 transition-all shadow-[0_4px_20px_rgba(34,197,94,0.3)] disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isLogin ? 'Sign In' : `Create Account${signupRole === 'advisor' ? ' — Free Trial' : ' — Free'}`}
              </button>
            </form>

            {/* Switch mode */}
            <div className="mt-5 text-center">
              <button type="button" onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-white/35 hover:text-white/60 transition-colors">
                {isLogin ? "Don't have an account? " : 'Already have an account? '}
                <span className="text-primary font-semibold">{isLogin ? 'Sign up free' : 'Sign in'}</span>
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-white/30 mt-5">
            By continuing, you agree to our{' '}
            <Link to="/terms" className="text-white/50 hover:text-white underline underline-offset-2">Terms of Service</Link>
            {' '}and{' '}
            <Link to="/privacy" className="text-white/50 hover:text-white underline underline-offset-2">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}
