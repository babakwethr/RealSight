/**
 * authRouting — single source of truth for "where does a user land after auth?"
 *
 * Before this, post-login destinations were decided ad-hoc in AuthModal,
 * AuthCallback, Login, Onboarding and SetupWizard — and they disagreed. The
 * worst case: a returning ADVISER landed on the investor-flavoured /dashboard
 * because AuthModal always sent completed logins there without checking role.
 *
 * Every post-auth navigation should call getPostLoginRoute() so the rule is
 * defined once. Mirrors the (correct) logic already in AuthCallback.tsx:
 *   - still onboarding + admin  → finish adviser setup
 *   - still onboarding          → investor/adviser onboarding (self-branches)
 *   - done + admin (adviser)    → adviser workspace
 *   - done + investor           → investor dashboard
 */
export interface PostLoginRouteArgs {
  /** From useUserRole().isAdmin — advisers get user_roles.role='admin'. */
  isAdmin: boolean;
  /** From useUserRole().needsOnboarding. */
  needsOnboarding: boolean;
}

export function getPostLoginRoute({ isAdmin, needsOnboarding }: PostLoginRouteArgs): string {
  if (needsOnboarding) {
    return isAdmin ? '/admin/setup' : '/onboarding';
  }
  return isAdmin ? '/admin/investors' : '/dashboard';
}
