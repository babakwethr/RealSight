/**
 * 404 — per DESIGN.md, matches app CI (cinematic bg, gradient heading, glass cards)
 */
import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, Search, ArrowRight } from "lucide-react";
import { Logo } from '@/components/Logo';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen cinematic-bg flex flex-col">
      <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-white/[0.05]">
        <div className="max-w-[1400px] mx-auto px-6 h-14 flex items-center">
          <Link to="/"><Logo variant="white" className="h-7 w-auto" /></Link>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md w-full text-center">
          <div className="mb-8">
            <h1 className="text-[120px] font-black leading-none mb-2 gradient-heading"
              style={{ letterSpacing: '-0.04em' }}>
              404
            </h1>
            <p className="text-xl font-black text-foreground mb-2">Page not found</p>
            <p className="text-sm text-muted-foreground">
              The page at <code className="text-primary font-mono text-xs px-1.5 py-0.5 rounded bg-primary/10">{location.pathname}</code> doesn't exist or has moved.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <Link to="/"
              className="group flex items-center gap-3 p-4 rounded-2xl backdrop-blur-md bg-white/[0.04] border border-white/[0.08] hover:border-primary/30 hover:bg-primary/[0.05] transition-all">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-foreground">Go Home</p>
                <p className="text-xs text-muted-foreground">Back to market data</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
            <Link to="/market-intelligence"
              className="group flex items-center gap-3 p-4 rounded-2xl backdrop-blur-md bg-white/[0.04] border border-white/[0.08] hover:border-primary/30 hover:bg-primary/[0.05] transition-all">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center shrink-0">
                <Search className="h-5 w-5 text-blue-400" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-foreground">Search Areas</p>
                <p className="text-xs text-muted-foreground">Explore Dubai market</p>
              </div>
              <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </Link>
          </div>

          <p className="text-xs text-muted-foreground">
            If you believe this is a bug, email{' '}
            <a href="mailto:support@realsight.app" className="text-primary hover:text-primary/80">support@realsight.app</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
