import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Eye, EyeOff, CheckCircle, XCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Logo } from '@/components/Logo';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});

type Step = 'loading' | 'form' | 'success' | 'error';

export default function ResetPassword() {
  const [step, setStep] = useState<Step>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Synchronous up-front check: if there's no recovery token in the URL at all,
    // skip the loading spinner entirely and show the actionable error UI on the
    // first paint. Catches users who type /reset-password directly, follow a
    // malformed link, or come back to an old reset email after the token TTL.
    //
    // Without this branch, the previous version showed a 5-second spinner before
    // surfacing the error — which the Playwright QA bot (27 Apr 2026) captured
    // as a "white-screen launch blocker".
    const hash = window.location.hash;
    const search = window.location.search;
    const looksLikeRecovery =
      hash.includes('access_token=') ||
      hash.includes('type=recovery') ||
      hash.includes('type=signup') ||
      search.includes('code=');

    if (!looksLikeRecovery) {
      setStep('error');
      setErrorMessage(
        'This password reset link is invalid or has expired. Request a new one to continue.'
      );
      return;
    }

    // From here on, we know there IS a token-shaped thing in the URL — Supabase
    // just hasn't finished processing it yet. We listen for PASSWORD_RECOVERY
    // and also poll the session, with a tighter 1.5s safety net.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setStep('form');
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setStep('form');
      }
    });

    // Safety net: if Supabase hasn't fired PASSWORD_RECOVERY within 1.5s and we're
    // still on 'loading', the token in the URL is malformed/expired — show error.
    const timeout = setTimeout(() => {
      setStep((prev) =>
        prev === 'loading' ? 'error' : prev,
      );
      setErrorMessage((prev) =>
        prev ||
        'This password reset link has expired or is invalid. Please request a new one.'
      );
    }, 1500);

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      passwordSchema.parse({ password, confirm });
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
        return;
      }
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        if (error.message.includes('same_password')) {
          toast.error('New password must be different from your current password');
        } else {
          toast.error(error.message);
        }
        return;
      }
      // Sign out so the user logs in fresh with the new password
      await supabase.auth.signOut();
      setStep('success');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const Background = () => (
    <div className="fixed inset-0 z-0 pointer-events-none bg-background">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-primary/5" />
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
    </div>
  );

  // ── Loading ───────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <Background />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground text-sm">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // ── Error / Expired ───────────────────────────────────────────────
  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <Background />
        <div className="relative z-10 w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <Logo variant="white" height="h-12" />
          </div>
          <div className="glass-panel p-8 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Link Expired</h2>
            <p className="text-muted-foreground text-sm mb-6">{errorMessage}</p>
            <Button asChild className="bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold">
              <Link to="/login">Back to Login</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────────────
  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative">
        <Background />
        <div className="relative z-10 w-full max-w-md">
          <div className="flex items-center justify-center mb-8">
            <Logo variant="white" height="h-12" />
          </div>
          <div className="glass-panel p-8 text-center">
            <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Password Updated</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <Button
              onClick={() => navigate('/login', { replace: true })}
              className="bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold w-full"
            >
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Reset Form ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <Background />

      <Link
        to="/login"
        className="fixed top-4 left-4 z-20 glass-panel px-4 py-2 flex items-center gap-2 text-foreground/80 hover:text-primary transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Back</span>
      </Link>

      <div className="relative z-10 w-full max-w-md">
        <div className="flex items-center justify-center mb-8 animate-fade-in">
          <Logo variant="white" height="h-12" />
        </div>

        <div className="glass-panel p-8 animate-slide-up">
          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-foreground">Set New Password</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Choose a strong password for your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-password" className="text-foreground/80">New Password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={8}
                  className="glass-input pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-foreground/80">Confirm Password</Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="glass-input"
              />
            </div>

            {password.length > 0 && (
              <div className="space-y-1 text-xs">
                <p className={password.length >= 8 ? 'text-primary' : 'text-muted-foreground'}>
                  {password.length >= 8 ? '✓' : '○'} At least 8 characters
                </p>
                <p className={confirm && password === confirm ? 'text-primary' : 'text-muted-foreground'}>
                  {confirm && password === confirm ? '✓' : '○'} Passwords match
                </p>
              </div>
            )}

            <Button
              type="submit"
              disabled={submitting || password.length < 8 || password !== confirm}
              className="w-full bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold accent-glow"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
