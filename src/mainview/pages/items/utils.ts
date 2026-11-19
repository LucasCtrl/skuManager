import { useEffect, useState } from "react";
import { type Item, type Lang } from "../../../shared/rpc";
import { fmtDay, useT } from "../../i18n";
import { api } from "../../rpc";

export const uiLang = (): Lang => (document.documentElement.lang === "fr" ? "fr" : "en");

export const today = () => new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD, local time

export const day = (date: string) => fmtDay(`${date}T00:00`, uiLang()); // local midnight, no day shift

// "18,4" → 184000 (ten-thousandths). Up to 4 decimals, null if not a price.
export function parseAmount(s: string) {
  const m = /^\s*(\d+)(?:[.,](\d{1,4}))?\s*$/.exec(s);
  return m ? Number(m[1]) * 10000 + Number((m[2] ?? "").padEnd(4, "0")) : null;
}

// 184000 → "18.40", 230 → "0.023": 2 to 4 decimals, for editing.
export const amountText = (a: number) => (a / 10000).toFixed(4).replace(/(\.\d\d\d?)0+$/, "$1");

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
