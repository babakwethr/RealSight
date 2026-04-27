/**
 * Security & Trust — public page that reassures investors RealSight is not
 * a Dubai broker scraping leads. RealSight Inc. is a Delaware C-Corp.
 * Linked from the footer + signup screen. Per LAUNCH_PLAN.md §12.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Lock, Globe, FileCheck, UserX, Database, Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function Security() {
  return (
    <div className="min-h-screen cinematic-bg">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/"><Logo variant="white" className="h-7 w-auto" /></Link>
          <Link to="/" className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] bg-primary/10 text-primary border border-primary/20 mb-4">
            <Shield className="h-3 w-3" />
            Security & Trust
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-foreground mb-3" style={{ letterSpacing: '-0.02em' }}>
            Independent. <span className="gradient-word">Investor-first.</span>
            <br className="hidden sm:block" /> Never sold to brokers.
          </h1>
          <p className="text-base text-muted-foreground leading-relaxed max-w-2xl">
            RealSight Inc. is a Delaware C-Corporation. We do not employ real estate
            agents. We do not sell, share, or market your portfolio data to third
            parties. Ever.
          </p>
        </div>

        {/* Trust badges grid */}
        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {[
            {
              icon: UserX,
              title: 'No agents on staff',
              desc: 'RealSight does not employ or contract real estate brokers. We are not commission-driven. We are a software company.',
            },
            {
              icon: Lock,
              title: '256-bit encryption',
              desc: 'TLS 1.3 in transit, AES-256 at rest. Passwords are bcrypt-hashed. No exceptions.',
            },
            {
              icon: FileCheck,
              title: 'SOC 2 Type II *(in progress)*',
              desc: 'Audit underway with a Big 4 firm. Targeting issuance Q3 2026. Status updates posted on this page.',
            },
            {
              icon: Globe,
              title: 'GDPR + UK GDPR compliant',
              desc: 'EU and UK residents have full rights of access, rectification, erasure, portability, and objection — exercisable in 30 days.',
            },
            {
              icon: Database,
              title: 'Your data stays yours',
              desc: 'We never sell or share your portfolio. We do not provide leads or contact data to brokerages — even paying ones.',
            },
            {
              icon: Shield,
              title: 'Adviser white-label is firewalled',
              desc: 'When an adviser invites you, they see only the data you choose to share. They cannot export your contact details to a CRM.',
            },
          ].map((b) => (
            <div key={b.title} className="glass-card p-5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-3 border border-primary/15">
                <b.icon className="h-4.5 w-4.5 text-primary" />
              </div>
              <h3 className="font-bold text-foreground text-sm mb-1.5">{b.title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{b.desc}</p>
            </div>
          ))}
        </div>

        {/* Long-form sections */}
        <div className="space-y-8 text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-lg font-black text-foreground mb-2">Where we are incorporated</h2>
            <p>
              RealSight Inc. is a Delaware C-Corporation, registered at 1209 Orange
              Street, Wilmington, Delaware 19801, USA. We operate globally and are
              currently live in the United Arab Emirates, with markets in the United
              Kingdom, Singapore, Spain, and the United States planned for 2026.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">How your portfolio data is used</h2>
            <p className="mb-3">
              You add properties, payments, and documents to RealSight to manage
              your own investments. That data is used <strong>only</strong> to:
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Show you your dashboard, valuations, and reports</li>
              <li>Generate the AI insights you request</li>
              <li>Send you transactional emails (signup, billing, alerts you opt into)</li>
              <li>Improve product reliability through aggregate, anonymous metrics</li>
            </ul>
            <p className="mt-3">
              Your data is <strong>not</strong> used to train public AI models, sold
              to advertisers, shared with brokerages, or used to generate cold-call
              lists. There is no commercial path inside RealSight that monetises your
              identity or contact details.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">Where data is stored</h2>
            <p>
              Application data is stored in Supabase (Postgres) in EU-region data
              centres. Backups are encrypted and rotated within 90 days. Payments
              are processed by Stripe (PCI-DSS Level 1). Hosting is on Vercel. AI
              processing uses Google Gemini under standard API terms — your
              individual prompts are not used to train Google's models.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">Reporting a vulnerability</h2>
            <p>
              Found a security issue? Email{' '}
              <a href="mailto:security@realsight.app" className="text-primary hover:text-primary/80">
                security@realsight.app
              </a>
              . We respond within 48 hours and credit responsible disclosure. Please
              do not publish the issue until we've had a chance to fix it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">Questions</h2>
            <p>
              Email{' '}
              <a href="mailto:privacy@realsight.app" className="text-primary hover:text-primary/80">
                privacy@realsight.app
              </a>{' '}
              for anything about your data, or read the full{' '}
              <Link to="/privacy" className="text-primary hover:text-primary/80">Privacy Policy</Link>.
            </p>
          </section>
        </div>

        {/* Footer card */}
        <div className="mt-12 p-6 rounded-2xl border border-white/[0.06] bg-white/[0.02] flex items-start gap-4">
          <Mail className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-foreground text-sm mb-1">RealSight Inc.</p>
            <p className="text-xs text-muted-foreground">
              1209 Orange Street, Wilmington, Delaware 19801, USA
              <br />
              security@realsight.app · privacy@realsight.app
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
