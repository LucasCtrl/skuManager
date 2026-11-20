import { createContext, useContext } from "react";
import type { Lang } from "../../shared/rpc";
import { en } from "./en";
import { fr } from "./fr";

const dicts: Record<Lang, Record<string, string>> = { en, fr };

export const detectLang = (): Lang => (navigator.language.startsWith("fr") ? "fr" : "en");

export function makeT(lang: Lang) {
  return (key: string, vars: Record<string, string | number> = {}) =>
    (dicts[lang][key] ?? dicts.en[key] ?? key).replace(/\{(\w+)\}/g, (m, k) =>
      k in vars ? String(vars[k]) : m,
    );
}

export type T = ReturnType<typeof makeT>;
export const TContext = createContext<T>(makeT("en"));
export const useT = () => useContext(TContext);

// Current UI language, for formatters outside React props.
export const uiLang = (): Lang => (document.documentElement.lang === "fr" ? "fr" : "en");

export const locale = (lang: Lang) => (lang === "fr" ? "fr-FR" : "en-GB");
// Day-first formats, as in the design ("14 Sep 2026").
export const fmtDay = (d: string | number, lang: Lang) =>
  new Date(d).toLocaleDateString(locale(lang), { day: "numeric", month: "short", year: "numeric" });
export const fmtDateTime = (d: string | number, lang: Lang) =>
  new Date(d).toLocaleString(locale(lang), {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

// "today" / "yesterday" / "3 Oct" / "3 Oct 2025". Capitalise with CSS where it starts a sentence.
export function fmtRelative(d: string | number, lang: Lang) {
  const date = new Date(d);
  const days = Math.round(
    (new Date().setHours(0, 0, 0, 0) - new Date(date).setHours(0, 0, 0, 0)) / 86_400_000,
  );
  if (days === 0 || days === 1)
    return new Intl.RelativeTimeFormat(locale(lang), { numeric: "auto" }).format(-days, "day");
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(locale(lang), {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}

// "€18.40" / "€18,40": the currency is only a symbol, shown before the amount.
// `value` is in currency units; prices show up to 4 decimals, costs 2.
export const fmtMoney = (value: number, currency: string, lang: Lang, decimals = 2) =>
  currency +
  value.toLocaleString(locale(lang), {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
