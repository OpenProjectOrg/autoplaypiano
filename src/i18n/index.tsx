import React, { createContext, useContext, useState } from "react";
import { id } from "./id";
import { en } from "./en";

export type Language = "id" | "en";

export type TranslationSchema = typeof id;

// Helper to resolve dot-separated paths like "sidebar.player"
type PathsToStringProps<T> = T extends string
  ? []
  : {
      [K in Extract<keyof T, string>]: [K, ...PathsToStringProps<T[K]>];
    }[Extract<keyof T, string>];

type Join<T extends string[], D extends string> = T extends []
  ? never
  : T extends [infer F]
  ? F
  : T extends [infer F, ...infer R]
  ? F extends string
    ? `${F}${D}${Join<Extract<R, string[]>, D>}`
    : never
  : string;

export type TranslationKey = Join<PathsToStringProps<TranslationSchema>, ".">;

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (path: TranslationKey, params?: Record<string, string | number>) => string;
}

const LOCAL_STORAGE_LANG_KEY = "autopiano_selected_language";

const I18nContext = createContext<I18nContextType | null>(null);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_LANG_KEY);
      if (saved === "id" || saved === "en") {
        return saved;
      }
      // Detect browser language
      if (typeof navigator !== "undefined" && navigator.language?.toLowerCase().startsWith("id")) {
        return "id";
      }
    } catch {
      // fallback
    }
    return "id";
  });

  const setLang = (nextLang: Language) => {
    setLangState(nextLang);
    try {
      localStorage.setItem(LOCAL_STORAGE_LANG_KEY, nextLang);
    } catch {}
  };

  const toggleLang = () => {
    setLang(lang === "id" ? "en" : "id");
  };

  // Safe resolver for nested dictionary keys
  const t = (path: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = lang === "en" ? en : id;
    const parts = path.split(".");
    let current: unknown = dict;

    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = (current as Record<string, unknown>)[part];
      } else {
        // Fallback to Indonesian if missing in English
        let fallback: unknown = id;
        for (const fbPart of parts) {
          if (fallback && typeof fallback === "object" && fbPart in fallback) {
            fallback = (fallback as Record<string, unknown>)[fbPart];
          } else {
            return path;
          }
        }
        current = fallback;
        break;
      }
    }

    if (typeof current !== "string") {
      return path;
    }

    let result = current;
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        result = result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value));
      }
    }
    return result;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export function useTranslation() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return ctx;
}
