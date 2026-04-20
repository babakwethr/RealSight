import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { useTenant } from '@/hooks/useTenant';
import { Logo } from '@/components/Logo';

export default function AuthCallback() {
    const navigate = useNavigate();
    const { isMainDomain } = useTenant();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let handled = false;

        // 1. Check for basic errors in URL (e.g., ?error=access_denied)
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlError = params.get('error') || hashParams.get('error');
        const urlErrorDescription = params.get('error_description') || hashParams.get('error_description');

        if (urlError) {
            setError(urlErrorDescription || 'An error occurred during authentication.');
            return;
        }

        // 2. Check if this is a password recovery callback
        const hashType = hashParams.get('type');
        const isRecoveryFlow = hashType === 'recovery' || params.get('flow') === 'recovery';

        if (hashType === 'recovery') {
            // Implicit flow — hash contains tokens, pass them along
            navigate('/reset-password' + window.location.hash, { replace: true });
            return;
        }

        // 3. Register auth state listener FIRST to catch PASSWORD_RECOVERY from PKCE code exchange.
        //    The Supabase client automatically detects ?code= and exchanges it, firing events.
        //    We must register before the exchange completes so we don't miss the event.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (handled) return;

            if (event === 'PASSWORD_RECOVERY' || (isRecoveryFlow && session)) {
                handled = true;
                subscription.unsubscribe();
                navigate('/reset-password', { replace: true });
                return;
            }

            if ((event === 'SIGNED_IN') && session) {
                handled = true;
                subscription.unsubscribe();
                await checkProfileAndRedirect(session.user.id);
            }
        });

        // 4. Check for existing session (e.g. code already exchanged before listener registered)
        //    Use a small delay to give PASSWORD_RECOVERY event a chance to fire first.
        const sessionCheck = setTimeout(async () => {
            if (handled) return;
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session && !handled) {
                    handled = true;
                    subscription.unsubscribe();
                    // If we know this was a recovery flow (from query param), redirect to reset
                    if (isRecoveryFlow) {
                        navigate('/reset-password', { replace: true });
                    } else {
                        await checkProfileAndRedirect(session.user.id);
                    }
                }
            } catch (err: any) {
                if (!handled) {
                    setError(err.message || 'Authentication failed');
                }
            }
        }, 500);

        // 5. Timeout fallback — if nothing happens within 6 seconds, redirect to login
        const timeout = setTimeout(() => {
            if (!handled) {
                handled = true;
                subscription.unsubscribe();
                navigate('/', { replace: true });
            }
        }, 6000);

        return () => {
            subscription.unsubscribe();
            clearTimeout(sessionCheck);
            clearTimeout(timeout);
        };
    }, [navigate, isMainDomain]);

    const checkProfileAndRedirect = async (userId: string) => {
        try {
            // Check user role and signup metadata
            const [{ data: roleData }, { data: { user: authUser } }] = await Promise.all([
                supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
                supabase.auth.getUser(),
            ]);

            const isAdmin = roleData?.role === 'admin';
            const signupRole = authUser?.user_metadata?.signup_role;

            // Check if profile and investor records are complete
            const [{ data: profile }, { data: investor }] = await Promise.all([
                supabase.from('profiles').select('full_name, tenant_id').eq('user_id', userId).maybeSingle(),
                supabase.from('investors').select('phone').eq('user_id', userId).maybeSingle(),
            ]);

            const isComplete = (() => {
                if (signupRole === 'advisor') {
                    if (!profile?.full_name) return false;
                    return profile.tenant_id && profile.tenant_id !== '00000000-0000-0000-0000-000000000000';
                }
                if (!profile?.full_name || !investor?.phone) return false;
                return investor.phone !== '0000000000';
            })();

            if (isComplete) {
                if (isAdmin) {
                    navigate('/admin/investors', { replace: true });
                } else {
                    navigate('/dashboard', { replace: true });
                }
            } else {
                navigate('/onboarding', { replace: true });
            }
        } catch (err) {
            console.error('Profile check error:', err);
            navigate('/onboarding', { replace: true });
        }
    };

    if (error) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
                <div className="glass-panel p-8 max-w-md w-full text-center space-y-4">
                    <h2 className="text-xl font-semibold text-destructive">Authentication Error</h2>
                    <p className="text-muted-foreground">{error}</p>
                    <button
                        onClick={() => navigate('/login')}
                        className="text-primary hover:text-accent-green-light underline mt-4"
                    >
                        Return to Login
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background">
            <div className="relative z-10 flex flex-col items-center gap-6">
                <Logo variant="white" height="h-10" />
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground animate-pulse">Verifying authentication...</p>
                </div>
            </div>
        </div>
    );
}
