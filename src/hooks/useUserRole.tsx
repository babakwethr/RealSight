import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type UserRole = 'admin' | 'user';

interface UseUserRoleReturn {
  role: UserRole | null;
  isAdmin: boolean;
  loading: boolean;
  needsOnboarding: boolean;
}

export function useUserRole(): UseUserRoleReturn {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<UserRole | null>(null);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      if (!user) {
        setRole(null);
        setNeedsOnboarding(false);
        setLoading(false);
        return;
      }

      try {
        // Fetch role — retry up to 3 times if trigger hasn't finished
        let roleData = null;
        for (let attempt = 0; attempt < 4; attempt++) {
          const { data } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .maybeSingle();
          roleData = data;
          if (roleData || attempt === 3) break;
          await new Promise(r => setTimeout(r, 600));
        }

        if (cancelled) return;

        const resolvedRole = (roleData?.role as UserRole) || 'user';
        setRole(resolvedRole);

        // Check onboarding status
        const [{ data: profile }, { data: investor }] = await Promise.all([
          supabase.from('profiles').select('full_name, tenant_id').eq('user_id', user.id).maybeSingle(),
          supabase.from('investors').select('phone').eq('user_id', user.id).maybeSingle(),
        ]);

        if (cancelled) return;

        const signupRole = user.user_metadata?.signup_role;
        let needsSetup: boolean;

        if (signupRole === 'advisor') {
          needsSetup = !profile?.tenant_id || profile.tenant_id === '00000000-0000-0000-0000-000000000000';
        } else {
          needsSetup = !profile?.full_name || !investor?.phone || investor.phone === '0000000000';
        }

        setNeedsOnboarding(needsSetup);
      } catch (error) {
        console.error('Error fetching user role:', error);
        if (!cancelled) {
          setRole('user');
          setNeedsOnboarding(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    if (!authLoading) {
      setLoading(true);
      fetchData();
    }

    return () => { cancelled = true; };
  }, [user?.id, authLoading]);

  return {
    role,
    isAdmin: role === 'admin',
    loading: authLoading || loading,
    needsOnboarding,
  };
}
