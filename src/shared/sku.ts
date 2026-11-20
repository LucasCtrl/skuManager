// SKU formats and folders, shared by the main process and the UI (SKU preview).
import type { ItemKind } from "./rpc";

export const DIRS = {
  product: "1_PRODUCTS",
  version: "2_MANUFACTURED_PARTS",
  material: "3_MATERIALS",
  part: "4_PARTS",
  operation: "5_OPERATIONS",
} as const;
export const ITEM_PREFIX = { material: "EK-MAT-", part: "EK-PRT-" } as const;

const id5 = (id: number) => String(id).padStart(5, "0");
export const productSku = (id: number) => `EK-PRD-${id5(id)}`;
export const operationSku = (id: number) => `EK-OPE-${id5(id)}`;
export const versionSku = (productId: number, partName: string, v: number) =>
  `EK-MAN-${id5(productId)}-${partName}-v${v}`;

const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

// Code format (docs/materials-parts.md): upper case letters, digits and dots, no edge dots, accents dropped.
export const toCode = (s: string) =>
  stripAccents(s)
    .toUpperCase()
    .replace(/[^A-Z0-9.]/g, "")
    .replace(/^\.+|\.+$/g, "");

// Part name (docs/manufactured-parts.md): "Tool ID card" → "toolIdCard". "" if nothing is left.
export const toPartName = (s: string) =>
  stripAccents(s)
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w, i) => (i ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()))
    .join("");

export const itemSku = (kind: ItemKind, codes: string[]) => ITEM_PREFIX[kind] + codes.join("-");

const SEG = "[A-Z0-9](?:[A-Z0-9.]*[A-Z0-9])?";
const ITEM_RE = new RegExp(`^EK-(MAT|PRT)(-${SEG})+$`);
export const VERSION_RE = /^EK-MAN-(\d{5})-([a-z0-9][A-Za-z0-9]*)-v([1-9]\d*)$/;

// Data subfolder holding a SKU's folder. Throws on anything that isn't a SKU (path guard).
export function skuFolder(sku: string) {
  if (/^EK-PRD-\d{5}$/.test(sku)) return DIRS.product;
  if (/^EK-OPE-\d{5}$/.test(sku)) return DIRS.operation;
  if (VERSION_RE.test(sku)) return DIRS.version;
  const m = ITEM_RE.exec(sku);
  if (m) return m[1] === "MAT" ? DIRS.material : DIRS.part;
  throw new Error(`Invalid SKU: ${sku}`);
}
