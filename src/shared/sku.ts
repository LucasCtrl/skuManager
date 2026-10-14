// SKU formats and folders, shared by the main process and the UI (SKU preview).
import type { ItemKind } from "./rpc";

export const DIRS = { product: "1_PRODUCTS", material: "3_MATERIALS", part: "4_PARTS" } as const;
export const ITEM_PREFIX = { material: "EK-MAT_", part: "EK-PRT_" } as const;

// Code format (docs/materials-parts.md): upper case letters, digits and dots, no edge dots, accents dropped.
export const toCode = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, "")
    .replace(/^\.+|\.+$/g, "");

export const itemSku = (kind: ItemKind, codes: string[]) => ITEM_PREFIX[kind] + codes.join("_");

const SEG = "[A-Z0-9](?:[A-Z0-9.]*[A-Z0-9])?";
const ITEM_RE = new RegExp(`^EK-(MAT|PRT)(_${SEG})+$`);

// Data subfolder holding a SKU's folder. Throws on anything that isn't a SKU (path guard).
export function skuFolder(sku: string) {
  if (/^EK-PRD_\d{5}$/.test(sku)) return DIRS.product;
  const m = ITEM_RE.exec(sku);
  if (m) return m[1] === "MAT" ? DIRS.material : DIRS.part;
  throw new Error(`Invalid SKU: ${sku}`);
}
