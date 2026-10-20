import { useEffect, useState } from "react";
import { type Item, type Lang } from "../../../shared/rpc";
import { fmtDay, useT } from "../../i18n";
import { api } from "../../rpc";

export const uiLang = (): Lang => (document.documentElement.lang === "fr" ? "fr" : "en");

export const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time

export const day = (date: string) => fmtDay(`${date}T00:00`, uiLang()); // local midnight, no day shift

// "18,4" → 1840. Up to 2 decimals, null if not a price.
export function parseCents(s: string) {
  const m = /^\s*(\d+)(?:[.,](\d{1,2}))?\s*$/.exec(s);
  return m ? Number(m[1]) * 100 + Number((m[2] ?? "").padEnd(2, "0")) : null;
}

export const centsText = (c: number) => (c / 100).toFixed(2);

export function useCurrency() {
  const [currency, setCurrency] = useState("");
  useEffect(() => {
    api.getCurrency({}).then(setCurrency);
  }, []);
  return currency;
}

export function specFacts(i: Item, t: ReturnType<typeof useT>) {
  const f = (label: string, value: string, code = "") => ({ label, value, code });
  return [
    f(t("items.seller"), i.seller.name, i.seller.code),
    f(t(`items.typeLabel.${i.kind}`), i.type.name, i.type.code),
    ...(i.kind === "material"
      ? [
          ...(i.colour ? [f(t("items.colour"), i.colour.name, i.colour.code)] : []),
          ...(i.finish ? [f(t("items.finish"), i.finish.name, i.finish.code)] : []),
          f(t("items.size"), i.size!),
        ]
      : [f(t("items.specs"), i.specs.join(" · "))]),
  ];
}
