// Compositions of products, product variants and manufactured part versions: lines, cost, swaps,
// To review, cycles, used-by (docs/manufactured-parts.md#composition, docs/products.md#composition).
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { Component, CompositionLine, Cost, Owner, PartStatus, UsedBy } from "../shared/rpc";
import {
  compositionLines,
  items,
  manufacturedParts,
  operations,
  partVersions,
  products,
  productVariants,
  variantSwaps,
} from "./db/schema";
import { assemble as assembleItems, currentPrices } from "./items";
import { currentRates } from "./operations";
import { ready } from "./store";

type Line = typeof compositionLines.$inferSelect;

const NONE: Cost = { value: null, partial: true };

// shortcut: loads every line, price and rate per call; fine for a workshop catalogue,
// cache or compute in SQL if lists get slow.
export function calculator() {
  const d = ready();
  const lines = d
    .select()
    .from(compositionLines)
    .orderBy(asc(compositionLines.position), asc(compositionLines.id))
    .all();
  const prices = currentPrices();
  const rates = currentRates();
  const perHour = new Set(
    d
      .select({ id: operations.id })
      .from(operations)
      .where(eq(operations.rateKind, "hour"))
      .all()
      .map((o) => o.id),
  );
  const swapRows = d.select().from(variantSwaps).all();

  const ownerLines = (o: Owner) =>
    lines.filter(
      (l) =>
        (o.kind === "product" ? l.productId : o.kind === "version" ? l.versionId : l.variantId) ===
        o.id,
    );

  // A variant's swaps (item → item), applied at every depth.
  const swapsOf = (variantId: number) =>
    new Map(
      swapRows.filter((s) => s.variantId === variantId).map((s) => [s.fromItemId, s.toItemId]),
    );

  // Raw materials and purchased parts found in an owner's composition, at any depth.
  const itemsIn = (o: Owner) => {
    const found = new Set<number>();
    const seen = new Set<number>();
    const walk = (ls: Line[]) => {
      for (const l of ls) {
        if (l.itemId != null) found.add(l.itemId);
        if (l.partVersionId != null && !seen.has(l.partVersionId)) {
          seen.add(l.partVersionId);
          walk(lines.filter((x) => x.versionId === l.partVersionId));
        }
      }
    };
    walk(ownerLines(o));
    return found;
  };

  // Cost functions for one set of swaps; each has its own memo, as a swap changes version costs.
  const make = (swaps: Map<number, number>) => {
    const memo = new Map<number, Cost>();

    // Amounts are ten-thousandths, quantities thousandths (or seconds, or a count): no rounding here.
    const lineCost = (l: Line): Cost => {
      if (l.itemId != null) {
        const p = prices.get(swaps.get(l.itemId) ?? l.itemId);
        return p ? { value: (l.quantity * p.amount) / 1e7, partial: false } : NONE;
      }
      if (l.operationId != null) {
        const r = rates.get(l.operationId);
        if (!r) return NONE;
        const per = perHour.has(l.operationId) ? 3600 * 1e4 : 1e7;
        return { value: (l.quantity * r.amount) / per, partial: false };
      }
      const c = versionCost(l.partVersionId!);
      return c.value == null ? NONE : { value: l.quantity * c.value, partial: c.partial };
    };

    const total = (ls: Line[]): Cost => {
      if (!ls.length) return { value: null, partial: false };
      const cs = ls.map(lineCost);
      const known = cs.filter((c) => c.value != null);
      return {
        value: known.length ? known.reduce((a, c) => a + c.value!, 0) : null,
        partial: cs.some((c) => c.partial),
      };
    };

    // Recursion ends: cycles are refused when lines are added or changed.
    const versionCost = (id: number): Cost => {
      if (!memo.has(id)) memo.set(id, total(lines.filter((l) => l.versionId === id)));
      return memo.get(id)!;
    };

    return { lineCost, total, versionCost };
  };

  const base = make(new Map());
  const forOwner = (o: Owner) => (o.kind === "variant" ? make(swapsOf(o.id)) : base);
  const ownerCost = (o: Owner) => forOwner(o).total(ownerLines(o));

  return { lines, ...base, ownerLines, swapsOf, itemsIn, forOwner, ownerCost };
}

// Product cost: its composition, or the min–max of its variants' costs (empty variants left out).
export function productCost(
  calc: ReturnType<typeof calculator>,
  productId: number,
  variantIds: number[],
): Cost {
  if (!variantIds.length) return calc.ownerCost({ kind: "product", id: productId });
  const cs = variantIds.map((id) => calc.ownerCost({ kind: "variant", id }));
  const vs = cs.flatMap((c) => (c.value == null ? [] : [c.value]));
  const partial = cs.some((c) => c.partial);
  if (!vs.length) return { value: null, partial: false };
  const [min, max] = [Math.min(...vs), Math.max(...vs)];
  return min === max ? { value: min, partial } : { value: min, max, partial };
}

