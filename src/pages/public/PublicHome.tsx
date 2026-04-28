import { useEffect, useState } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Logo } from '@/components/Logo';
import {
  BarChart3, Shield, TrendingUp, Building, Globe, Zap, Users, Lock,
  PieChart, Activity, Layers, Bot, Star, MapPin, Search, FileText,
  ArrowRight, Check, ChevronRight, LineChart, Target, Radar
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { HeroGeometric } from '@/components/ui/shape-landing-hero';
import { DealAnalyzer } from "@/components/ui/DealAnalyzer";
// `AnimatedTestimonials` import retired alongside the testimonials data —
// see the explanatory comment further down. Re-add when real quotes exist.
// import { AnimatedTestimonials } from "@/components/ui/animated-testimonials";
import TrustSection from "@/components/sections/TrustSection";
import { PublicFooter } from "@/components/layout/PublicFooter";
import { CoverageMap } from "@/components/CoverageMap";
import dashboardVisual from '@/assets/dashboard-main.png';
// Per founder directive (25 Apr 2026): keep marketing pages deliberately vague
// about per-feature UI. The hero dashboard shot is the only screenshot we
// publish — the rest of the product reveal happens behind the trial signup.

type Audience = 'investor' | 'advisor';

// Per LAUNCH_PLAN.md §12 — only Dubai is genuinely live.
// Other markets are "Coming Q3/Q4 2026". Never claim coverage we don't have.
const markets = [
  { name: 'Dubai',          flag: '🇦🇪', status: 'Live now',          desc: '150+ areas tracked',     live: true  },
  { name: 'United Kingdom', flag: '🇬🇧', status: 'Coming Q3 2026',    desc: 'London & regions',       live: false },
  { name: 'Singapore',      flag: '🇸🇬', status: 'Coming Q3 2026',    desc: 'Premium districts',      live: false },
  { name: 'Spain',          flag: '🇪🇸', status: 'Coming Q4 2026',    desc: 'Costa del Sol & Madrid', live: false },
  { name: 'United States',  flag: '🇺🇸', status: 'Coming Q4 2026',    desc: 'Miami & NYC first',      live: false },
];

const investorFeatures = [
  { icon: PieChart, title: 'Portfolio Intelligence', desc: 'Track every property, payment, and performance metric in one intelligent dashboard.' },
  { icon: LineChart, title: 'AI Market Forecasts', desc: 'Machine learning models trained on transaction data predict price movements and rental yields.' },
  { icon: Target, title: 'Opportunity Signals', desc: 'AI detects undervalued areas, high-yield zones, and emerging growth corridors before the market moves.' },
  { icon: Activity, title: 'Market Pulse', desc: 'Real-time price per sqft, transaction volumes, and market sentiment for every tracked area.' },
  { icon: Layers, title: 'Deal Analyzer', desc: 'Paste any listing link and get instant analysis against market data — price, yield, risk, and AI verdict.' },
  { icon: Bot, title: 'AI Concierge', desc: '24/7 AI assistant that understands your portfolio, goals, and market context.' },
];

const advisorFeatures = [
  { icon: Users, title: 'Investor Management', desc: 'Onboard, manage, and retain investors with a dedicated CRM and portfolio view per client.' },
  { icon: Building, title: 'White-Label Platform', desc: 'Your brand, your colors, your workspace URL. RealSight becomes invisible — your brand takes center stage.' },
  { icon: Star, title: 'Advisor Picks', desc: 'Curate and push top investment picks to your investor base with AI-powered market backing.' },
  { icon: Shield, title: 'Client Dashboards', desc: 'Each investor gets their own portfolio dashboard, payment tracker, and document vault — under your brand.' },
  { icon: Globe, title: 'Multi-Market Access', desc: 'Serve investors across Dubai, Spain, US, UK, and Singapore with one unified platform.' },
  { icon: FileText, title: 'Automated Reports', desc: 'Generate portfolio reports, market summaries, and AI briefings for your investors automatically.' },
];

// 3-plan launch model — see LAUNCH_PLAN.md §2
const pricingPlans = [
  {
    name: 'Free User',
    tier: 'free',
    price: '$0',
    period: 'forever',
    desc: 'The whole investor app — free, forever.',
    features: [
      'Unlimited portfolio + payments + documents',
      'Markets, Dubai Heatmap, AI Concierge',
      'Deal Analyzer + branded PDF',
      'Off-plan projects browser',
      'Capital gain & monthly portfolio report',
    ],
    cta: 'Start Free',
    highlighted: false,
    badge: '',
  },
  {
    name: 'Investor Pro',
    tier: 'investor_pro',
    price: '$4',
    period: '/ mo',
    desc: 'Free shows the project. Pro shows you which units you can still buy.',
    features: [
      'Everything in Free, plus',
      'Live unit availability for every off-plan project',
      'Floor, view, real-time price per unit',
      'New unit alerts',
      'Launch price · first month free',
    ],
    cta: 'Try Free for 30 days',
    highlighted: false,
    badge: 'Launch $4',
  },
  {
    name: 'Adviser Pro',
    tier: 'adviser_pro',
    price: '$99',
    period: '/ mo',
    desc: 'Your white-label investor platform. Your brand. Your clients.',
    features: [
      'Everything in Investor Pro',
      'Branded workspace at realsight.app/a/yourname',
      'Your brand on every page + every PDF',
      'Unlimited investor clients',
      'Adviser dashboard + Opportunity Signals',
      'Bulk Deal Analyzer + WhatsApp share',
      'Public lead-gen page',
    ],
    cta: 'Start 30-day Free Trial',
    highlighted: true,
    badge: 'The money product',
  },
];

const stats = [
  { value: '50K+', label: 'Transactions Analyzed' },
  { value: '150+', label: 'Areas Tracked' },
  { value: '5', label: 'Global Markets' },
  { value: '98%', label: 'Data Accuracy' },
];

// NOTE: Testimonials section removed 27 Apr 2026 (founder QA pass).
// The previous five entries were fictional names ("Sarah Chen", "Marcus
// Rodriguez", etc.) paired with stock Unsplash photos. They violated the
// locked competitive-moat principle in `docs/FUTURE_IDEAS.md` ("Marketing
// surface — substantiable claims only") and Chrome's Opaque Response
// Blocking refused to render the avatars anyway. Bring this back once we
// have real customer quotes with consent + headshots.
//
// `testimonials` and `<AnimatedTestimonials />` are intentionally retired
// from the page render below. The `AnimatedTestimonials` component is left
// in the codebase so it can be re-introduced once real quotes arrive.

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: 'easeOut' }
  }),
};

