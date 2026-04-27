/**
 * useFounder — reads `profiles.is_founder` and exposes a tiny boolean.
 * Used by FounderBadge + Account page. Per LAUNCH_PLAN.md §14 step 10:
 * the first 1,000 signups get permanent founder status — locked-in launch
 * pricing, public badge, "Founder" tag in their PDFs and adviser dashboards.
 */
import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

export function useFounder() {
  const { user, loading: authLoading } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['founder-status', user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from('profiles')
        .select('is_founder')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) {
        // Migration may not be deployed yet — fail soft, treat as non-founder.
        console.warn('[useFounder] could not read is_founder:', error.message);
        return false;
      }
      return Boolean(data?.is_founder);
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isFounder: data ?? false,
    loading: authLoading || isLoading,
  };
}
