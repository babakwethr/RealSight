/**
 * Privacy Policy — required legal page. Covers UAE PDPL + GDPR basics.
 * Review with a privacy lawyer before scaling internationally.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function Privacy() {
  return (
    <div className="min-h-screen cinematic-bg">
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/"><Logo variant="white" className="h-7 w-auto" /></Link>
          <Link to="/" className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-black text-foreground mb-2" style={{ letterSpacing: '-0.02em' }}>
          Privacy <span className="gradient-word">Policy</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 15 April 2026</p>

        <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-lg font-black text-foreground mb-2">1. Who we are</h2>
            <p>RealSight Inc. ("we", "us", "RealSight") is the data controller for personal information collected through realsight.app. We are a Delaware C-Corporation registered at 1209 Orange Street, Wilmington, Delaware 19801, USA. For privacy inquiries, contact <a href="mailto:privacy@realsight.app" className="text-primary hover:text-primary/80">privacy@realsight.app</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">2. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-foreground">Account data:</strong> name, email, password (hashed), role (investor/adviser), language preference, phone (optional).</li>
              <li><strong className="text-foreground">Portfolio data you provide:</strong> properties, payment schedules, documents you upload.</li>
              <li><strong className="text-foreground">Usage data:</strong> pages visited, searches performed, features used, session duration, device/browser type.</li>
              <li><strong className="text-foreground">Billing data:</strong> processed by Stripe — we never see or store full card numbers. We store a Stripe customer ID and subscription status.</li>
              <li><strong className="text-foreground">AI interactions:</strong> your prompts and generated outputs from AI Concierge and Deal Analyzer are stored to maintain conversation history. These may be processed by Google Gemini.</li>
              <li><strong className="text-foreground">OAuth data:</strong> if you sign up with Google, we receive your name, email, and profile picture.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">3. How we use your data</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Provide and operate the Service (authentication, portfolio tracking, report generation)</li>
              <li>Process payments and manage subscriptions via Stripe</li>
              <li>Send transactional emails (signup confirmation, trial reminders, payment receipts)</li>
              <li>Improve the Service through usage analytics</li>
              <li>Comply with legal obligations (tax, anti-money-laundering, fraud prevention)</li>
              <li>Generate AI-powered analysis when you request it</li>
            </ul>
            <p className="mt-2">We do not sell your personal information. We do not use your data to train public AI models.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">4. Legal basis (GDPR)</h2>
            <p>Where GDPR applies, we process personal data under: <strong>contract</strong> (to deliver the Service you signed up for), <strong>legitimate interests</strong> (security, analytics), <strong>consent</strong> (marketing emails, optional cookies), and <strong>legal obligation</strong> (accounting, AML).</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">5. Third-party processors</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li><strong className="text-foreground">Supabase</strong> — database, authentication, file storage (EU region available)</li>
              <li><strong className="text-foreground">Stripe</strong> — payment processing (PCI-DSS Level 1 certified)</li>
              <li><strong className="text-foreground">Vercel</strong> — web hosting</li>
              <li><strong className="text-foreground">Google</strong> — Gemini AI (for Deal Analyzer + AI Concierge), Google OAuth</li>
              <li><strong className="text-foreground">Resend / similar</strong> — transactional email (if applicable)</li>
            </ul>
            <p className="mt-2">Each processor has their own privacy policy and implements appropriate security controls.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">6. Your rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 mt-2">
              <li><strong className="text-foreground">Access</strong> the personal data we hold about you</li>
              <li><strong className="text-foreground">Correct</strong> inaccurate data via your account settings</li>
              <li><strong className="text-foreground">Delete</strong> your account and all associated data</li>
              <li><strong className="text-foreground">Export</strong> your data in a portable format</li>
              <li><strong className="text-foreground">Object to</strong> or <strong className="text-foreground">restrict</strong> processing in certain cases</li>
              <li><strong className="text-foreground">Withdraw consent</strong> for marketing at any time</li>
            </ul>
            <p className="mt-2">To exercise these rights, email <a href="mailto:privacy@realsight.app" className="text-primary hover:text-primary/80">privacy@realsight.app</a>. We respond within 30 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">7. Data retention</h2>
            <p>We retain your account and portfolio data for as long as your account is active. After deletion, personal data is removed within 30 days, except where we must retain it by law (e.g., US tax / accounting records, EU data retention rules where applicable). Backups are rotated within 90 days.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">8. Cookies and tracking</h2>
            <p>We use strictly necessary cookies for authentication and session management. We do not use third-party advertising cookies. Any analytics we deploy (e.g., privacy-first tools) are configured without personal identifiers where possible.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">9. Security</h2>
            <p>We implement industry-standard security controls: TLS 1.3 encryption in transit, encryption at rest, password hashing, role-based access, and regular security reviews. No system is 100% secure — if you believe your account has been compromised, email <a href="mailto:security@realsight.app" className="text-primary hover:text-primary/80">security@realsight.app</a>.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">10. International data transfers</h2>
            <p>RealSight Inc. is US-incorporated. Data is primarily processed on EU servers (Supabase) and US servers (Stripe, Vercel, Google). Cross-border transfers use Standard Contractual Clauses, the EU-US Data Privacy Framework, or equivalent safeguards.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">11. Children</h2>
            <p>RealSight is not intended for users under 18. We do not knowingly collect data from minors. If we learn we have, we will delete it.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">12. Changes to this policy</h2>
            <p>We may update this policy. Material changes will be communicated by email or in-app notice at least 14 days before taking effect.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">13. Contact</h2>
            <p>Questions about this policy or your data: <a href="mailto:privacy@realsight.app" className="text-primary hover:text-primary/80">privacy@realsight.app</a></p>
          </section>
        </div>
      </article>
    </div>
  );
}
