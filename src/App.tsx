import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ScrollToTop } from "@/components/ScrollToTop";
import { TenantProvider } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { isCapacitorNative, CAPACITOR_SCHEME } from "@/lib/capacitor";

// Public pages
import PublicHome from "./pages/public/PublicHome";
import MarketHome from "./pages/MarketHome";
import Projects from "./pages/public/Projects";
import ProjectDetail from "./pages/public/ProjectDetail";
import RequestAccess from "./pages/public/RequestAccess";
import Terms from "./pages/public/Terms";
import Privacy from "./pages/public/Privacy";

// Auth pages
import Login from "./pages/Login";
import LoginRedirect from "./pages/LoginRedirect";
import Onboarding from "./pages/Onboarding";
import AuthCallback from "./pages/AuthCallback";
import ResetPassword from "./pages/ResetPassword";

// Protected pages (Investor Lounge)
import Dashboard from "./pages/Home";
import Portfolio from "./pages/Portfolio";
import Payments from "./pages/Payments";
import Billing from "./pages/Billing";
import Documents from "./pages/Documents";
import Compare from "./pages/Compare";
import Updates from "./pages/Updates";
import Concierge from "./pages/Concierge";
import Account from "./pages/Account";
import MonthlyPicks from "./pages/MonthlyPicks";
import MarketPulse from "./pages/MarketPulse";
import MarketIndex from "./pages/MarketIndex";
import NotFound from "./pages/NotFound";
import DubaiHeatmap from "./pages/DubaiHeatmap";
import GlobalRadar from "./pages/GlobalRadar";
import OpportunitySignals from "./pages/OpportunitySignals";
import DealAnalyzer from "./pages/DealAnalyzer";
import TopPicks from "./pages/TopPicks";
import MarketIntelligence from "./pages/MarketIntelligence";
import Watchlist from "./pages/Watchlist";

// Preview V3 (fresh mobile-first concept) — isolated, unauth, leaves V1/V2 untouched
import V3Layout, { V3PhoneFrame } from "./pages/preview/v3/V3Layout";
import V3Landing from "./pages/preview/v3/Landing";
import V3Home from "./pages/preview/v3/Home";
import V3DealAnalyzer from "./pages/preview/v3/DealAnalyzer";
import V3Portfolio from "./pages/preview/v3/Portfolio";
import V3Radar from "./pages/preview/v3/Radar";
import V3Profile from "./pages/preview/v3/Profile";

// Admin pages
import AdminInvestors from "./pages/admin/Investors";
import AdminInvestorDashboard from "./pages/admin/InvestorDashboard";
import AdminUsers from "./pages/admin/Users";
import AdminMonthlyPicks from "./pages/admin/MonthlyPicks";
import AdminSettings from "./pages/admin/Settings";
import AdminDLDAnalytics from "./pages/admin/DLDAnalytics";
import AdminInventory from "./pages/admin/Inventory";
import AdminProjects from "./pages/admin/AdminProjects";
import SetupWizard from "./pages/admin/SetupWizard";

const queryClient = new QueryClient();

/**
 * Deep-link handler for Capacitor OAuth callbacks.
 * When Google auth finishes, Safari redirects to
 * app.realsight.invest://auth/callback?code=XXX. iOS sees the custom URL
 * scheme, opens the RealSight app, and fires the appUrlOpen event via
 * @capacitor/app. We then exchange the PKCE code for a Supabase session.
 */