// ---------- reading ----------

function versionInfo(ids: number[]) {
  if (!ids.length)
    return new Map<number, { sku: string; name: string; status: PartStatus; partId: number }>();
  return new Map(
    ready()
      .select({
        id: partVersions.id,
        sku: partVersions.sku,
        name: manufacturedParts.name,
        status: partVersions.status,
        partId: partVersions.partId,
      })
      .from(partVersions)
      .innerJoin(manufacturedParts, eq(manufacturedParts.id, partVersions.partId))
      .where(inArray(partVersions.id, ids))
      .all()
      .map((v) => [v.id, v]),
  );
}

export function getComposition(owner: Owner): { lines: CompositionLine[]; cost: Cost } {
  const d = ready();
  const calc = calculator();
  const ls = calc.ownerLines(owner);
  const costs = calc.forOwner(owner);
  const swaps = owner.kind === "variant" ? calc.swapsOf(owner.id) : new Map<number, number>();
  const swapSkus = new Map(
    swaps.size
      ? d
          .select({ id: items.id, sku: items.sku })
          .from(items)
          .where(inArray(items.id, [...swaps.values()]))
          .all()
          .map((i) => [i.id, i.sku])
      : [],
  );
  const itemIds = ls.flatMap((l) => (l.itemId == null ? [] : [l.itemId]));
  const its = new Map(
    (itemIds.length
      ? assembleItems(d.select().from(items).where(inArray(items.id, itemIds)).all())
      : []
    ).map((i) => [i.id, i]),
  );
  const opIds = ls.flatMap((l) => (l.operationId == null ? [] : [l.operationId]));
  const ops = new Map(
    (opIds.length
      ? d
          .select({
            id: operations.id,
            sku: operations.sku,
            name: operations.name,
            rateKind: operations.rateKind,
            unit: sql<
              string | null
            >`(select e.name from list_entries e where e.id = operations.unit_id)`,
          })
          .from(operations)
          .where(inArray(operations.id, opIds))
          .all()
      : []
    ).map((o) => [o.id, o]),
  );
  const vers = versionInfo(ls.flatMap((l) => (l.partVersionId == null ? [] : [l.partVersionId])));

  const lines = ls.map((l): CompositionLine => {
    const base = {
      id: l.id,
      quantity: l.quantity,
      toReview: l.toReview,
      cost: costs.lineCost(l),
      swap: l.itemId == null ? null : (swapSkus.get(swaps.get(l.itemId)!) ?? null),
    };
    if (l.itemId != null) {
      const i = its.get(l.itemId)!;
      return {
        ...base,
        component: { kind: "item", id: i.id },
        sku: i.sku,
        name: i.type.name,
        status: i.status,
        measure: "quantity",
        unit: i.unit.name,
      };
    }
    if (l.operationId != null) {
      const o = ops.get(l.operationId)!;
      return {
        ...base,
        component: { kind: "operation", id: o.id },
        sku: o.sku,
        name: o.name,
        status: null,
        measure: o.rateKind === "hour" ? "duration" : "quantity",
        unit: o.unit,
      };
    }
    const v = vers.get(l.partVersionId!)!;
    return {
      ...base,
      component: { kind: "version", id: l.partVersionId! },
      sku: v.sku,
      name: v.name,
      status: v.status,
      measure: "count",
      unit: null,
    };
  });
  return { lines, cost: costs.total(ls) };
}

const componentCol = {
  item: compositionLines.itemId,
  operation: compositionLines.operationId,
  version: compositionLines.partVersionId,
};

// Products, variants and versions whose composition uses the component; for an item, also the
// variants whose swaps replace another item with it.
export function usedBy(c: Component): UsedBy[] {
  const d = ready();
  const ls = d.select().from(compositionLines).where(eq(componentCol[c.kind], c.id)).all();
  const variantIds = [
    ...ls.flatMap((l) => (l.variantId == null ? [] : [l.variantId])),
    ...(c.kind === "item"
      ? d
          .select({ id: variantSwaps.variantId })
          .from(variantSwaps)
          .where(eq(variantSwaps.toItemId, c.id))
          .all()
          .map((s) => s.id)
      : []),
  ];
  const vars = variantIds.length
    ? d
        .select({ id: productVariants.id, sku: productVariants.sku, name: productVariants.name })
        .from(productVariants)
        .where(inArray(productVariants.id, variantIds))
        .all()
    : [];
  const productIds = ls.flatMap((l) => (l.productId == null ? [] : [l.productId]));
  const prods = productIds.length
    ? d
        .select({ id: products.id, sku: products.sku, name: products.name })
        .from(products)
        .where(inArray(products.id, productIds))
        .all()
    : [];
  const vers = versionInfo(ls.flatMap((l) => (l.versionId == null ? [] : [l.versionId])));
  return [
    ...[...vers].map(([id, v]) => ({ kind: "version" as const, id, sku: v.sku, name: v.name })),
    ...prods.map((p) => ({ kind: "product" as const, ...p })),
    ...vars.map((v) => ({ kind: "variant" as const, ...v })),
  ].sort((a, b) => a.sku.localeCompare(b.sku));
}

