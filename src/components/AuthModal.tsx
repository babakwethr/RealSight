/**
 * AuthModal — login/signup as an overlay modal, Flova.ai style.
 * Shows on top of the blurred app content. No page navigation needed.
 * Per DESIGN.md: dark glass card, Linear principles.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Logo } from '@/components/Logo';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { isCapacitorNative, CAPACITOR_OAUTH_REDIRECT } from '@/lib/capacitor';
import { toast } from 'sonner';
import { z } from 'zod';
import {
  Loader2, Eye, EyeOff, X, User, Briefcase, ArrowRight, Sparkles
} from 'lucide-react';

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type SignupRole = 'investor' | 'advisor';

const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const navigate = useNavigate();
  const { user, signIn, signUp } = useAuth();
  const { needsOnboarding, isAdmin } = useUserRole();

  const [isLogin, setIsLogin] = useState(defaultMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [signupComplete, setSignupComplete] = useState(false);
  const [signupRole, setSignupRole] = useState<SignupRole>('investor');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sync with defaultMode prop
  useEffect(() => {
    setIsLogin(defaultMode === 'login');
  }, [defaultMode]);

  // Close on user login
  useEffect(() => {
    if (user) {
      onClose();
      if (needsOnboarding) {
        navigate(isAdmin ? '/admin/setup' : '/onboarding');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleGoogleAuth = async () => {
    // In Capacitor: redirectTo uses the custom URL scheme so iOS routes the
    // callback back to the app after Google auth completes in Safari.
    // On web: standard https redirect.
    const redirectTo = isCapacitorNative()
      ? CAPACITOR_OAUTH_REDIRECT
      : `${window.location.origin}/auth/callback`;

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo },
    });
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) { toast.error('Enter your email address'); return; }
    setForgotLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success('Reset link sent — check your email');
      setForgotMode(false);
    } catch (err: any) {
      toast.error(err.message || 'Could not send reset link');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      loginSchema.parse({ email, password });
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) { toast.error(error.message); }
      } else {
        if (!fullName.trim()) { toast.error('Please enter your full name'); setLoading(false); return; }
        if (password !== confirmPassword) { toast.error('Passwords do not match'); setLoading(false); return; }
        const { error } = await signUp(email, password, fullName, signupRole);
        if (error) {
          if (error.message.includes('already registered')) toast.error('Email already registered — sign in instead');
          else toast.error(error.message);
        } else {
          setSignupComplete(true);
        }
      }
    } catch (err) {
      if (err instanceof z.ZodError) toast.error(err.errors[0].message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    /* Overlay — blurs the background content exactly like Flova */
    <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center sm:p-4">
      {/* Backdrop — subtle blur so the app is still recognisable behind */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal card — bottom sheet on mobile, centered card on desktop */}
      <div className="relative z-10 w-full max-w-[420px] overflow-y-auto
        rounded-t-2xl sm:rounded-2xl
        max-h-[92vh] sm:max-h-[90vh]"
        style={{
          background: 'rgba(15,24,42,0.99)',
          border: '1px solid rgba(255,255,255,0.12)',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)',
        }}>

        {/* Drag handle (mobile) + Close button — always visible at top */}
        <div className="flex items-center justify-between px-6 pt-4 pb-2 sm:pt-4 sm:pb-0">
          {/* Drag handle pill for bottom sheet feel */}
          <div className="sm:hidden w-10 h-1 bg-white/20 rounded-full mx-auto" />
          <button onClick={onClose}
            className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.08] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <Logo variant="white" className="h-6 w-auto max-w-[140px]" />
          </div>

          {signupComplete ? (
            /* Email confirmation screen */
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-xl font-black text-white mb-2">Check your email</h2>
              <p className="text-sm text-white/50 mb-6">
                We sent a confirmation link to <strong className="text-white">{email}</strong>. Click it to activate your account.
              </p>
              <button onClick={onClose}
                className="w-full py-3 rounded-xl bg-white/[0.08] border border-white/[0.12] text-sm font-bold text-white/80 hover:bg-white/[0.12] transition-colors">
                Back to market data
              </button>
            </div>
          ) : forgotMode ? (
            /* Forgot password */
            <div>
              <h2 className="text-xl font-black text-white text-center mb-1">Reset password</h2>
              <p className="text-sm text-white/50 text-center mb-6">We'll send you a reset link</p>
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <Label className="text-white/50 text-xs font-medium mb-1.5 block">Email</Label>
                  <Input value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} type="email"
                    placeholder="you@example.com" required autoFocus
                    className="bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/25 focus:border-primary rounded-xl h-11" />
                </div>
                <button type="submit" disabled={forgotLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-black hover:bg-primary/90 transition-all">
                  {forgotLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Send Reset Link
                </button>
                <button type="button" onClick={() => setForgotMode(false)}
                  className="w-full text-xs text-white/40 hover:text-white/70 transition-colors">
                  Back to sign in
                </button>
              </form>
            </div>
          ) : (
            /* Main auth form */
            <div>
              <h2 className="text-xl font-black text-white text-center mb-1">
                {isLogin ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm text-white/50 text-center mb-5">
                {isLogin ? 'Sign in to your RealSight dashboard' : 'Free account — no credit card needed'}
              </p>

              {/* Role selector FIRST for signup — then Google button below */}
              {!isLogin && (
                <div className="mb-4">
                  <Label className="text-white/50 text-xs font-medium mb-2 block uppercase tracking-wider">I am signing up as</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { role: 'investor', icon: User, label: 'Investor', sub: 'Track my portfolio' },
                      { role: 'advisor', icon: Briefcase, label: 'Adviser', sub: 'Manage clients' },
                    ] as const).map(({ role, icon: Icon, label, sub }) => (
                      <button key={role} type="button" onClick={() => setSignupRole(role)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                          signupRole === role
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-white/[0.08] bg-white/[0.03] text-white/40 hover:border-white/[0.14] hover:text-white/60'
                        }`}>
                        <Icon className="h-4 w-4" />
                        <span className="text-xs font-bold">{label}</span>
                        <span className="text-[9px] opacity-70">{sub}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Google — after role selector for signup, first for login */}
              <button onClick={handleGoogleAuth}
                className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl bg-white text-gray-800 text-sm font-bold hover:bg-gray-50 transition-colors mb-4 shadow-sm">
                <GoogleIcon />
                {isLogin ? 'Continue with Google' : `Sign up with Google as ${signupRole === 'advisor' ? 'Adviser' : 'Investor'}`}
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-white/25 text-xs">or with email</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-3">
                {!isLogin && (
                  <div>
                    <Label className="text-white/50 text-xs font-medium mb-1.5 block">Full Name</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} type="text"
                      placeholder="Your full name" required
                      className="bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/25 focus:border-primary rounded-xl h-11" />
                  </div>
                )}
                <div>
                  <Label className="text-white/50 text-xs font-medium mb-1.5 block">Email</Label>
                  <Input value={email} onChange={e => setEmail(e.target.value)} type="email"
                    placeholder="you@example.com" required
                    className="bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/25 focus:border-primary rounded-xl h-11" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-white/50 text-xs font-medium">Password</Label>
                    {isLogin && (
                      <button type="button" onClick={() => setForgotMode(true)}
                        className="text-xs text-white/35 hover:text-primary transition-colors">
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Input value={password} onChange={e => setPassword(e.target.value)}
                      type={showPassword ? 'text' : 'password'} placeholder="••••••••" required minLength={8}
                      className="bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/25 focus:border-primary rounded-xl h-11 pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm password — signup only */}
                {!isLogin && (
                  <div>
                    <Label className="text-white/50 text-xs font-medium mb-1.5 block">Confirm Password</Label>
                    <div className="relative">
                      <Input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                        type={showConfirmPassword ? 'text' : 'password'} placeholder="••••••••" required minLength={8}
                        className={`bg-white/[0.06] border-white/[0.10] text-white placeholder:text-white/25 focus:border-primary rounded-xl h-11 pr-10 ${
                          confirmPassword && confirmPassword !== password ? 'border-red-500/50 focus:border-red-500' :
                          confirmPassword && confirmPassword === password ? 'border-emerald-500/50 focus:border-emerald-500' : ''
                        }`} />
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/25 hover:text-white/60 transition-colors">
                        {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {confirmPassword && confirmPassword !== password && (
                      <p className="text-[10px] text-red-400 mt-1">Passwords do not match</p>
                    )}
                    {confirmPassword && confirmPassword === password && (
                      <p className="text-[10px] text-emerald-400 mt-1">✓ Passwords match</p>
                    )}
                  </div>
                )}

                <button type="submit" disabled={loading || (!isLogin && !!confirmPassword && confirmPassword !== password)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-white text-sm font-black hover:bg-primary/90 transition-all shadow-[0_4px_20px_rgba(34,197,94,0.3)] disabled:opacity-50 mt-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {isLogin ? 'Sign In' : `Create Account${signupRole === 'advisor' ? ' — Free Trial' : ' — Free'}`}
                </button>
              </form>

              {/* Switch */}
              <div className="mt-4 text-center">
                <button onClick={() => setIsLogin(!isLogin)}
                  className="text-xs text-white/35 hover:text-white/60 transition-colors">
                  {isLogin ? "Don't have an account? " : 'Already have an account? '}
                  <span className="text-primary font-bold">{isLogin ? 'Sign up free' : 'Sign in'}</span>
                </button>
              </div>

              {/* Legal */}
              <p className="text-center text-[10px] text-white/20 mt-4">
                By continuing, you agree to our{' '}
                <a href="/terms" className="text-white/35 hover:text-white/60 underline underline-offset-2" onClick={onClose}>Terms</a>
                {' '}and{' '}
                <a href="/privacy" className="text-white/35 hover:text-white/60 underline underline-offset-2" onClick={onClose}>Privacy Policy</a>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
