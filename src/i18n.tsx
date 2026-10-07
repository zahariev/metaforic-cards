import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import bg from "./locales/bg.json";
import en from "./locales/en.json";
import { buildCategories, buildLibrary } from "./data";

// Bulgarian is the source language: any key missing in another locale falls
// back to it, and a key missing everywhere is shown as-is.
export const languages = [
  { code: "bg", short: "BG", label: "Български" },
  { code: "en", short: "EN", label: "English" },
] as const;
export type Lang = (typeof languages)[number]["code"];
type Dict = { [key: string]: string | Dict | Dict[] | string[] };
const dicts: Record<Lang, Dict> = { bg, en };
const STORAGE_KEY = "mc-lang";

function node(dict: Dict, key: string): unknown {
  let n: unknown = dict;
  for (const part of key.split(".")) {
    if (n === null || typeof n !== "object") return undefined;
    n = (n as Record<string, unknown>)[part];
  }
  return n;
}
function lookup(dict: Dict, key: string): string | undefined {
  const n = node(dict, key);
  return typeof n === "string" ? n : undefined;
}

export type Vars = Record<string, string | number>;
export type Translate = (key: string, vars?: Vars) => string;

// `{{name}}` is replaced from vars. With a numeric `count`, the plural form
// `key_one` / `key_other` is used when the locale defines it.
export function translate(lang: Lang, key: string, vars?: Vars): string {
  const find = (k: string) => lookup(dicts[lang], k) ?? lookup(dicts.bg, k);
  let text: string | undefined;
  if (typeof vars?.count === "number") {
    const form = new Intl.PluralRules(lang).select(vars.count);
    text = find(`${key}_${form}`) ?? find(`${key}_other`);
  }
  text ??= find(key) ?? key;
  return vars
    ? text.replace(/\{\{(\w+)\}\}/g, (m, name) =>
        name in vars ? String(vars[name]) : m,
      )
    : text;
}

// A JSON array of strings, e.g. a list of questions.
export function translateList(lang: Lang, key: string): string[] {
  const isList = (n: unknown): n is string[] =>
    Array.isArray(n) && n.every((v) => typeof v === "string");
  const n = node(dicts[lang], key);
  if (isList(n)) return n;
  const fallback = node(dicts.bg, key);
  return isList(fallback) ? fallback : [];
}

const initialLang = (): Lang => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in dicts) return stored as Lang;
  } catch {
    // Storage can be unavailable (private mode); fall back to Bulgarian.
  }
  return "bg";
};

const I18nContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translate;
  tList: (key: string) => string[];
} | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Lang>(initialLang);
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Not persisted; the choice still applies for this visit.
    }
    document.documentElement.lang = lang;
    document.title = translate(lang, "app.title");
  }, [lang]);
  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: string, vars?: Vars) => translate(lang, key, vars),
      tList: (key: string) => translateList(lang, key),
    }),
    [lang],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider");
  return ctx;
}

// Exercise and category data in the current language.
export function useLibrary() {
  const { lang, t } = useI18n();
  return useMemo(
    () => ({ lang, categories: buildCategories(t), ...buildLibrary(t) }),
    [lang, t],
  );
}

// Labels for saved answers. Answers are stored under fixed Bulgarian keys
// (e.g. "Финален_размисъл", "Отговор_3", "Мост_0_1", or a whole prompt
// sentence), so drafts and notes stay valid across languages. The locale's
// flat `answers` table maps such a key to the label to display: exact keys
// first, then numbered keys by their "Prefix_" part, with the numbers in
// {{n}}. Unknown keys are shown as-is.
export function answerLabel(lang: Lang, key: string) {
  const table = (l: Lang) => (dicts[l].answers ?? {}) as Record<string, string>;
  const find = (k: string) => table(lang)[k] ?? table("bg")[k];
  const numbered = key.match(/^(.*?_)(\d+(?:_\d+)*)$/);
  const text =
    find(key) ??
    (numbered && find(numbered[1])?.replace("{{n}}", numbered[2].replaceAll("_", " ")));
  return text ?? key.replaceAll("_", " ");
}

export function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="lang-switch" role="group" aria-label={t("app.language")}>
      {languages.map((l) => (
        <button
          key={l.code}
          type="button"
          lang={l.code}
          className={l.code === lang ? "on" : ""}
          aria-pressed={l.code === lang}
          title={l.label}
          onClick={() => setLang(l.code)}
        >
          {l.short}
        </button>
      ))}
    </div>
  );
}
