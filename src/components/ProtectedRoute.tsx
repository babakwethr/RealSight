import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = true }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { needsOnboarding, loading: roleLoading } = useUserRole();
  const location = useLocation();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0B1120' }}>
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Block unverified email users
  if (!user.email_confirmed_at) {
    return <Navigate to="/login" replace />;
  }

  // Redirect to onboarding if profile is incomplete (but not if we're already on onboarding)
  if (needsOnboarding) {
    const isAdvisor = user.user_metadata?.signup_role === 'advisor';
    if (isAdvisor) {
      if (location.pathname !== '/admin/setup') {
        return <Navigate to="/admin/setup" replace />;
      }
    } else {
      if (requireOnboarding && location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
      }
    }
  }

  return <>{children}</>;
}
