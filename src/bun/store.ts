// Data folder + database. No Electrobun imports here so it runs under `bun test`.
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { APP_VERSION } from "../shared/version";
import type { DbState, Product, Status, StatusChange } from "../shared/rpc";
import { STATUSES } from "../shared/rpc";
import { products, statusHistory } from "./db/schema";
import { migrations } from "./db/migrations";
import { compareVersions } from "./db/version";

export const PRODUCTS_DIR = "1_PRODUCTS";
export const SKU_RE = /^EK-PRD_(\d{5})$/;
export const skuOf = (id: number) => `EK-PRD_${String(id).padStart(5, "0")}`;

let sqlite: Database | null = null;
let db: BunSQLiteDatabase | null = null;
let folder: string | null = null;
let state: DbState = { kind: "noFolder" };

export const getState = () => state;
export const productsDir = () => {
  if (!folder) throw new Error("No data folder selected");
  return join(folder, PRODUCTS_DIR);
};

function ready() {
  if (!db || state.kind !== "ready") throw new Error("Database is not ready");
  return db;
}

const now = () => new Date().toISOString();

export function dbVersion(): string | null {
  if (!sqlite) return null;
  const row = sqlite
    .query<{ value: string }, []>("SELECT value FROM meta WHERE key = 'version'")
    .get();
  return row?.value ?? null;
}

function setDbVersion(tx: Database) {
  tx.run("INSERT OR REPLACE INTO meta (key, value) VALUES ('version', ?)", [APP_VERSION]);
}

function runMigrations(from: string) {
  const s = sqlite!;
  s.transaction(() => {
    for (const m of migrations) {
      if (compareVersions(m.version, from) > 0 && compareVersions(m.version, APP_VERSION) <= 0)
        s.exec(m.sql);
    }
    setDbVersion(s);
  })();
}

export function close() {
  sqlite?.close();
  sqlite = db = folder = null;
  state = { kind: "noFolder" };
}

// Opens (or initializes) a data folder. Never deletes anything already in it.
export function openFolder(dir: string): DbState {
  close();
  try {
    mkdirSync(join(dir, PRODUCTS_DIR), { recursive: true });
    sqlite = new Database(join(dir, "db.sqlite"), { create: true });
    sqlite.exec("PRAGMA foreign_keys = ON");
    folder = dir;
    db = drizzle(sqlite);

    const tables = sqlite
      .query<{ name: string }, []>("SELECT name FROM sqlite_master WHERE type = 'table'")
      .all()
      .map((t) => t.name);
    if (tables.length === 0) runMigrations("0.0.0");
    else if (!tables.includes("meta")) throw new Error("db.sqlite is not a SKU Manager database");

    const v = dbVersion();
    if (!v) throw new Error("db.sqlite has no version");
    const cmp = compareVersions(v, APP_VERSION);
    state =
      cmp === 0
        ? { kind: "ready" }
        : cmp > 0
          ? { kind: "appOutdated", dbVersion: v, appVersion: APP_VERSION }
          : { kind: "needsMigration", dbVersion: v, appVersion: APP_VERSION };
  } catch (e) {
    sqlite?.close();
    sqlite = db = null;
    state = { kind: "error", message: (e as Error).message };
  }
  return state;
}

// Consistent copy of the live db next to it. Returns the backup path.
export function backup(): string {
  if (!sqlite || !folder) throw new Error("No database open");
  const stamp = now().replace(/[:.]/g, "-");
  const path = join(folder, `db.backup-v${dbVersion()}-${stamp}.sqlite`);
  sqlite.run("VACUUM INTO ?", [path]);
  return path;
}

export function migrate(): DbState {
  if (state.kind !== "needsMigration") return state;
  backup();
  runMigrations(state.dbVersion);
  state = { kind: "ready" };
  return state;
}

// ---------- products ----------

export function listProducts(query: string, status: Status | null): Product[] {
  const q = `%${query.trim()}%`;
  return ready()
    .select()
    .from(products)
    .where(
      and(
        query.trim()
          ? or(like(products.sku, q), like(products.name, q), like(products.description, q))
          : undefined,
        status ? eq(products.status, status) : undefined,
      ),
    )
    .orderBy(desc(products.id))
    .all();
}

export function getProduct(id: number): { product: Product; history: StatusChange[] } {
  const d = ready();
  const product = d.select().from(products).where(eq(products.id, id)).get();
  if (!product) throw new Error(`Product ${id} not found`);
  const history = d
    .select({ status: statusHistory.status, changedAt: statusHistory.changedAt })
    .from(statusHistory)
    .where(eq(statusHistory.productId, id))
    .orderBy(asc(statusHistory.id))
    .all();
  return { product, history };
}

function cleanName(name: string) {
  const n = name.trim();
  if (!n) throw new Error("Name is required");
  return n;
}

// Next number is above both the db and any existing EK-PRD_xxxxx folder, so a SKU is never reassigned.
export function createProduct(name: string, description: string): Product {
  const d = ready();
  const n = cleanName(name);
  return d.transaction((tx) => {
    const maxDb = tx
      .select({ m: sql<number>`coalesce(max(${products.id}), 0)` })
      .from(products)
      .get()!.m;
    const maxDir = Math.max(
      0,
      ...readdirSync(productsDir()).map((f) => Number(SKU_RE.exec(f)?.[1] ?? 0)),
    );
    const id = Math.max(maxDb, maxDir) + 1;
    if (id > 99999) throw new Error("No SKU numbers left (EK-PRD_99999 reached)");
    const t = now();
    const p: Product = {
      id,
      sku: skuOf(id),
      name: n,
      description: description.trim(),
      status: "In development",
      createdAt: t,
      updatedAt: t,
    };
    tx.insert(products).values(p).run();
    tx.insert(statusHistory).values({ productId: id, status: p.status, changedAt: t }).run();
    mkdirSync(join(productsDir(), p.sku)); // throws → rollback
    return p;
  });
}

export function updateProduct(
  id: number,
  name: string,
  description: string,
  status: Status,
): Product {
  const d = ready();
  if (!STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  const n = cleanName(name);
  return d.transaction((tx) => {
    const old = tx.select().from(products).where(eq(products.id, id)).get();
    if (!old) throw new Error(`Product ${id} not found`);
    const t = now();
    if (old.status !== status)
      tx.insert(statusHistory).values({ productId: id, status, changedAt: t }).run();
    return tx
      .update(products)
      .set({ name: n, description: description.trim(), status, updatedAt: t })
      .where(eq(products.id, id))
      .returning()
      .get();
  });
}
