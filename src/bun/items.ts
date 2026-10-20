// Raw materials, purchased parts, their managed lists and prices (docs/materials-parts.md).
import { asc, desc, eq, sql } from "drizzle-orm";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type {
  Item,
  ItemStatus,
  ItemStatusChange,
  ListEntry,
  ListName,
  NewItem,
  Price,
} from "../shared/rpc";
import { ITEM_STATUSES, LISTS } from "../shared/rpc";
import { itemSku, skuFolder, toCode } from "../shared/sku";
import { itemPrices, items, itemStatusHistory, listEntries, meta } from "./db/schema";
import { dataFolder, now, ready } from "./store";

// ---------- currency (stored in the db, so it travels with the data) ----------

export const getCurrency = () =>
  ready().select().from(meta).where(eq(meta.key, "currency")).get()?.value ?? "€";

export function setCurrency(currency: string) {
  const c = currency.trim().slice(0, 4);
  ready()
    .insert(meta)
    .values({ key: "currency", value: c })
    .onConflictDoUpdate({ target: meta.key, set: { value: c } })
    .run();
  return c;
}

// ---------- managed lists ----------

const entryCols = {
  id: listEntries.id,
  list: listEntries.list,
  name: listEntries.name,
  code: listEntries.code,
};

export const listAllEntries = (): ListEntry[] =>
  ready().select(entryCols).from(listEntries).orderBy(asc(listEntries.id)).all();

// Permanent once created: there is no update or delete.
export function addEntry(list: ListName, name: string, code: string): ListEntry {
  if (!LISTS.includes(list)) throw new Error(`Invalid list: ${list}`);
  const n = name.trim().replace(/\s+/g, " ");
  if (!n) throw new Error("Name is required");
  const c = list === "unit" ? n : toCode(code);
  if (!c) throw new Error("The code is empty once cleaned. Use letters, digits or dots.");
  const d = ready();
  const clash = d
    .select(entryCols)
    .from(listEntries)
    .where(sql`${listEntries.list} = ${list} AND ${listEntries.code} = ${c} COLLATE NOCASE`)
    .get();
  if (clash) throw new Error(`“${c}” is already used by ${clash.name}`);
  return d
    .insert(listEntries)
    .values({ list, name: n, code: c, createdAt: now() })
    .returning(entryCols)
    .get();
}

// ---------- items ----------

type Row = typeof items.$inferSelect;

// ponytail: loads every entry and price to assemble items in JS; fine for a workshop catalogue,
// switch to SQL joins if it reaches tens of thousands of rows.
function assemble(rows: Row[]): Item[] {
  const d = ready();
  const entries = new Map(listAllEntries().map((e) => [e.id, e]));
  const current = new Map<number, Price>();
  for (const p of d
    .select()
    .from(itemPrices)
    .orderBy(asc(itemPrices.date), asc(itemPrices.id))
    .all())
    current.set(p.itemId, { id: p.id, date: p.date, cents: p.cents }); // last one wins
  const e = (id: number | null) => (id == null ? null : entries.get(id)!);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind,
    sku: r.sku,
    seller: e(r.sellerId)!,
    type: e(r.typeId)!,
    colour: e(r.colourId),
    finish: e(r.finishId),
    size: r.size,
    specs: JSON.parse(r.specs),
    unit: e(r.unitId)!,
    description: r.description,
    sellerSku: r.sellerSku,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    price: current.get(r.id) ?? null,
  }));
}

// Searches every field of the item.
export function listItems(kind: Item["kind"], query: string): Item[] {
  const rows = ready()
    .select()
    .from(items)
    .where(eq(items.kind, kind))
    .orderBy(desc(items.id))
    .all();
  const q = query.trim().toLowerCase();
  return assemble(rows).filter(
    (i) =>
      !q ||
      [
        i.sku,
        i.seller.name,
        i.type.name,
        i.colour?.name,
        i.finish?.name,
        i.size,
        ...i.specs,
        i.description,
        i.sellerSku,
        i.unit.name,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
}

function itemRow(id: number) {
  const r = ready().select().from(items).where(eq(items.id, id)).get();
  if (!r) throw new Error(`Item ${id} not found`);
  return r;
}

export function getItem(id: number): { item: Item; prices: Price[]; history: ItemStatusChange[] } {
  const d = ready();
  const [item] = assemble([itemRow(id)]);
  const prices = d
    .select({ id: itemPrices.id, date: itemPrices.date, cents: itemPrices.cents })
    .from(itemPrices)
    .where(eq(itemPrices.itemId, id))
    .orderBy(desc(itemPrices.date), desc(itemPrices.id))
    .all();
  const history = d
    .select({ status: itemStatusHistory.status, changedAt: itemStatusHistory.changedAt })
    .from(itemStatusHistory)
    .where(eq(itemStatusHistory.itemId, id))
    .orderBy(asc(itemStatusHistory.id))
    .all();
  return { item, prices, history };
}

function checkPrice(date: string, cents: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)))
    throw new Error("Pick a date.");
  if (!Number.isInteger(cents) || cents < 0) throw new Error("Enter a price.");
}

