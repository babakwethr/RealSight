/**
 * PublicFooter — shown at the bottom of public pages (home, terms, privacy, login).
 * Per DESIGN.md: glass, minimal, links to legal pages.
 */
import { Link } from 'react-router-dom';
import { Logo } from '@/components/Logo';

export function PublicFooter() {
  return (
    <footer className="border-t border-white/[0.05] bg-black/20 mt-10">
      <div className="max-w-[1400px] mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-8">
          {/* Brand */}
          <div className="max-w-sm">
            <Logo variant="white" className="h-6 w-auto mb-3" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              Dubai real estate intelligence for serious investors and advisers.
              Real DLD data. AI-powered insights. Professional reports.
            </p>
          </div>

          {/* Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mb-3">Product</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/" className="text-white/60 hover:text-white transition-colors">Market</Link></li>
                <li><Link to="/deal-analyzer" className="text-white/60 hover:text-white transition-colors">Deal Analyzer</Link></li>
                <li><Link to="/projects" className="text-white/60 hover:text-white transition-colors">New Launches</Link></li>
                <li><Link to="/billing" className="text-white/60 hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mb-3">Company</p>
              <ul className="space-y-2 text-xs">
                <li><a href="mailto:hello@realsight.app" className="text-white/60 hover:text-white transition-colors">Contact</a></li>
                <li><a href="mailto:support@realsight.app" className="text-white/60 hover:text-white transition-colors">Support</a></li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.15em] text-white/35 mb-3">Legal</p>
              <ul className="space-y-2 text-xs">
                <li><Link to="/terms" className="text-white/60 hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="text-white/60 hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t border-white/[0.05]">
          <p className="text-[11px] text-white/40">
            © {new Date().getFullYear()} RealSight · All rights reserved
          </p>
          <p className="text-[10px] text-white/30">
            RealSight is not a licensed real estate broker or financial advisor. All data is informational.
          </p>
        </div>
      </div>
    </footer>
  );
}
