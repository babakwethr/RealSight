/**
 * Terms of Service — required legal page per launch checklist.
 * Plain-English, Dubai-jurisdiction friendly. Review with a UAE lawyer before scaling.
 */
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '@/components/Logo';

export default function Terms() {
  return (
    <div className="min-h-screen cinematic-bg">
      {/* Top nav */}
      <div className="sticky top-0 z-50 bg-background/90 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center justify-between">
          <Link to="/"><Logo variant="white" className="h-7 w-auto" /></Link>
          <Link to="/" className="flex items-center gap-1.5 text-white/50 hover:text-white/80 text-sm">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </div>

      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm">
        <h1 className="text-3xl font-black text-foreground mb-2" style={{ letterSpacing: '-0.02em' }}>
          Terms of <span className="gradient-word">Service</span>
        </h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: 15 April 2026</p>

        <div className="space-y-6 text-sm text-foreground/80 leading-relaxed">
          <section>
            <h2 className="text-lg font-black text-foreground mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using RealSight ("the Service", "the Platform"), operated by RealSight FZ-LLC (or successor entity) from Dubai, UAE, you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">2. Description of Service</h2>
            <p>RealSight provides a subscription-based software platform for Dubai real estate intelligence, including market data analysis, AI-generated investment analysis, portfolio tracking, and report generation. All data is sourced from publicly available Dubai Land Department (DLD) records and third-party data providers.</p>
            <p className="mt-2"><strong className="text-foreground">RealSight is not a licensed real estate broker, financial advisor, investment advisor, or legal consultant.</strong> The Service provides informational tools only. Users should consult qualified professionals before making investment decisions.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">3. Account Registration</h2>
            <p>You must provide accurate information when creating an account. You are responsible for maintaining the confidentiality of your credentials and for all activities under your account. You must be at least 18 years old to register.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">4. Subscription Plans and Billing</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Paid plans (Investor Pro $999/mo · Adviser Pro $199/mo — currently 50% OFF as a launch promotion until 31 May 2026; see <a href="/billing" className="underline">current pricing</a>) include a 30-day free trial, one per account. Trial eligibility is determined solely by RealSight.</li>
              <li>Payment is processed by Stripe. You authorise recurring monthly charges to your provided payment method at the end of your trial period and each subsequent billing cycle.</li>
              <li>You may cancel at any time from your account. Cancellation stops future charges; no refund is issued for the current billing period unless required by law.</li>
              <li>Prices are shown in USD and exclude applicable taxes.</li>
              <li>Failed payments may result in immediate feature restriction.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">5. Intellectual Property</h2>
            <p>All Service content, branding, code, designs, and AI-generated outputs are the property of RealSight or its licensors. You receive a limited, non-exclusive, non-transferable license to use the Service for its intended purpose. You may download and share individual PDF reports you generate for your own legitimate business use, including sharing with prospective clients.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">6. Prohibited Use</h2>
            <p>You may not: (a) reverse-engineer the Service, (b) scrape or bulk-export data beyond the intended UI, (c) resell or white-label the Service without a written agreement, (d) use the Service for any unlawful purpose, (e) submit false information, (f) attempt to circumvent trial or billing controls, (g) share your account with third parties.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">7. Data Sources and Accuracy Disclaimer</h2>
            <p>RealSight displays market data derived from DLD and other public sources. Data may be delayed, incomplete, or contain errors. AI-generated analysis, investment verdicts, and reports are computational estimates and <strong>do not constitute financial or investment advice</strong>. RealSight makes no warranties about accuracy, completeness, or suitability of any data or recommendation.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">8. Limitation of Liability</h2>
            <p>To the maximum extent permitted by UAE law, RealSight, its directors, employees and affiliates are not liable for any indirect, incidental, special, consequential or exemplary damages, including loss of profits, investment losses, or damages arising from decisions made based on information provided by the Service. Total liability to any user is limited to the amount paid for the Service in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">9. Termination</h2>
            <p>We may suspend or terminate your account at any time for violation of these Terms, suspected fraud, or at our reasonable discretion. You may terminate at any time by cancelling your subscription and requesting account deletion.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">10. Changes to Terms</h2>
            <p>We may update these Terms from time to time. Material changes will be communicated via email or in-app notice at least 14 days in advance. Continued use after the effective date constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">11. Governing Law and Jurisdiction</h2>
            <p>These Terms are governed by the laws of the State of Delaware, USA. Any dispute shall be resolved exclusively in the state and federal courts of Delaware, with each party submitting to the personal jurisdiction of those courts.</p>
          </section>

          <section>
            <h2 className="text-lg font-black text-foreground mb-2">12. Contact</h2>
            <p>For questions about these Terms, contact us at <a href="mailto:legal@realsight.app" className="text-primary hover:text-primary/80">legal@realsight.app</a>.</p>
          </section>
        </div>
      </article>
    </div>
  );
}