// The SKU is built here from the stored codes, never taken from the UI.
export function createItem(v: NewItem): Item {
  const d = ready();
  const pick = (id: number | null, list: ListName) => {
    const e =
      id == null
        ? undefined
        : d.select(entryCols).from(listEntries).where(eq(listEntries.id, id)).get();
    if (!e || e.list !== list) throw new Error(`Pick a ${list}.`);
    return e;
  };
  const isPart = v.kind === "part";
  if (v.kind !== "material" && !isPart) throw new Error(`Invalid kind: ${v.kind}`);
  const seller = pick(v.sellerId, "seller");
  const type = pick(v.typeId, isPart ? "partType" : "materialType");
  const unit = pick(v.unitId, "unit");
  // Colour and finish are optional (raw materials): skipped in the SKU when empty.
  const colour = isPart || v.colourId == null ? null : pick(v.colourId, "colour");
  const finish = isPart || v.finishId == null ? null : pick(v.finishId, "finish");
  const size = isPart ? null : toCode(v.size);
  const specs = isPart ? v.specs.map(toCode).filter(Boolean) : [];
  if (!isPart && !size) throw new Error("Enter a thickness or weight.");
  if (isPart && !specs.length) throw new Error("Enter at least one specification.");
  if (v.firstPrice) checkPrice(v.firstPrice.date, v.firstPrice.cents);

  const sku = itemSku(
    v.kind,
    isPart
      ? [seller.code, type.code, ...specs]
      : [seller.code, type.code, colour?.code, finish?.code, size!].filter((c) => c != null),
  );
  if (d.select({ id: items.id }).from(items).where(eq(items.sku, sku)).get())
    throw new Error(`${sku} already exists.`);

  const id = d.transaction((tx) => {
    const t = now();
    const { id } = tx
      .insert(items)
      .values({
        kind: v.kind,
        sku,
        sellerId: seller.id,
        typeId: type.id,
        colourId: colour?.id ?? null,
        finishId: finish?.id ?? null,
        size,
        specs: JSON.stringify(specs),
        unitId: unit.id,
        description: v.description.trim(),
        sellerSku: v.sellerSku.trim(),
        status: "Active",
        createdAt: t,
        updatedAt: t,
      })
      .returning({ id: items.id })
      .get();
    tx.insert(itemStatusHistory).values({ itemId: id, status: "Active", changedAt: t }).run();
    if (v.firstPrice)
      tx.insert(itemPrices)
        .values({ itemId: id, ...v.firstPrice })
        .run();
    // recursive: a folder left from an earlier db is kept and reused, never emptied. Throws → rollback.
    mkdirSync(join(dataFolder()!, skuFolder(sku), sku), { recursive: true });
    return id;
  });
  return assemble([itemRow(id)])[0];
}

export function updateItem(
  id: number,
  description: string,
  sellerSku: string,
  status: ItemStatus,
): Item {
  if (!ITEM_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  const d = ready();
  d.transaction((tx) => {
    const old = itemRow(id);
    const t = now();
    if (old.status !== status)
      tx.insert(itemStatusHistory).values({ itemId: id, status, changedAt: t }).run();
    tx.update(items)
      .set({ description: description.trim(), sellerSku: sellerSku.trim(), status, updatedAt: t })
      .where(eq(items.id, id))
      .run();
  });
  return assemble([itemRow(id)])[0];
}

// ---------- prices ----------

export function addPrice(itemId: number, date: string, cents: number) {
  checkPrice(date, cents);
  itemRow(itemId);
  ready().insert(itemPrices).values({ itemId, date, cents }).run();
}

export function updatePrice(id: number, date: string, cents: number) {
  checkPrice(date, cents);
  ready().update(itemPrices).set({ date, cents }).where(eq(itemPrices.id, id)).run();
}

export const deletePrice = (id: number) => {
  ready().delete(itemPrices).where(eq(itemPrices.id, id)).run();
};
