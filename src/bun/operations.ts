// Operations and their rates (docs/operations.md).
import { asc, desc, eq, sql } from "drizzle-orm";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import type { Operation, Price, RateKind } from "../shared/rpc";
import { DIRS, operationSku } from "../shared/sku";
import { listEntries, operationRates, operations } from "./db/schema";
import { checkPrice, listAllEntries } from "./items";
import { dataFolder, nextFreeId, now, ready } from "./store";

type Row = typeof operations.$inferSelect;

// Current rate per operation id: latest date, then latest entered.
export function currentRates() {
  const current = new Map<number, Price>();
  for (const r of ready()
    .select()
    .from(operationRates)
    .orderBy(asc(operationRates.date), asc(operationRates.id))
    .all())
    current.set(r.operationId, { id: r.id, date: r.date, amount: r.amount });
  return current;
}

function assemble(rows: Row[]): Operation[] {
  const entries = new Map(listAllEntries().map((e) => [e.id, e]));
  const rates = currentRates();
  return rows.map(({ unitId, ...r }) => ({
    ...r,
    unit: unitId == null ? null : entries.get(unitId)!,
    rate: rates.get(r.id) ?? null,
  }));
}

function operationRow(id: number) {
  const r = ready().select().from(operations).where(eq(operations.id, id)).get();
  if (!r) throw new Error(`Operation ${id} not found`);
  return r;
}

export function listOperations(query: string): Operation[] {
  const q = query.trim().toLowerCase();
  return assemble(ready().select().from(operations).orderBy(desc(operations.id)).all()).filter(
    (o) => !q || [o.sku, o.name, o.description].join(" ").toLowerCase().includes(q),
  );
}

export function getOperation(id: number): { operation: Operation; rates: Price[] } {
  const [operation] = assemble([operationRow(id)]);
  const rates = ready()
    .select({ id: operationRates.id, date: operationRates.date, amount: operationRates.amount })
    .from(operationRates)
    .where(eq(operationRates.operationId, id))
    .orderBy(desc(operationRates.date), desc(operationRates.id))
    .all();
  return { operation, rates };
}

export const nextOperationId = () =>
  nextFreeId(
    ready()
      .select({ m: sql<number>`coalesce(max(${operations.id}), 0)` })
      .from(operations)
      .get()!.m,
    DIRS.operation,
    /^EK-OPE_(\d{5})$/,
    "EK-OPE_99999",
  );

const cleanName = (name: string) => {
  const n = name.trim();
  if (!n) throw new Error("Name is required");
  return n;
};

export function createOperation(v: {
  name: string;
  description: string;
  rateKind: RateKind;
  unitId: number | null;
  firstRate: { date: string; amount: number } | null;
}): Operation {
  const d = ready();
  const name = cleanName(v.name);
  if (v.rateKind !== "hour" && v.rateKind !== "quantity")
    throw new Error(`Invalid rate kind: ${v.rateKind}`);
  let unitId: number | null = null;
  if (v.rateKind === "quantity") {
    const unit =
      v.unitId == null
        ? undefined
        : d.select().from(listEntries).where(eq(listEntries.id, v.unitId)).get();
    if (!unit || unit.list !== "unit") throw new Error("Pick a unit.");
    unitId = unit.id;
  }
  if (v.firstRate) checkPrice(v.firstRate.date, v.firstRate.amount);
  const id = d.transaction((tx) => {
    const id = nextOperationId(); // same connection, so this read is inside the transaction
    const sku = operationSku(id);
    const t = now();
    tx.insert(operations)
      .values({
        id,
        sku,
        name,
        description: v.description.trim(),
        rateKind: v.rateKind,
        unitId,
        createdAt: t,
        updatedAt: t,
      })
      .run();
    if (v.firstRate)
      tx.insert(operationRates)
        .values({ operationId: id, ...v.firstRate })
        .run();
    mkdirSync(join(dataFolder()!, DIRS.operation, sku)); // throws → rollback
    return id;
  });
  return assemble([operationRow(id)])[0];
}

export function updateOperation(id: number, name: string, description: string): Operation {
  const n = cleanName(name);
  operationRow(id);
  ready()
    .update(operations)
    .set({ name: n, description: description.trim(), updatedAt: now() })
    .where(eq(operations.id, id))
    .run();
  return assemble([operationRow(id)])[0];
}

export function addRate(operationId: number, date: string, amount: number) {
  checkPrice(date, amount);
  operationRow(operationId);
  ready().insert(operationRates).values({ operationId, date, amount }).run();
}

export function updateRate(id: number, date: string, amount: number) {
  checkPrice(date, amount);
  ready().update(operationRates).set({ date, amount }).where(eq(operationRates.id, id)).run();
}

export const deleteRate = (id: number) => {
  ready().delete(operationRates).where(eq(operationRates.id, id)).run();
};
