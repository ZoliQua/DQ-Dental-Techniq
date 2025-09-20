import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getTranslations } from '../i18n';
import type { AppLanguage, TranslationKeys } from '../i18n';

interface I18nContextValue {
  t: TranslationKeys;
  language: AppLanguage;
  setLanguage: (lang: AppLanguage) => void;
}

const LANG_KEY = 'dq-techniq-lang';

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLang] = useState<AppLanguage>(
    () => (localStorage.getItem(LANG_KEY) as AppLanguage) || 'hu',
  );

  const setLanguage = useCallback((lang: AppLanguage) => {
    localStorage.setItem(LANG_KEY, lang);
    setLang(lang);
  }, []);

  const t = getTranslations(language);

  return (
    <I18nContext.Provider value={{ t, language, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
