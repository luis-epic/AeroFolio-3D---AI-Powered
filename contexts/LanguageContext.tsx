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

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('en');

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