export default function PublicHome() {
  const [audience, setAudience] = useState<Audience>('investor');
  const navigate = useNavigate();
  const { isMainDomain, isLoading } = useTenant();

  useEffect(() => {
    // If user is on a tenant subdomain, they should not see the global marketing page.
    // Redirect them to the tenant login/lounge.
    if (!isLoading && !isMainDomain) {
      navigate('/login', { replace: true });
      return;
    }

    // Forward Supabase auth callbacks to the correct route if they mistakenly land here
    const hasHashTokens = window.location.hash.includes('access_token=') || window.location.hash.includes('type=recovery') || window.location.hash.includes('type=signup');
    const hasCodeParam = new URLSearchParams(window.location.search).has('code');
    
    if (hasHashTokens || hasCodeParam) {
      navigate('/auth/callback' + window.location.search + window.location.hash, { replace: true });
    }
  }, [navigate]);

  const features = audience === 'investor' ? investorFeatures : advisorFeatures;

  return (
    <PublicLayout>
      <div className="w-full">
        {/* ──── HERO ──── */}
        <HeroGeometric 
          badge="AI-Powered Real Estate Intelligence"
          title1={
            <>
              Real Estate <span className="text-accent-gradient">Intelligence</span>
            </>
          }
          title2="That Moves Markets"
        >
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
            {audience === 'investor'
              ? 'Track your portfolio, analyze market data, forecast growth, and discover opportunities — all powered by AI and real transaction data.'
              : 'White-label platform for advisors and brokerages. Onboard investors, manage portfolios, push curated picks — under your own brand.'}
          </p>

          {/* Audience Toggle */}
          <div className="inline-flex items-center rounded-full p-1 bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/20 backdrop-blur-sm mb-8">
            <button
              onClick={() => setAudience('investor')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                audience === 'investor'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-foreground/70 hover:text-foreground dark:text-white/70 dark:hover:text-white'
              }`}
            >
              Investor
            </button>
            <button
              onClick={() => setAudience('advisor')}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                audience === 'advisor'
                  ? 'bg-primary text-white shadow-lg shadow-primary/20'
                  : 'text-foreground/70 hover:text-foreground dark:text-white/70 dark:hover:text-white'
              }`}
            >
              Advisor / Brokerage
            </button>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-accent-green-dark text-white font-semibold px-8 py-6 rounded-full shadow-lg shadow-primary/30 dark:shadow-primary/20 text-base transition-all hover:scale-105"
            >
              <Link to="/login?mode=signup">
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="rounded-full px-8 py-6 text-base border-black/20 dark:border-white/20 bg-transparent hover:bg-black/5 dark:hover:bg-white/10 text-foreground dark:text-white transition-all shadow-sm"
            >
              <a href="#features">
                Explore Platform
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Dashboard Preview inside Hero */}
          <div className="relative left-1/2 -translate-x-1/2 w-[98vw] md:w-[94vw] max-w-[1800px] mt-16 mb-20" style={{ perspective: "1200px" }}>
            {/* Glowing background blob behind the dashboard */}
            <motion.div 
               className="absolute inset-0 bg-gradient-to-r from-primary/30 to-accent-blue/30 blur-[100px] rounded-full"
               animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.9, 1.1, 0.9] }}
               transition={{ duration: 8, ease: "easeInOut", repeat: Infinity }}
            />
            {/* The Floating Dashboard Container */}
            <motion.div 
              className="relative rounded-2xl border border-black/10 dark:border-white/20 p-2 sm:p-3 backdrop-blur-2xl shadow-2xl glass-panel"
              style={{
                background: "linear-gradient(to bottom right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.02))",
                boxShadow: "0 30px 60px -12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.3)"
              }}
              initial={{ opacity: 0, y: 80, scale: 0.95, rotateX: 20, rotateY: 0 }}
              animate={{ opacity: 1, y: [0, -15, 0], scale: 1, z: 0, rotateX: 10, rotateY: 0 }}
              transition={{ 
                duration: 6, ease: "easeInOut", repeat: Infinity,
                opacity: { duration: 1.2, ease: "easeOut", repeat: 0 },
                scale: { duration: 1.2, ease: "easeOut", repeat: 0 },
                rotateX: { duration: 1.2, ease: "easeOut", repeat: 0 },
                rotateY: { duration: 1.2, ease: "easeOut", repeat: 0 }
              }}
            >
              <div className="rounded-xl overflow-hidden border border-black/5 dark:border-white/10 relative shadow-inner">
                <img 
                   src={dashboardVisual}
                   alt="RealSight AI Dashboard"
                   className="w-full h-auto object-cover rounded-xl"
                   style={{ 
                     display: "block",
                     opacity: 1,
                     visibility: "visible",
                     transform: "translateZ(0)"
                   }}
                   loading="eager"
                />
              </div>
            </motion.div>
          </div>
        </HeroGeometric>

        <TrustSection />

        {/* ──── GLOBAL MARKETS ──── */}
        <section className="py-20 px-4 relative" id="markets">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-accent-blue/10 text-accent-blue border border-accent-blue/20 mb-4">
                <Globe className="h-3.5 w-3.5" />
                Global Coverage
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Intelligence Across <span className="text-accent-gradient">5 Markets</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every plan includes 1 market. Add more markets as your portfolio grows.
              </p>
            </div>

            {/* Per LAUNCH_PLAN.md §17 — stylized coverage map. Lightweight
                SVG (no map-tile lib), Dubai pulses, others muted. Reads as
                global ambition without overclaiming live coverage. */}
            <div className="mb-10">
              <CoverageMap />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {markets.map((market, i) => (
                <motion.div
                  key={market.name}
                  className="glass-card p-5 text-center group cursor-pointer"
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <span className="text-3xl mb-3 block">{market.flag}</span>
                  <h3 className="font-semibold text-foreground text-sm mb-1">{market.name}</h3>
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full',
                      market.live
                        ? 'text-primary bg-primary/10'
                        : 'text-amber-300 bg-amber-500/10 border border-amber-500/20',
                    )}
                  >
                    {market.live && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-subtle" />}
                    {market.status}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">{market.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ──── FEATURES ──── */}
        <section className="py-20 px-4" id="features">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
                {audience === 'investor' ? <PieChart className="h-3.5 w-3.5" /> : <Building className="h-3.5 w-3.5" />}
                {audience === 'investor' ? 'Portfolio Intelligence' : 'Advisor Platform'}
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                {audience === 'investor'
                  ? <>Everything You Need to <span className="text-accent-gradient">Invest Smarter</span></>
                  : <>Your <span className="text-accent-gradient">White-Label</span> Investor Platform</>}
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                {audience === 'investor'
                  ? 'From portfolio tracking to AI-powered market intelligence — all in one platform.'
                  : 'Onboard, manage, and retain investors with a platform that carries your brand.'}
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {features.map((feature, i) => (
                <motion.div
                  key={feature.title}
                  className="glass-card p-6 group"
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/15 group-hover:bg-primary/15 transition-colors">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ──── DASHBOARD PREVIEW ──── */}
        <section className="py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="glass-panel p-8 md:p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent-blue/5 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-center mb-10">
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    {audience === 'investor' ? 'Your Portfolio, Supercharged' : 'A Platform That Carries Your Brand'}
                  </h2>
                  <p className="text-muted-foreground max-w-xl mx-auto">
                    {audience === 'investor'
                      ? 'Real-time valuations, AI forecasts, and market-backed insights for every property in your portfolio.'
                      : 'Custom colors, logo, branded workspace URL. Your investors see your brand — RealSight powers everything behind the scenes.'}
                  </p>
                </div>

                {/* Mock Dashboard KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: 'Total Invested', value: 'AED 12.4M', change: '+24.5%' },
                    { label: 'Current Value', value: 'AED 15.4M', change: '+12.8%' },
                    { label: 'Total Profit', value: 'AED 3.0M', change: '+24.5%' },
                    { label: 'Portfolio ROI', value: '24.5%', change: 'Strong' },
                  ].map((kpi) => (
                    <div key={kpi.label} className="glass-card p-4 text-center">
                      <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                      <p className="text-lg font-bold text-foreground">{kpi.value}</p>
                      <span className="text-xs text-primary font-medium">{kpi.change}</span>
                    </div>
                  ))}
                </div>

                <div className="text-center">
                  <Button asChild className="bg-primary hover:bg-accent-green-dark text-primary-foreground rounded-full px-6">
                    <Link to="/login?mode=signup">See Your Dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──── DEAL ANALYZER / OPPORTUNITY SIGNALS ──── */}
        <section className="py-24 px-4 bg-black/20" id="analysis">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-8 items-stretch">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="glass-panel p-10 flex flex-col min-h-[600px]"
              >
                <DealAnalyzer />
              </motion.div>

              <motion.div
                className="glass-panel p-10 flex flex-col min-h-[600px] text-left"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.1 }}
              >
                <div className="flex flex-col gap-1 mb-8">
                  <div className="inline-flex items-center gap-2 text-accent-blue font-bold text-[10px] uppercase tracking-[0.2em]">
                    <Radar className="h-3 w-3" />
                    Market Watch
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    Opportunity <span className="text-accent-gradient">Signals</span>
                  </h3>
                </div>

                <div className="flex-1 space-y-8">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Our AI models continuously scan transaction indices, rental yields, and supply pipelines. These signals highlight areas with <span className="text-foreground font-semibold">imminent growth potential</span> before the broader market reacts.
                  </p>

                  <div className="space-y-4">
                    {[
                      { area: 'Jumeirah Village Circle', signal: 'Rental Yield Spike', value: '8.4%', risk: 'Low Risk', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                      { area: 'Dubai Hills Estate', signal: 'Price Momentum', value: '+12%', risk: 'Medium Risk', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                      { area: 'Business Bay', signal: 'Supply Shortage', value: 'High', risk: 'Low Risk', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                    ].map(s => (
                      <div key={s.area} className="glass-card p-5 flex items-center justify-between group hover:bg-white/[0.05] transition-all">
                        <div className="flex items-center gap-4">
                          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5", s.bg)}>
                            <Activity className={cn("h-5 w-5", s.color)} />
                          </div>
                          <div>
                            <p className="font-bold text-foreground text-sm uppercase tracking-wide">{s.area}</p>
                            <p className={`text-[10px] ${s.color} font-black uppercase tracking-widest`}>{s.signal}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-foreground">{s.value}</p>
                          <span className="text-[9px] text-muted-foreground/60 font-bold uppercase">{s.risk}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 flex gap-4 items-center">
                    <Bot className="h-5 w-5 text-primary shrink-0" />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Signals are updated every 6 hours based on fresh DLD transaction data and active marketplace listings.
                    </p>
                  </div>
                </div>

                <div className="pt-8">
                  <Button asChild variant="outline" className="w-full glass-button gap-3 text-xs h-14 uppercase tracking-[0.2em] font-black border-white/5">
                    <Link to="/login?mode=signup">
                      View Full Heatmap
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ──── WHITE-LABEL ADVISOR ──── */}
        {audience === 'advisor' && (
          <section className="py-20 px-4">
            <div className="max-w-6xl mx-auto glass-panel p-8 md:p-12 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/5 via-transparent to-primary/5 pointer-events-none" />
              <div className="relative z-10">
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-accent-purple/10 text-accent-purple border border-accent-purple/20 mb-6">
                    <Building className="h-3.5 w-3.5" />
                    White-Label
                  </div>
                  <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                    Your Brand. <span className="text-accent-gradient">Your Platform.</span>
                  </h2>
                  <p className="text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                    Upload your logo, set your brand colors, get your own branded workspace URL. Your investors will see only your brand — RealSight powers everything invisibly behind the scenes.
                  </p>
                </div>

                <div className="grid sm:grid-cols-3 gap-6 mb-8">
                  {[
                    { icon: Globe, title: 'Workspace URL', desc: 'realsight.app/a/yourcompany' },
                    { icon: Shield, title: 'Brand Identity', desc: 'Logo, colors, workspace name' },
                    { icon: Users, title: 'Investor Onboarding', desc: 'Invite, approve, manage' },
                  ].map(item => (
                    <div key={item.title} className="glass-card p-5 text-center">
                      <div className="w-10 h-10 rounded-lg bg-accent-purple/10 flex items-center justify-center mx-auto mb-3 border border-accent-purple/15">
                        <item.icon className="h-5 w-5 text-accent-purple" />
                      </div>
                      <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button asChild className="bg-accent-purple hover:bg-accent-purple/90 text-white rounded-full px-8 py-6">
                    <Link to="/login?mode=signup&plan=adviser_pro&role=advisor">
                      Launch Your White-Label Platform
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-full px-8 py-6 border-white/20">
                    <Link to="/for-advisers">
                      See full walkthrough
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ──── PRICING ──── */}
        <section className="py-20 px-4" id="pricing">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium bg-primary/10 text-primary border border-primary/20 mb-4">
                <Zap className="h-3.5 w-3.5" />
                Simple Pricing
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Start Free. <span className="text-accent-gradient">Scale as You Grow.</span>
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto">
                Every plan includes 1 market. Additional markets available as add-ons.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {pricingPlans.map((plan, i) => (
                <motion.div
                  key={plan.name}
                  className={`glass-card p-6 flex flex-col relative ${
                    plan.highlighted ? 'border-primary/40 shadow-lg shadow-primary/10' : ''
                  }`}
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  {plan.badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold bg-primary text-primary-foreground px-3 py-1 rounded-full whitespace-nowrap">
                      {plan.badge}
                    </div>
                  )}
                  <h3 className="font-bold text-base text-foreground mb-1">{plan.name}</h3>
                  <p className="text-xs text-muted-foreground mb-4">{plan.desc}</p>
                  <div className="mb-5">
                    <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-sm text-muted-foreground">{plan.period}</span>}
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map(f => (
                      <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Check className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    asChild
                    size="sm"
                    className={`w-full rounded-full ${
                      plan.highlighted
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-foreground'
                    }`}
                  >
                    <Link to={`/login?mode=signup&plan=${plan.tier}${plan.tier === 'adviser_pro' ? '&role=advisor' : ''}`}>{plan.cta}</Link>
                  </Button>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ──── SOCIAL PROOF (intentionally removed pre-launch) ────
            The previous "What Our Users Say" testimonial carousel was retired
            27 Apr 2026: the five quotes were fictional names with stock
            Unsplash avatars, which violates `docs/FUTURE_IDEAS.md`'s locked
            "substantiable claims only" rule. Bring back when real customer
            quotes (with consent + headshots) are available. The
            <TrustSection /> rendered separately on the page already carries
            the qualitative trust pillars. */}

        {/* ──── TRUST ──── */}
        <section className="py-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                { icon: Shield, title: 'US-incorporated · Delaware', desc: 'RealSight Inc. is a Delaware C-Corp. Independent software company — no agents on staff.' },
                { icon: Lock, title: 'Your data is never shared', desc: '256-bit encryption. SOC 2 Type II in progress. We do not sell or share your portfolio with brokers — ever.' },
                { icon: TrendingUp, title: 'Verified transaction data', desc: 'Powered by official DLD records and licensed market sources. Every number is traceable.' },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  className="glass-card p-6 text-center"
                  custom={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeUp}
                >
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 border border-primary/15">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h4 className="font-semibold text-foreground mb-2">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ──── FINAL CTA ──── */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                Ready to Invest <span className="text-accent-gradient">Smarter?</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Join investors and advisors who use RealSight to make data-driven real estate decisions.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold px-8 py-6 rounded-full shadow-lg shadow-primary/20 text-base"
                >
                  <Link to="/login?mode=signup">
                    Start Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 py-6 text-base border-border/50"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ──── FOOTER ──── */}
        <PublicFooter />
      </div>
    </PublicLayout>
  );
}
