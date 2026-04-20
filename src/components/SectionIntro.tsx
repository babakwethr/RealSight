import { useState, useEffect } from 'react';
import { X, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SectionIntroProps {
  id: string;
  title: string;
  description: string;
}

export function SectionIntro({ id, title, description }: SectionIntroProps) {
  const storageKey = `realsight_intro_${id}`;
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const dismissed = localStorage.getItem(storageKey);
    if (!dismissed) {
      setIsVisible(true);
    }
  }, [storageKey]);

  if (!isVisible) return null;

  const handleDismiss = () => {
    localStorage.setItem(storageKey, 'true');
    setIsVisible(false);
  };

  return (
    <div className="mb-6 relative overflow-hidden bg-primary/10 border border-primary/20 rounded-xl p-4 sm:p-5 flex gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
      <div className="hidden sm:flex mt-1 h-8 w-8 rounded-full bg-primary/20 items-center justify-center shrink-0">
        <Info className="h-4 w-4 text-primary" />
      </div>
      <div className="flex-1 pr-8">
        <h3 className="font-semibold text-foreground flex items-center gap-2">
          <Info className="h-4 w-4 text-primary sm:hidden" />
          {title}
        </h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          {description}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-foreground rounded-full"
        onClick={handleDismiss}
      >
        <X className="h-4 w-4" />
        <span className="sr-only">Dismiss</span>
      </Button>
    </div>
  );
}
