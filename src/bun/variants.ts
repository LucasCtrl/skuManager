// Product variants and their swaps (docs/products.md#variants).
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Item, Swap, Variant } from "../shared/rpc";
import { toCode } from "../shared/sku";
import { compositionLines, items, productVariants, variantSwaps } from "./db/schema";
import { calculator, checkProductEditable, variantRow } from "./composition";
import { assemble as assembleItems } from "./items";
import { cleanName, now, ready } from "./store";

type Row = typeof productVariants.$inferSelect;

function assemble(rs: Row[], calc = calculator()): Variant[] {
  const review = new Set(calc.lines.filter((l) => l.toReview).map((l) => l.variantId));
  return rs.map((v) => ({
    ...v,
    toReview: review.has(v.id),
    cost: calc.ownerCost({ kind: "variant", id: v.id }),
  }));
}

export const variantIdsOf = (productId: number) =>
  ready()
    .select({ id: productVariants.id })
    .from(productVariants)
    .where(eq(productVariants.productId, productId))
    .all()
    .map((v) => v.id);

export const listVariants = (productId: number, calc = calculator()) =>
  assemble(
    ready()
      .select()
      .from(productVariants)
      .where(eq(productVariants.productId, productId))
      .orderBy(asc(productVariants.id))
      .all(),
    calc,
  );

export const getVariant = (id: number) => assemble([variantRow(id)])[0];

// Validates a new variant code and returns the variant SKU. Throws with the reason shown to the user.
export function variantSku(productId: number, code: string) {
  const p = checkProductEditable(productId);
  const c = toCode(code);
  if (!c) throw new Error("The code is empty once cleaned. Use letters, digits or dots.");
  const clash = ready()
    .select()
    .from(productVariants)
    .where(
      sql`${productVariants.productId} = ${productId} AND ${productVariants.code} = ${c} COLLATE NOCASE`,
    )
    .get();
  if (clash) throw new Error(`Code ${c} is already used by ${clash.name} (${clash.sku}).`);
  return { code: c, sku: `${p.sku}-${c}` };
}

export function createVariant(
  productId: number,
  code: string,
  name: string,
  description: string,
  copyFromId: number | null,
): Variant {
  const n = cleanName(name);
  const { code: c, sku } = variantSku(productId, code);
  const first = !variantIdsOf(productId).length;
  if (copyFromId != null && !first && variantRow(copyFromId).productId !== productId)
    throw new Error("Copy a variant of the same product.");
  const id = ready().transaction((tx) => {
    const t = now();
    const { id } = tx
      .insert(productVariants)
      .values({
        productId,
        code: c,
        sku,
        name: n,
        description: description.trim(),
        createdAt: t,
        updatedAt: t,
      })
      .returning({ id: productVariants.id })
      .get();
    if (first)
      // the product's composition moves into its first variant
      tx.update(compositionLines)
        .set({ productId: null, variantId: id })
        .where(eq(compositionLines.productId, productId))
        .run();
    else if (copyFromId != null) {
      for (const { id: _, variantId: __, ...l } of tx
        .select()
        .from(compositionLines)
        .where(eq(compositionLines.variantId, copyFromId))
        .all())
        tx.insert(compositionLines)
          .values({ ...l, variantId: id })
          .run();
      for (const { id: _, variantId: __, ...s } of tx
        .select()
        .from(variantSwaps)
        .where(eq(variantSwaps.variantId, copyFromId))
        .all())
        tx.insert(variantSwaps)
          .values({ ...s, variantId: id })
          .run();
    }
    return id;
  });
  return getVariant(id);
}

export function updateVariant(id: number, name: string, description: string): Variant {
  checkProductEditable(variantRow(id).productId);
  const n = cleanName(name);
  ready()
    .update(productVariants)
    .set({ name: n, description: description.trim(), updatedAt: now() })
    .where(eq(productVariants.id, id))
    .run();
  return getVariant(id);
}

