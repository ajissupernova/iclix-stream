import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getLanguage,
  setLanguage,
  subscribeLanguage,
  type ApiLanguage,
} from "../api/client";
import { copyFor, type Copy } from "../i18n";

interface LanguageValue {
  lang: ApiLanguage;
  isEn: boolean;
  copy: Copy;
  setLang: (next: ApiLanguage) => void;
}

const LanguageContext = createContext<LanguageValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<ApiLanguage>(getLanguage);

  useEffect(() => subscribeLanguage(() => setLangState(getLanguage())), []);

  // Atribut lang harus mengikuti bahasa antarmuka yang sedang aktif.
  useEffect(() => {
    document.documentElement.lang = lang === "en-US" ? "en" : "id";
  }, [lang]);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      isEn: lang === "en-US",
      copy: copyFor(lang),
      setLang: (next) => setLanguage(next),
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage harus dipakai di dalam LanguageProvider");
  return ctx;
}
