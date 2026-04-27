/**
 * /for-advisers — marketing page targeted at independent advisers, brokerage
 * principals, and family offices. Per LAUNCH_PLAN.md §14 step 13.
 *
 * ⚠️ COMPETITIVE-MOAT NOTE (per founder directive, 25 Apr 2026):
 * Keep this page DELIBERATELY VAGUE about implementation details. We do NOT
 * publish:
 *   • Per-feature UI screenshots (only one tasteful hero "lifestyle" shot)
 *   • Data-source specifics (no "DLD + rental indices + supply pipelines")
 *   • Refresh cadences, model architecture, integration list
 *   • Exact module/page names from the back office
 *   • Anything an AI agent could use to clone the product from this page alone
 *
 * The mantra: sell the OUTCOME, not the BLUEPRINT. The actual product reveal
 * happens *inside the trial* — once the prospect is in our funnel, signed in,
 * with an email on file. Public visitors get value, social proof, and a CTA.
 *
 * If a future version of this page wants to show more, it should require a
 * gated demo signup (`/request-access`) so we capture the lead first.
 */
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowRight, Building, Users, FileText, Globe, Bot,
  Crown, Sparkles, ShieldCheck, MessageCircle, Check, ChevronRight,
  Lock, Eye, Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { PublicFooter } from '@/components/layout/PublicFooter';

import dashboardMain from '@/assets/dashboard-main.png';

// ──────────────────────────────────────────────────────────────────────────────

/**
 * Single tasteful hero shot. We blur the bottom edge slightly with a gradient
 * mask so the screenshot reads as "real product" without revealing every UI
 * element to a competitor. No browser-chrome url labels, no captions calling
 * out specific routes — those leak more than they need to.
 */
function HeroShot() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 bg-gradient-to-tr from-primary/25 via-accent-blue/15 to-accent-purple/25 blur-3xl rounded-3xl pointer-events-none opacity-70" />
      <div
        className="relative rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-black/40 backdrop-blur"
        style={{
          // Soft fade at the bottom — keeps the hero shot from doubling as a
          // pixel-perfect spec sheet for would-be cloners.
          maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)',
        }}
      >
        <img
          src={dashboardMain}
          alt="RealSight adviser platform"
          loading="eager"
          className="w-full h-auto block"
        />
      </div>
      <p className="text-[11px] text-white/40 mt-4 text-center italic">
        A glimpse of the platform. The full product opens once you start your free trial.
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────

/** Outcome cards — what you GET, not how it works. */
const OUTCOMES = [
  {
    icon: Building,
    title: 'A platform with your name on it',
    body:
      'Branded workspace URL, your logo, your colours. Your investors never see ours. To them, you built it.',
  },
  {
    icon: Users,
    title: 'A real dashboard for every client',
    body:
      'Each investor logs into their own portfolio under your brand. You see all of them, switch in one click.',
  },
  {
    icon: FileText,
    title: 'Branded PDFs in seconds',
    body:
      'Deal analyses, investor presentations, portfolio reports — all carrying your brand from cover to footer.',
  },
  {
    icon: Bot,
    title: 'AI that knows your market',
    body:
      'Ask in plain English. Get answers backed by verified data, not guesses. Reasoning shown, every claim cited.',
  },
  {
    icon: Globe,
    title: 'A public page that works for you',
    body:
      'Your branded landing page captures leads while you sleep. Share the link, leads land in your back office.',
  },
  {
    icon: ShieldCheck,
    title: 'We never speak to your clients',
    body:
      'RealSight is software. We are not a brokerage. We do not employ agents. We do not contact your investors.',
  },
];

// ──────────────────────────────────────────────────────────────────────────────

