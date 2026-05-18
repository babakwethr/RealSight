/**
 * PublicFooter — global footer for marketing + legal pages.
 *
 * Corporate ownership: RealSight is a product of **ADRO LAB Inc.**, a
 * Delaware C-Corporation. The product brand is "RealSight"; the legal
 * entity is ADRO LAB Inc. All trust / legal / compliance surface area
 * names ADRO LAB Inc. as the contracting party.
 *
 * Per LAUNCH_PLAN.md §12 ("International positioning"):
 *  - Delaware US incorporation address visible everywhere
 *  - Trust strip: SOC 2 / GDPR / 256-bit / Never shared with brokers
 *  - "/security" link prominent
 *  - All emails @realsight.app (product domain)
 */
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { Shield, Lock, Globe, UserX } from 'lucide-react';

const TRUST_BADGES = [
  { icon: Shield, label: 'SOC 2 (in progress)' },
  { icon: Globe, label: 'GDPR + UK GDPR' },
  { icon: Lock, label: '256-bit encryption' },
  { icon: UserX, label: 'Never shared with brokers' },
];

export function PublicFooter() {
  return (
    <footer className="border-t border-white/[0.05] bg-black/20 mt-10">
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        {/* Trust strip — always visible */}
        <div className="flex flex-wrap gap-x-5 gap-y-2 mb-8 pb-6 border-b border-white/[0.05]">
          {TRUST_BADGES.map((b) => (
            <div key={b.label} className="flex items-center gap-1.5 text-[11px] text-white/55">
              <b.icon className="h-3 w-3 text-primary/80" />
              <span>{b.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
          {/* Brand */}
          <div className="max-w-sm">
            <Logo variant="white" className="h-6 w-auto mb-3" />
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              Property intelligence backed by official government registries —
              FHFA, HM Land Registry, and DLD. Built for serious investors
              across the US, UK, and UAE.
            </p>
            <p className="text-[10px] text-white/35 leading-relaxed">
              RealSight is a product of{' '}
              <strong className="text-white/55">ADRO LAB Inc.</strong>
              <br />
              1209 Orange Street, Wilmington, Delaware 19801, USA
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mb-3">Markets</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/market/us" className="text-white/60 hover:text-white transition-colors">🇺🇸 United States</Link></li>
                <li><Link to="/market/uk" className="text-white/60 hover:text-white transition-colors">🇬🇧 United Kingdom</Link></li>
                <li><Link to="/" className="text-white/60 hover:text-white transition-colors">🇦🇪 United Arab Emirates</Link></li>
                <li><Link to="/off-plan" className="text-white/60 hover:text-white transition-colors">🌏 Off-Plan Inventory</Link></li>
                <li><Link to="/radar" className="text-white/60 hover:text-white transition-colors">Global Radar</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mb-3">Product</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/deal-analyzer" className="text-white/60 hover:text-white transition-colors">Deal Analyzer</Link></li>
                <li><Link to="/projects" className="text-white/60 hover:text-white transition-colors">New Launches</Link></li>
                <li><Link to="/for-advisers" className="text-white/60 hover:text-white transition-colors">For Advisers</Link></li>
                <li><Link to="/billing" className="text-white/60 hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mb-3">Company</p>
              <ul className="space-y-2 text-xs">
                <li><a href="mailto:hello@realsight.app" className="text-white/60 hover:text-white transition-colors">Contact</a></li>
                <li><a href="mailto:support@realsight.app" className="text-white/60 hover:text-white transition-colors">Support</a></li>
                <li><Link to="/security" className="text-white/60 hover:text-white transition-colors">Security</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mb-3">Legal</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/terms" className="text-white/60 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-white/60 hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/security" className="text-white/60 hover:text-white transition-colors">Security & Trust</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t border-white/[0.05]">
          <p className="text-[11px] text-white/40">
            © {new Date().getFullYear()} ADRO LAB Inc. · Delaware, USA · All rights reserved
          </p>
          <p className="text-[10px] text-white/30 max-w-md sm:text-right">
            RealSight is an app by ADRO LAB Inc. We are an independent software
            platform — we do not employ real estate agents and never share your
            portfolio with brokers.
          </p>
        </div>
      </div>
    </footer>
  );
}
