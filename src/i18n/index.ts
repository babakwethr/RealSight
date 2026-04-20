import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

const i18n = createInstance();

import en from './locales/en.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import fa from './locales/fa.json';
import ru from './locales/ru.json';

const rtlLanguages = ['ar', 'fa'];

// Get saved language or detect from browser
const getSavedLanguage = (): string => {
  const saved = localStorage.getItem('preferredLanguage');
  if (saved) return saved;
  
  const browserLang = navigator.language.split('-')[0];
  const supportedLangs = ['en', 'ar', 'es', 'fr', 'fa', 'ru'];
  return supportedLangs.includes(browserLang) ? browserLang : 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      ar: { translation: ar },
      es: { translation: es },
      fr: { translation: fr },
      fa: { translation: fa },
      ru: { translation: ru },
    },
    lng: getSavedLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Set initial RTL direction
const initialLang = getSavedLanguage();
document.documentElement.dir = rtlLanguages.includes(initialLang) ? 'rtl' : 'ltr';
document.documentElement.lang = initialLang;

// Update direction on language change
i18n.on('languageChanged', (lng) => {
  document.documentElement.dir = rtlLanguages.includes(lng) ? 'rtl' : 'ltr';
  document.documentElement.lang = lng;
});

export default i18n;