// ---------- To review ----------

// A version became Active: mark lines using any other version of its part, except on Retired
// products and their variants.
export function markOtherVersionLines(partId: number, activeId: number) {
  ready().run(sql`
    UPDATE composition_lines SET to_review = 1
    WHERE part_version_id IN (SELECT id FROM part_versions WHERE part_id = ${partId} AND id <> ${activeId})
      AND (product_id IS NULL OR product_id NOT IN (SELECT id FROM products WHERE status = 'Retired'))
      AND (variant_id IS NULL OR variant_id NOT IN (
        SELECT v.id FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.status = 'Retired'))`);
}

// A product left Retired: mark its lines, and its variants' lines, that don't use the Active version of their part.
export function markOutdatedLines(productId: number) {
  ready().run(sql`
    UPDATE composition_lines SET to_review = 1
    WHERE (product_id = ${productId}
        OR variant_id IN (SELECT id FROM product_variants WHERE product_id = ${productId}))
      AND part_version_id IN (
        SELECT l.id FROM part_versions l JOIN part_versions a ON a.part_id = l.part_id
        WHERE a.status = 'Active' AND a.id <> l.id)`);
}

// ---------- editing ----------

function lineRow(id: number) {
  const l = ready().select().from(compositionLines).where(eq(compositionLines.id, id)).get();
  if (!l) throw new Error(`Line ${id} not found`);
  return l;
}

const lineOwner = (l: Line): Owner =>
  l.productId != null
    ? { kind: "product", id: l.productId }
    : l.variantId != null
      ? { kind: "variant", id: l.variantId }
      : { kind: "version", id: l.versionId! };

export function checkProductEditable(id: number) {
  const p = ready().select().from(products).where(eq(products.id, id)).get();
  if (!p) throw new Error(`Product ${id} not found`);
  if (p.status === "Retired") throw new Error("A retired product's composition cannot be changed.");
  return p;
}

export function variantRow(id: number) {
  const v = ready().select().from(productVariants).where(eq(productVariants.id, id)).get();
  if (!v) throw new Error(`Variant ${id} not found`);
  return v;
}

// The owner exists and its composition can be changed.
function checkOwner(o: Owner) {
  const d = ready();
  if (o.kind === "product") {
    checkProductEditable(o.id);
    if (d.select().from(productVariants).where(eq(productVariants.productId, o.id)).get())
      throw new Error("This product has variants: edit the composition of a variant.");
  } else if (o.kind === "variant") {
    checkProductEditable(variantRow(o.id).productId);
  } else if (o.kind === "version") {
    if (!d.select().from(partVersions).where(eq(partVersions.id, o.id)).get())
      throw new Error(`Version ${o.id} not found`);
  } else throw new Error(`Invalid owner: ${o.kind}`);
}

function checkQuantity(measure: CompositionLine["measure"], q: number) {
  if (!Number.isInteger(q) || q <= 0)
    throw new Error(
      measure === "count" ? "Enter a whole number above 0." : "Enter a quantity above 0.",
    );
}

// Measure of a new line's component; throws if it can't be picked for this owner.
function checkComponent(owner: Owner, c: Component): CompositionLine["measure"] {
  const d = ready();
  if (c.kind === "item") {
    const i = d.select().from(items).where(eq(items.id, c.id)).get();
    if (!i) throw new Error(`Item ${c.id} not found`);
    if (owner.kind !== "version" && i.kind !== "part")
      throw new Error("A product's composition only holds parts and operations.");
    if (i.status !== "Active")
      throw new Error(`${i.sku} is ${i.status}: only Active items can be picked.`);
    return "quantity";
  }
  if (c.kind === "operation") {
    const o = d.select().from(operations).where(eq(operations.id, c.id)).get();
    if (!o) throw new Error(`Operation ${c.id} not found`);
    return o.rateKind === "hour" ? "duration" : "quantity";
  }
  if (c.kind === "version") {
    const v = d.select().from(partVersions).where(eq(partVersions.id, c.id)).get();
    if (!v) throw new Error(`Version ${c.id} not found`);
    if (v.status !== "Active")
      throw new Error(`${v.sku} is ${v.status}: only Active versions can be picked.`);
    if (owner.kind === "version") checkCycle(owner.id, c.id);
    return "count";
  }
  throw new Error(`Invalid component: ${c.kind}`);
}

