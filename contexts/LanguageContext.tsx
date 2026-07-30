import React, { createContext, useContext, useEffect, useState } from 'react';
import { TRANSLATIONS, Language } from '../translations';

// Maps app languages to valid BCP 47 tags for the <html lang> attribute.
const HTML_LANG: Record<Language, string> = {
  en: 'en',
  es: 'es',
  zh: 'zh-Hans',
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof TRANSLATIONS['en'];
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Helper function to detect starting language
const detectInitialLanguage = (): Language => {
  if (typeof window === 'undefined') return 'en';
  
  // 1. URL Parameter Priority (for search engine crawlers and deep links)
  const params = new URLSearchParams(window.location.search);
  const langParam = params.get('lang');
  if (langParam === 'en' || langParam === 'es' || langParam === 'zh') {
    localStorage.setItem('aerofolio_lang', langParam);
    return langParam;
  }

  // 2. Local Storage Priority (for returning users)
  const storedLang = localStorage.getItem('aerofolio_lang');
  if (storedLang === 'en' || storedLang === 'es' || storedLang === 'zh') {
    return storedLang;
  }

  // 3. Browser Language Priority
  const browserLang = navigator.language.split('-')[0];
  if (browserLang === 'es') return 'es';
  if (browserLang === 'zh') return 'zh';

  return 'en';
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => detectInitialLanguage());

  const setLanguage = (lang: Language) => {
    React.startTransition(() => {
      setLanguageState(lang);
      localStorage.setItem('aerofolio_lang', lang);
      
      // Update HTML lang attribute dynamically for SEO and screen readers
      if (typeof document !== 'undefined') {
        document.documentElement.lang = lang;
      }
    });
  };

  // Keep <html lang> in sync with the selected language. Without this the
  // document stays "en" while the UI renders Spanish or Chinese, which makes
  // screen readers apply the wrong pronunciation rules.
  useEffect(() => {
    document.documentElement.lang = HTML_LANG[language];
  }, [language]);

  const value = {
    language,
    setLanguage,
    t: TRANSLATIONS[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
