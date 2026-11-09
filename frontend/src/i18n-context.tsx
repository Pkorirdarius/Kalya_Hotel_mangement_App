import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  LANGUAGE_CHANGE_EVENT,
  formatDate as formatDateValue,
  formatMoney as formatMoneyValue,
  getCurrentLanguage,
  initI18n,
  setLanguage as setI18nLanguage,
  t as translate,
} from './i18n';
import type { Language, LanguageChangeDetail } from './types';

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: string) => string;
  formatDate: (iso: string) => string;
  formatMoney: (amount: number) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getCurrentLanguage());

  useEffect(() => {
    initI18n();
    setLanguageState(getCurrentLanguage());

    const handleChange = (event: Event) => {
      const detail = (event as CustomEvent<LanguageChangeDetail>).detail;
      setLanguageState(detail?.language ?? getCurrentLanguage());
    };

    document.addEventListener(LANGUAGE_CHANGE_EVENT, handleChange);
    return () => document.removeEventListener(LANGUAGE_CHANGE_EVENT, handleChange);
  }, []);

  const setLanguage = useCallback((next: Language) => {
    setI18nLanguage(next);
    setLanguageState(next);
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(getCurrentLanguage() === 'en' ? 'sw' : 'en');
  }, [setLanguage]);

  const value = useMemo<I18nContextValue>(
    () => ({
      language,
      setLanguage,
      toggleLanguage,
      t: translate,
      formatDate: formatDateValue,
      formatMoney: formatMoneyValue,
    }),
    [language, setLanguage, toggleLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }
  return context;
}