function CapacitorDeepLinkHandler() {
  useEffect(() => {
    if (!isCapacitorNative()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');

        const handle = await CapApp.addListener('appUrlOpen', async ({ url }) => {
          if (!url.startsWith(CAPACITOR_SCHEME + '://')) return;

          // Parse query params from both ? and # (Supabase can use either)
          const rawParams = url.includes('?')
            ? url.split('?')[1]
            : url.includes('#') ? url.split('#')[1] : '';
          const params = new URLSearchParams(rawParams);

          const code = params.get('code');
          const error = params.get('error');
          const errorDesc = params.get('error_description');

          if (error) {
            console.error('[Capacitor OAuth] Error:', errorDesc || error);
            return;
          }

          if (code) {
            const { error: exchErr } = await supabase.auth.exchangeCodeForSession(code);
            if (exchErr) console.error('[Capacitor OAuth] Exchange error:', exchErr.message);
            // onAuthStateChange in AuthModal + AuthCallback will handle navigation
          }
        });

        cleanup = () => { handle.remove(); };
      } catch (err) {
        console.warn('[Capacitor] Deep link setup failed:', err);
      }
    })();

    return () => { cleanup?.(); };
  }, []);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TenantProvider>
      <AuthProvider>
        <TooltipProvider>
          <CapacitorDeepLinkHandler />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              {/* Public Routes — no login required */}
              <Route path="/" element={<MarketHome isPublic={true} />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/about" element={<PublicHome />} />
              <Route path="/request-access" element={<RequestAccess />} />
              {/* /login redirects to home + opens modal. Keep /login-page for email confirmation links */}
              <Route path="/login" element={<LoginRedirect />} />
              <Route path="/login-page" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* ── PREVIEW V3 — fresh mobile-first concept (standalone) ── */}
              <Route element={<V3PhoneFrame />}>
                <Route path="/preview/v3" element={<V3Landing />} />
              </Route>
              <Route element={<V3Layout />}>
                <Route path="/preview/v3/home" element={<V3Home />} />
                <Route path="/preview/v3/deal-analyzer" element={<V3DealAnalyzer />} />
                <Route path="/preview/v3/portfolio" element={<V3Portfolio />} />
                <Route path="/preview/v3/radar" element={<V3Radar />} />
                <Route path="/preview/v3/profile" element={<V3Profile />} />
              </Route>

              {/* Onboarding (protected but no onboarding requirement) */}
              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute requireOnboarding={false}>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

              {/* Protected Routes (Investor Lounge) */}
              <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                <Route path="/dashboard" element={<MarketHome isPublic={false} />} />
                <Route path="/portfolio" element={<Portfolio />} />
                <Route path="/picks" element={<MonthlyPicks />} />
                <Route path="/top-picks" element={<TopPicks />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />
                <Route path="/payments" element={<Payments />} />
                <Route path="/billing" element={<Billing />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/updates" element={<Updates />} />
                <Route path="/concierge" element={<Concierge />} />
                <Route path="/market-intelligence" element={<MarketIntelligence />} />
                <Route path="/market-pulse" element={<MarketPulse />} />
                <Route path="/market-index" element={<MarketIndex />} />
                <Route path="/heatmap" element={<DubaiHeatmap />} />
                <Route path="/radar" element={<GlobalRadar />} />
                <Route path="/opportunity-signals" element={<OpportunitySignals />} />
                <Route path="/deal-analyzer" element={<DealAnalyzer />} />
                <Route path="/watchlist" element={<Watchlist />} />
                <Route path="/account" element={<Account />} />
              </Route>

              {/* Admin Routes */}
              <Route
                path="/admin/setup"
                element={
                  <ProtectedRoute requireOnboarding={false}>
                    <SetupWizard />
                  </ProtectedRoute>
                }
              />
              
              <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
                <Route path="/admin/investors" element={<AdminInvestors />} />
                <Route path="/admin/investors/:investorId" element={<AdminInvestorDashboard />} />
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/monthly-picks" element={<AdminMonthlyPicks />} />
                <Route path="/admin/settings" element={<AdminSettings />} />
                <Route path="/admin/dld-analytics" element={<AdminDLDAnalytics />} />
                <Route path="/admin/market-pulse" element={<MarketPulse />} />
                <Route path="/admin/market-index" element={<MarketIndex />} />
                <Route path="/admin/inventory" element={<AdminInventory />} />
                <Route path="/admin/projects" element={<AdminProjects />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </TenantProvider>
  </QueryClientProvider>
);

export default App;