// Refuses `ownerId` containing `componentId` if that closes a loop; names the version that closes it.
export function checkCycle(ownerId: number, componentId: number) {
  if (ownerId === componentId) throw new Error("A version cannot contain itself.");
  const parts = new Map<number, number[]>(); // version → versions in its composition
  for (const l of ready().select().from(compositionLines).all())
    if (l.versionId != null && l.partVersionId != null)
      parts.set(l.versionId, [...(parts.get(l.versionId) ?? []), l.partVersionId]);
  const seen = new Set<number>();
  const visit = (id: number): number | null => {
    if (seen.has(id)) return null;
    seen.add(id);
    if (parts.get(id)?.includes(ownerId)) return id;
    for (const p of parts.get(id) ?? []) {
      const found = visit(p);
      if (found != null) return found;
    }
    return null;
  };
  const closer = visit(componentId);
  if (closer != null) {
    const v = versionInfo([closer, ownerId]);
    throw new Error(
      `${v.get(closer)!.sku} already uses ${v.get(ownerId)!.sku}: this would make it contain itself.`,
    );
  }
}

function checkDuplicate(owner: Owner, c: Component, exceptId = 0) {
  const d = ready();
  const ownerCol = {
    product: compositionLines.productId,
    version: compositionLines.versionId,
    variant: compositionLines.variantId,
  }[owner.kind];
  const clash = d
    .select({ id: compositionLines.id })
    .from(compositionLines)
    .where(
      and(
        eq(ownerCol, owner.id),
        eq(componentCol[c.kind], c.id),
        sql`${compositionLines.id} <> ${exceptId}`,
      ),
    )
    .get();
  if (clash) throw new Error("This item is already in the composition: edit its line instead.");
}

export function addLine(owner: Owner, c: Component, quantity: number) {
  checkOwner(owner);
  checkQuantity(checkComponent(owner, c), quantity);
  checkDuplicate(owner, c);
  ready()
    .insert(compositionLines)
    .values({
      productId: owner.kind === "product" ? owner.id : null,
      versionId: owner.kind === "version" ? owner.id : null,
      variantId: owner.kind === "variant" ? owner.id : null,
      itemId: c.kind === "item" ? c.id : null,
      operationId: c.kind === "operation" ? c.id : null,
      partVersionId: c.kind === "version" ? c.id : null,
      quantity,
      position: calculator().ownerLines(owner).length, // last; moveLine keeps positions 0..n-1
    })
    .run();
}

// Changes the quantity and, for a version line, switches to another (Active) version of the same part.
export function updateLine(id: number, quantity: number, versionId: number | null) {
  const l = lineRow(id);
  const owner = lineOwner(l);
  checkOwner(owner);
  const switching = versionId != null && versionId !== l.partVersionId;
  if (switching) {
    if (l.partVersionId == null)
      throw new Error("Only a manufactured part line can change version.");
    const v = versionInfo([l.partVersionId, versionId]);
    if (v.get(versionId)?.partId !== v.get(l.partVersionId)!.partId)
      throw new Error("Pick a version of the same part.");
    checkComponent(owner, { kind: "version", id: versionId });
    checkDuplicate(owner, { kind: "version", id: versionId }, id);
  }
  checkQuantity(
    l.partVersionId != null ? "count" : "quantity", // only "count" changes the message
    quantity,
  );
  ready()
    .update(compositionLines)
    .set(switching ? { quantity, partVersionId: versionId, toReview: false } : { quantity })
    .where(eq(compositionLines.id, id))
    .run();
}

export function deleteLine(id: number) {
  checkOwner(lineOwner(lineRow(id)));
  ready().delete(compositionLines).where(eq(compositionLines.id, id)).run();
}

// Swaps the line with its neighbour above (-1) or below (1); no-op at either end.
export function moveLine(id: number, by: -1 | 1) {
  const owner = lineOwner(lineRow(id));
  checkOwner(owner);
  const ls = calculator().ownerLines(owner);
  const i = ls.findIndex((l) => l.id === id);
  const j = i + by;
  if (j < 0 || j >= ls.length) return;
  [ls[i], ls[j]] = [ls[j], ls[i]];
  ready().transaction((tx) =>
    ls.forEach((l, position) =>
      tx.update(compositionLines).set({ position }).where(eq(compositionLines.id, l.id)).run(),
    ),
  );
}

export function markReviewed(id: number) {
  checkOwner(lineOwner(lineRow(id)));
  ready()
    .update(compositionLines)
    .set({ toReview: false })
    .where(eq(compositionLines.id, id))
    .run();
}