export default function ForAdvisers() {
  return (
    <PublicLayout>
      <div className="w-full">
        {/* ──── HERO ──── */}
        <section className="relative pt-12 pb-8 px-4 overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[600px] bg-gradient-to-b from-primary/20 via-accent-blue/10 to-transparent blur-3xl pointer-events-none" />

          <div className="max-w-5xl mx-auto text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] bg-accent-purple/10 text-accent-purple border border-accent-purple/20 mb-6">
                <Crown className="h-3.5 w-3.5" />
                For Advisers & Brokerages
              </div>

              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 leading-[1.05] tracking-tight">
                A white-label investor platform.{' '}
                <span className="text-accent-gradient">Your brand. Your clients.</span>
              </h1>

              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                Onboard investors, send branded reports, look like a fund.
                One subscription replaces four tools you're already paying for.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mb-10">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold px-8 py-6 rounded-full shadow-lg shadow-primary/30 text-base"
                >
                  <Link to="/login?mode=signup&plan=adviser_pro&role=advisor">
                    Start 30-day Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 py-6 text-base border-border/50"
                >
                  <a href="mailto:hello@realsight.app?subject=Adviser%20Pro%20demo">
                    Request a private demo
                  </a>
                </Button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-white/50">
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  $99/mo launch price · locked in for life
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  No card required for the trial
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-primary" />
                  Cancel any time
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ──── HERO SHOT (single, masked) ──── */}
        <section className="px-4 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-4xl mx-auto"
          >
            <HeroShot />
          </motion.div>
        </section>

        {/* ──── PROBLEM / PROMISE ──── */}
        <section className="py-16 px-4 border-y border-white/5 bg-black/20">
          <div className="max-w-5xl mx-auto">
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400/80 mb-3">
                  The problem
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
                  You spend half the week on spreadsheets, half on WhatsApp,
                  and your clients still feel underserved.
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>· Each client wants their own portfolio view. You don't have time.</li>
                  <li>· The numbers in your decks go stale the moment you send them.</li>
                  <li>· Every report is a copy-paste from last month's deck.</li>
                  <li>· Your "tech" is Dropbox + Google Sheets + a CRM you stopped using.</li>
                </ul>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary mb-3">
                  The promise
                </p>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-4 leading-tight">
                  A platform that costs $99/month and makes you look like a $10M fund.
                </h2>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>· Every client gets a real dashboard — under your brand.</li>
                  <li>· Live, verified market data. No more guesswork.</li>
                  <li>· Branded reports in one click. Pitch decks in 30 seconds.</li>
                  <li>· Sign up, brand it, send the link. No engineering required.</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ──── OUTCOMES (no per-feature screenshots) ──── */}
        <section className="py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 mb-4">
                <Sparkles className="h-3.5 w-3.5" />
                What You Get
              </div>
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
                Six things that change how you work.
              </h2>
              <p className="text-base text-muted-foreground max-w-xl mx-auto">
                The full walkthrough — every screen, every workflow — opens
                once you start your trial. We keep the deeper detail for the
                people who are serious enough to sign up.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {OUTCOMES.map((o, i) => (
                <motion.div
                  key={o.title}
                  className="glass-card p-6 group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-4 border border-primary/15 group-hover:bg-primary/15 transition-colors">
                    <o.icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{o.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{o.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ──── PRIVATE DEMO CTA — gates the deeper reveal ──── */}
        <section className="py-16 px-4">
          <div className="max-w-3xl mx-auto">
            <div className="glass-panel p-8 md:p-10 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/10 via-transparent to-primary/5 pointer-events-none" />
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="w-12 h-12 rounded-xl bg-accent-purple/15 flex items-center justify-center border border-accent-purple/25 shrink-0">
                  <Lock className="h-5 w-5 text-accent-purple" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Want to see exactly how it works?
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    The detailed product tour is private. Start a free trial
                    or book a 20-minute call with the founder, and we'll walk
                    you through the live platform.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                  <Button
                    asChild
                    className="bg-primary hover:bg-accent-green-dark text-primary-foreground rounded-full px-5"
                  >
                    <Link to="/login?mode=signup&plan=adviser_pro&role=advisor">
                      Start Trial
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="rounded-full px-5 border-border/50"
                  >
                    <a href="mailto:hello@realsight.app?subject=Private%20demo%20request">
                      Book a Demo
                    </a>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ──── FOUNDER PRICING ──── */}
        <section className="py-20 px-4 bg-black/20 border-y border-white/5">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] bg-amber-500/10 text-amber-300 border border-amber-500/20 mb-4">
              <Crown className="h-3.5 w-3.5" />
              Founder Pricing
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
              $99/month. <span className="text-accent-gradient">Locked in for life.</span>
            </h2>
            <p className="text-base text-muted-foreground mb-8 max-w-2xl mx-auto">
              The first 1,000 advisers get launch pricing locked at $99/month
              forever — even after we move to standard pricing for everyone
              else. After your 30-day free trial, you'll only be charged if
              you keep going.
            </p>

            <div className="grid sm:grid-cols-3 gap-4 max-w-2xl mx-auto mb-10 text-left">
              {[
                { icon: ShieldCheck, label: 'No setup fee.' },
                { icon: MessageCircle, label: 'Founder access on WhatsApp.' },
                { icon: Star, label: 'First in line for new markets.' },
              ].map((b) => (
                <div key={b.label} className="glass-card p-4 flex items-start gap-3">
                  <b.icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-xs text-foreground/80 leading-relaxed">{b.label}</span>
                </div>
              ))}
            </div>

            <Button
              asChild
              size="lg"
              className="bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold px-10 py-6 rounded-full shadow-lg shadow-primary/30 text-base"
            >
              <Link to="/login?mode=signup&plan=adviser_pro&role=advisor">
                Claim Your Founder Spot
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <p className="text-[11px] text-white/40 mt-4">
              Trial doesn't require a card. We email you 3 days before it ends.
            </p>
          </div>
        </section>

        {/* ──── FAQ — generalised ──── */}
        <section className="py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-10 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Is RealSight a brokerage?',
                  a: 'No. We are a US-incorporated software company (Delaware C-Corp). We do not employ real estate agents, and we never share your client list with brokers. You own every relationship — we provide the rails.',
                },
                {
                  q: 'How is this different from a CRM?',
                  a: 'A CRM tracks contacts. RealSight gives every one of your clients a live, branded portfolio dashboard with verified market data and one-tap document sharing — plus a public lead-gen page and branded reports. It replaces several tools you already pay for.',
                },
                {
                  q: 'Can I migrate my existing client list?',
                  a: 'Yes. Send us a CSV during onboarding, or invite clients one at a time from the back office. Each invited client receives a branded onboarding email.',
                },
                {
                  q: 'What if I want my own domain (not a subdomain)?',
                  a: 'Custom domains (yourbrand.com) are coming as a premium add-on. At launch every adviser gets a branded workspace URL at realsight.app/a/yourbrand — perfect for production use, fully co-branded, and zero DNS work to set up.',
                },
                {
                  q: 'Where does the data come from?',
                  a: 'Verified primary sources only. We share specifics with you privately during onboarding — we keep our data architecture out of public view to stay ahead of copy-cats.',
                },
                {
                  q: 'When is RealSight available outside Dubai?',
                  a: 'Additional markets are coming through 2026. Founder advisers get first access as we roll out — and your locked-in price covers them.',
                },
                {
                  q: 'Why isn\'t this page more detailed?',
                  a: 'Honest answer: this is an advisor-facing product, and we don\'t want to hand a step-by-step blueprint to competitors. Start the free trial or book a private demo, and we\'ll show you everything.',
                },
              ].map((f) => (
                <div key={f.q} className="glass-card p-5">
                  <h3 className="font-semibold text-foreground text-sm mb-2">{f.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
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
              <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
                Stop building decks. <span className="text-accent-gradient">Start closing deals.</span>
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Sign up in 30 seconds. Brand it in 5 minutes. Invite your
                first client today.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  asChild
                  size="lg"
                  className="bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold px-8 py-6 rounded-full shadow-lg shadow-primary/30 text-base"
                >
                  <Link to="/login?mode=signup&plan=adviser_pro&role=advisor">
                    Start Your Free Trial
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="rounded-full px-8 py-6 text-base border-border/50"
                >
                  <a href="mailto:hello@realsight.app?subject=Adviser%20Pro%20demo">
                    <Eye className="mr-2 h-4 w-4" />
                    Private Demo
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        <PublicFooter />
      </div>
    </PublicLayout>
  );
}