// The last variant gives its composition back to the product; its swaps are deleted.
export function deleteVariant(id: number) {
  const v = variantRow(id);
  checkProductEditable(v.productId);
  const last = variantIdsOf(v.productId).length === 1;
  ready().transaction((tx) => {
    tx.delete(variantSwaps).where(eq(variantSwaps.variantId, id)).run();
    if (last)
      tx.update(compositionLines)
        .set({ productId: v.productId, variantId: null })
        .where(eq(compositionLines.variantId, id))
        .run();
    else tx.delete(compositionLines).where(eq(compositionLines.variantId, id)).run();
    tx.delete(productVariants).where(eq(productVariants.id, id)).run();
  });
}

// ---------- swaps ----------

const itemsById = (ids: number[]) =>
  new Map(
    (ids.length
      ? assembleItems(ready().select().from(items).where(inArray(items.id, ids)).all())
      : []
    ).map((i) => [i.id, i]),
  );

export function listSwaps(variantId: number): { swaps: Swap[]; items: Item[] } {
  variantRow(variantId);
  const calc = calculator();
  const found = calc.itemsIn({ kind: "variant", id: variantId });
  const rows = ready()
    .select()
    .from(variantSwaps)
    .where(eq(variantSwaps.variantId, variantId))
    .orderBy(asc(variantSwaps.id))
    .all();
  const its = itemsById([...found, ...rows.flatMap((s) => [s.fromItemId, s.toItemId])]);
  return {
    swaps: rows.map((s) => ({
      id: s.id,
      from: its.get(s.fromItemId)!,
      to: its.get(s.toItemId)!,
      unused: !found.has(s.fromItemId),
    })),
    items: [...found].map((id) => its.get(id)!).sort((a, b) => a.sku.localeCompare(b.sku)),
  };
}

// Y replaces X: same kind and price unit, Y Active.
function checkSwap(fromId: number, toId: number) {
  const its = itemsById([fromId, toId]);
  const from = its.get(fromId);
  const to = its.get(toId);
  if (!from) throw new Error(`Item ${fromId} not found`);
  if (!to) throw new Error(`Item ${toId} not found`);
  if (fromId === toId) throw new Error("Pick another item to replace it with.");
  if (from.kind !== to.kind)
    throw new Error(
      "A raw material is replaced by a raw material, a purchased part by a purchased part.",
    );
  if (from.unit.id !== to.unit.id)
    throw new Error(
      `${to.sku} is priced per ${to.unit.name}, ${from.sku} per ${from.unit.name}: pick an item with the same price unit.`,
    );
  if (to.status !== "Active")
    throw new Error(`${to.sku} is ${to.status}: only Active items can be picked.`);
}

export function addSwap(variantId: number, fromId: number, toId: number) {
  checkProductEditable(variantRow(variantId).productId);
  checkSwap(fromId, toId);
  const d = ready();
  if (
    d
      .select()
      .from(variantSwaps)
      .where(and(eq(variantSwaps.variantId, variantId), eq(variantSwaps.fromItemId, fromId)))
      .get()
  )
    throw new Error("This item is already replaced: edit its swap instead.");
  d.insert(variantSwaps).values({ variantId, fromItemId: fromId, toItemId: toId }).run();
}

function swapRow(id: number) {
  const s = ready().select().from(variantSwaps).where(eq(variantSwaps.id, id)).get();
  if (!s) throw new Error(`Swap ${id} not found`);
  checkProductEditable(variantRow(s.variantId).productId);
  return s;
}

export function updateSwap(id: number, toId: number) {
  checkSwap(swapRow(id).fromItemId, toId);
  ready().update(variantSwaps).set({ toItemId: toId }).where(eq(variantSwaps.id, id)).run();
}

export function deleteSwap(id: number) {
  swapRow(id);
  ready().delete(variantSwaps).where(eq(variantSwaps.id, id)).run();
}
