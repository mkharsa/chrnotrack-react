import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { fr } from "./translations/fr";
import { en } from "./translations/en";
import type { Translations } from "./translations/fr";

type Lang = "fr" | "en";

const STORAGE_KEY = "ct_lang";

const translations: Record<Lang, Translations> = { fr, en };

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({ lang: "fr", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "en" ? "en" : "fr";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}

export function useT(): Translations {
  const { lang } = useContext(LangContext);
  return translations[lang];
}
