import { createContext, useCallback, useContext, useEffect, useState } from "react";
import en from "./locales/en.json";
import es from "./locales/es.json";
import pt from "./locales/pt.json";

export const LANGUAGES = {
  en: { label: "English", flag: "EN" },
  es: { label: "Español", flag: "ES" },
  pt: { label: "Português", flag: "PT" },
} as const;

export type Locale = keyof typeof LANGUAGES;

const dictionaries: Record<Locale, Record<string, string>> = { en, es, pt };

type I18nContextType = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, vars?: Record<string, string>) => string;
};

const I18nContext = createContext<I18nContextType>({
  locale: "en",
  setLocale: () => undefined,
  t: (key: string) => key,
});

export const useTranslation = () => useContext(I18nContext);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const saved = localStorage.getItem("lotero_lang") as Locale | null;
    if (saved && saved in dictionaries) {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem("lotero_lang", l);
  }, []);

  const t = useCallback(
    (key: string, vars?: Record<string, string>): string => {
      let str = dictionaries[locale]?.[key] ?? dictionaries.en[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, v);
        });
      }
      return str;
    },
    [locale],
  );

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function LanguageSelector() {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="language-selector">
      {Object.entries(LANGUAGES).map(([code, { flag }]) => (
        <button
          key={code}
          className={`lang-btn ${locale === code ? "lang-btn-active" : ""}`}
          onClick={() => setLocale(code as Locale)}
        >
          {flag}
        </button>
      ))}
    </div>
  );
}
