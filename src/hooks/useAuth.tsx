import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useTenant } from '@/hooks/useTenant';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  mfaRequired: boolean;
  mfaFactorId: string | null;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, fullName?: string, signupRole?: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  verifyMfa: (code: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { tenant } = useTenant();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        // Clear MFA state when session changes (e.g. after full sign-in)
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
          setMfaRequired(false);
          setMfaFactorId(null);
        }
      }
    );

    // Then check for existing session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Initial session fetch error:', error);
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error };

    // Check if MFA is required (AAL1 session but user has TOTP enrolled)
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.nextLevel === 'aal2' && aal.nextLevel !== aal.currentLevel) {
      // User has MFA enrolled — find the TOTP factor
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (totpFactor) {
        setMfaRequired(true);
        setMfaFactorId(totpFactor.id);
        return { error: null };
      }
    }

    return { error: null };
  };

  const verifyMfa = async (code: string) => {
    if (!mfaFactorId) return { error: new Error('No MFA factor found') };

    try {
      // Create a challenge then verify it
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
        factorId: mfaFactorId,
      });
      if (challengeError) throw challengeError;

      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId: mfaFactorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;

      setMfaRequired(false);
      setMfaFactorId(null);
      return { error: null };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string, signupRole?: string) => {
    // Capture plan from URL if present (e.g. /login?plan=pro)
    const params = new URLSearchParams(window.location.search);
    const urlPlan = params.get('plan');

    // Refer-a-friend (LAUNCH_PLAN.md §14 step 9). The URL might carry ?ref=ABC123,
    // OR a previous landing-page visit might have stashed it in localStorage so the
    // code survives the auth bounce. We persist into user_metadata.referred_by so
    // the Stripe webhook can credit the referrer 1 free month on first paid sub.
    let referralCode: string | null = params.get('ref');
    if (!referralCode && typeof localStorage !== 'undefined') {
      try { referralCode = localStorage.getItem('rs_ref'); } catch { /* private mode */ }
    }
    if (referralCode) {
      referralCode = referralCode.trim().toUpperCase().slice(0, 12) || null;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: fullName,
          tenant_id: tenant?.id || '00000000-0000-0000-0000-000000000000',
          signup_role: signupRole || 'investor',
          ...(urlPlan && { plan: urlPlan }),
          ...(referralCode && { referred_by: referralCode }),
        },
      },
    });

    // One-shot — clear the stash so a second signup on the same device doesn't
    // accidentally reuse the prior code.
    if (!error && referralCode && typeof localStorage !== 'undefined') {
      try { localStorage.removeItem('rs_ref'); } catch { /* noop */ }
    }

    return { error };
  };

  const signOut = async () => {
    toast.loading('Logging out...', { id: 'logout-toast' });
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setMfaRequired(false);
      setMfaFactorId(null);
      toast.success('Logged out successfully', { id: 'logout-toast' });
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      setSession(null);
      setMfaRequired(false);
      setMfaFactorId(null);
      toast.success('Logged out', { id: 'logout-toast' });
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, mfaRequired, mfaFactorId, signIn, signUp, signOut, verifyMfa }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
