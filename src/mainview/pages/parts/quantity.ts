// Composition quantities (CompositionLine.quantity): thousandths of the unit, seconds, or a count.
import { type CompositionLine, type Lang } from "../../../shared/rpc";
import { locale } from "../../i18n";

// "0,014" → 14. Up to 3 decimals, null if not a quantity.
export function parseQty(s: string) {
  const m = /^\s*(\d+)(?:[.,](\d{1,3}))?\s*$/.exec(s);
  return m ? Number(m[1]) * 1000 + Number((m[2] ?? "").padEnd(3, "0")) : null;
}

// Whole number or null; "" counts as 0 (duration fields).
export const parseWhole = (s: string) => (/^\s*\d*\s*$/.test(s) ? Number(s.trim() || 0) : null);

export const splitDuration = (sec: number) => [
  Math.floor(sec / 3600),
  Math.floor((sec % 3600) / 60),
  sec % 60,
];

// "1 h 36 min", "26 s"
export const fmtDuration = (sec: number) =>
  splitDuration(sec)
    .map((n, i) => (n ? `${n} ${["h", "min", "s"][i]}` : ""))
    .filter(Boolean)
    .join(" ") || "0 s";

export function fmtQty(l: Pick<CompositionLine, "measure" | "quantity" | "unit">, lang: Lang) {
  if (l.measure === "duration") return fmtDuration(l.quantity);
  if (l.measure === "count") return `× ${l.quantity}`;
  return `${(l.quantity / 1000).toLocaleString(locale(lang), { maximumFractionDigits: 3 })} ${l.unit}`;
}
