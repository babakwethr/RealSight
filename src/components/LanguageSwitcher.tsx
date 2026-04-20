import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const languages = [
  { code: 'en', name: 'English', flag: '🇬🇧', dir: 'ltr' },
  { code: 'ar', name: 'العربية', flag: '🇦🇪', dir: 'rtl' },
  { code: 'es', name: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷', dir: 'rtl' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺', dir: 'ltr' },
];

export function LanguageSwitcher() {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];

  const handleLanguageChange = (langCode: string) => {
    const lang = languages.find(l => l.code === langCode);
    if (lang) {
      i18n.changeLanguage(langCode);
      document.documentElement.dir = lang.dir;
      document.documentElement.lang = langCode;
      localStorage.setItem('preferredLanguage', langCode);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-foreground/70 hover:text-foreground hover:bg-white/5 transition-all duration-200 w-full"
      >
        <Globe className="h-4 w-4 text-primary/70" />
        <span className="flex-1 text-left">{currentLang.flag} {currentLang.name}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 mt-1 z-50 glass-panel border border-glass-border rounded-xl overflow-hidden shadow-lg">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={cn(
                  "flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors",
                  lang.code === currentLang.code
                    ? "bg-primary/10 text-primary"
                    : "text-foreground/70 hover:bg-white/5 hover:text-foreground"
                )}
              >
                <span>{lang.flag}</span>
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
