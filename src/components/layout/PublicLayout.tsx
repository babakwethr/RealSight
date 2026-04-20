import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LogIn, Menu, X, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    // Check stored theme or default to dark
    const stored = localStorage.getItem('realsight-theme');
    if (stored === 'light') {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('realsight-theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
      localStorage.setItem('realsight-theme', 'dark');
    }
    setIsDark(!isDark);
  };

  const navItems = [
    { title: 'Features', url: '#features' },
    { title: 'Markets', url: '#markets' },
    { title: 'Pricing', url: '#pricing' },
  ];

  return (
    <div className="min-h-screen w-full relative overflow-hidden bg-background">
      {/* Top Navigation Bar */}
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/30'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <Logo variant={isDark ? 'white' : 'black'} height="h-9" />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1 rounded-full px-2 py-1 bg-muted/30 border border-border/30">
              {navItems.map((item) => (
                <a
                  key={item.title}
                  href={item.url}
                  className="text-sm font-medium transition-colors px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  {item.title}
                </a>
              ))}
            </nav>

            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Button
                asChild
                variant="ghost"
                className="rounded-full text-sm text-muted-foreground hover:text-foreground"
              >
                <Link to="/login">Sign In</Link>
              </Button>
              <Button
                asChild
                className="bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold rounded-full px-5 shadow-sm"
              >
                <Link to="/login?mode=signup">
                  Get Started
                </Link>
              </Button>
            </div>

            {/* Mobile Actions */}
            <div className="md:hidden flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                aria-label="Toggle theme"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-foreground hover:bg-muted/30 rounded-full h-10 w-10"
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-background/95 backdrop-blur-xl border-b border-border/30 animate-slide-down">
            <div className="px-4 pt-2 pb-6 space-y-1">
              {navItems.map((item) => (
                <a
                  key={item.title}
                  href={item.url}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center px-4 py-3 rounded-lg transition-colors text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                >
                  <span className="font-medium">{item.title}</span>
                </a>
              ))}
              <div className="pt-3 mt-2 border-t border-border/30 space-y-2">
                <Button
                  asChild
                  variant="outline"
                  className="w-full rounded-lg"
                >
                  <Link to="/login" onClick={() => setIsMobileMenuOpen(false)}>
                    Sign In
                  </Link>
                </Button>
                <Button
                  asChild
                  className="w-full bg-primary hover:bg-accent-green-dark text-primary-foreground font-semibold rounded-lg"
                >
                  <Link to="/login?mode=signup" onClick={() => setIsMobileMenuOpen(false)}>
                    Get Started
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex min-h-screen w-full flex-col">
        <div className="flex-1 w-full pt-16 sm:pt-20">
          {children}
        </div>
      </main>
    </div>
  );
}
