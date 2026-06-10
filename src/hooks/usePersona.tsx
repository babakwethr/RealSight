import { useAuth } from './useAuth';
import { useUserRole } from './useUserRole';

/**
 * usePersona — the ONE place the app decides who a user is for UX purposes.
 *
 * Before this hook, "is this user an adviser?" was re-derived inline in 6+
 * components, and they disagreed: the desktop sidebar keyed off `isAdmin`
 * only, while the mobile nav/drawer used `isAdmin || signup_role==='advisor'`.
 * That meant a signed-up-but-not-yet-admin adviser saw the adviser menu on
 * mobile but the investor menu on desktop. Deciding it once kills that whole
 * class of bug.
 *
 * Persona priority:
 *   1. admin    — user_roles.role === 'admin' (advisers get this on setup)
 *   2. adviser  — user_metadata.signup_role === 'advisor'
 *   3. investor — everyone else (default)
 *
 * `isAdviserNav` is the boolean nav surfaces care about: admin OR adviser get
 * the adviser navigation; investors get the investor navigation. Admins always
 * fall into the adviser UX (per project convention).
 *
 * No new queries — this composes the existing useAuth + useUserRole.
 */
export type Persona = 'admin' | 'adviser' | 'investor';

interface UsePersonaReturn {
  persona: Persona;
  /** admin || adviser — the surfaces use this to pick adviser vs investor nav. */
  isAdviserNav: boolean;
  /** True until role + auth have resolved; callers keep their skeletons. */
  isLoading: boolean;
}

export function usePersona(): UsePersonaReturn {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole();

  const signupRole = user?.user_metadata?.signup_role;

  const persona: Persona = isAdmin
    ? 'admin'
    : signupRole === 'advisor'
      ? 'adviser'
      : 'investor';

  return {
    persona,
    isAdviserNav: persona !== 'investor',
    isLoading: authLoading || roleLoading,
  };
}
