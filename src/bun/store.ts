// Data folder + database. No Electrobun imports here so it runs under `bun test`.
import { Database } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { asc, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { join } from "node:path";
import { APP_VERSION } from "../shared/version";
import type { DbState, FolderInfo, Product, Status, StatusChange } from "../shared/rpc";
import { STATUSES } from "../shared/rpc";
import { products, statusHistory } from "./db/schema";
import { migrations } from "./db/migrations";
import { compareVersions } from "./db/version";
import { DIRS, PRODUCT_RE, productSku } from "../shared/sku";
import { markOutdatedLines } from "./composition";

let sqlite: Database | null = null;
let db: BunSQLiteDatabase | null = null;
let folder: string | null = null;
let state: DbState = { kind: "noFolder" };

export const getState = () => state;
export const productsDir = () => {
  if (!folder) throw new Error("No data folder selected");
  return join(folder, DIRS.product);
};

export function ready() {
  if (!db || state.kind !== "ready") throw new Error("Database is not ready");
  return db;
}

export const now = () => new Date().toISOString();

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
  // Off so a migration can rebuild a table; the pragma is a no-op inside a transaction.
  s.exec("PRAGMA foreign_keys = OFF");
  try {
    s.transaction(() => {
      for (const m of migrations) {
        if (compareVersions(m.version, from) > 0 && compareVersions(m.version, APP_VERSION) <= 0)
          s.exec(m.sql);
      }
      if (s.query("PRAGMA foreign_key_check").all().length)
        throw new Error("Migration broke foreign keys"); // rolls back
      setDbVersion(s);
    })();
  } finally {
    s.exec("PRAGMA foreign_keys = ON");
  }
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
    // after the checks, so a folder holding someone else's db.sqlite is left untouched
    for (const d of Object.values(DIRS)) mkdirSync(join(dir, d), { recursive: true });
    const cmp = compareVersions(v, APP_VERSION);
    state =
      cmp === 0
        ? { kind: "ready" }
        : cmp > 0
          ? { kind: "appOutdated", dbVersion: v, appVersion: APP_VERSION }
          : { kind: "needsMigration", dbVersion: v, appVersion: APP_VERSION };
    if (state.kind === "ready") upgradeSkus();
  } catch (e) {
    sqlite?.close();
    sqlite = db = null;
    state = { kind: "error", message: (e as Error).message };
  }
  return state;
}

// Old SKU formats (EK-PRD_00001, EK-OPE-00001) → current (EK-PRD-00001, EK-OP-00001), in the db and the folders.
// Not a versioned migration: it runs on every open, so dev dbs already at 0.2.0 are fixed too and a folder
// rename that failed (folder locked) is retried. A folder whose new name is taken is left as is, never overwritten.
const newSku = (s: string) => s.replaceAll("_", "-").replace(/^EK-OPE-/, "EK-OP-");
function upgradeSkus() {
  const s = sqlite!;
  s.transaction(() => {
    for (const t of ["products", "items", "part_versions", "operations"])
      s.run(`UPDATE ${t} SET sku = replace(replace(sku, '_', '-'), 'EK-OPE-', 'EK-OP-')`);
  })();
  for (const d of Object.values(DIRS))
    for (const f of readdirSync(join(folder!, d))) {
      const to = join(folder!, d, newSku(f));
      if (f.startsWith("EK-") && newSku(f) !== f && !existsSync(to))
        try {
          renameSync(join(folder!, d, f), to);
        } catch {} // locked (file open on Windows): retried on next open
    }
}

const BACKUP_RE = /^db\.backup-.*\.sqlite$/;

// Consistent copy of the live db next to it: db.backup-v<version>-<YYYY-MM-DD>[-n].sqlite. Returns the file name.
export function backup(): string {
  if (!sqlite || !folder) throw new Error("No database open");
  const base = `db.backup-v${dbVersion()}-${now().slice(0, 10)}`;
  let name = `${base}.sqlite`;
  for (let i = 2; existsSync(join(folder, name)); i++) name = `${base}-${i}.sqlite`;
  sqlite.run("VACUUM INTO ?", [join(folder, name)]);
  return name;
}

// mtime (ms) of the newest backup file, or null.
export function lastBackup(): number | null {
  if (!folder) return null;
  const times = readdirSync(folder)
    .filter((f) => BACKUP_RE.test(f))
    .map((f) => statSync(join(folder!, f)).mtimeMs);
  return times.length ? Math.max(...times) : null;
}

export function migrate(): { state: DbState; backup: string } {
  if (state.kind !== "needsMigration") throw new Error("No migration needed");
  const name = backup();
  runMigrations(state.dbVersion);
  state = { kind: "ready" };
  upgradeSkus();
  return { state, backup: name };
}

export const dataFolder = () => folder;

// Read-only look at a folder before opening it. Never creates or changes anything.
export function inspectFolder(dir: string): FolderInfo {
  const info: FolderInfo = { path: dir, hasDb: false, products: null, dbVersion: null };
  const file = join(dir, "db.sqlite");
  if (!existsSync(file)) return info;
  info.hasDb = true;
  let d: Database | null = null;
  try {
    d = new Database(file, { readonly: true });
    info.dbVersion =
      d.query<{ value: string }, []>("SELECT value FROM meta WHERE key = 'version'").get()?.value ??
      null;
    info.products = d.query<{ n: number }, []>("SELECT count(*) AS n FROM products").get()!.n;
  } catch {} // not ours or broken: openFolder reports the real error
  d?.close();
  return info;
}

// ---------- products ----------

export function listProducts(query: string): (Product & { toReview: boolean })[] {
  const q = query.trim(); // plain substring, like the other lists (LIKE would treat _ and % as wildcards)
  return ready()
    .select({
      ...getTableColumns(products),
      // qualified by hand: drizzle leaves columns unqualified, and "id" would bind to composition_lines
      toReview:
        sql<boolean>`exists (select 1 from composition_lines l where l.product_id = products.id and l.to_review)`.mapWith(
          Boolean,
        ),
    })
    .from(products)
    .where(
      q
        ? sql`instr(lower(${products.sku} || ' ' || ${products.name} || ' ' || ${products.description}), lower(${q})) > 0`
        : undefined,
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

export function cleanName(name: string) {
  const n = name.trim();
  if (!n) throw new Error("Name is required");
  return n;
}

// Next 5-digit number above both the db and any SKU folder matching `re`, so a SKU is never reassigned.
export function nextFreeId(maxDb: number, dir: string, re: RegExp, last: string): number {
  const maxDir = Math.max(
    0,
    ...readdirSync(join(folder!, dir)).map((f) => Number(re.exec(f)?.[1] ?? 0)),
  );
  const id = Math.max(maxDb, maxDir) + 1;
  if (id > 99999) throw new Error(`No SKU numbers left (${last} reached)`);
  return id;
}

export const nextId = () =>
  nextFreeId(
    ready()
      .select({ m: sql<number>`coalesce(max(${products.id}), 0)` })
      .from(products)
      .get()!.m,
    DIRS.product,
    PRODUCT_RE,
    "EK-PRD-99999",
  );

export function createProduct(name: string, description: string): Product {
  const d = ready();
  const n = cleanName(name);
  return d.transaction((tx) => {
    const id = nextId(); // same connection, so this read is inside the transaction
    const t = now();
    const p: Product = {
      id,
      sku: productSku(id),
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
    if (old.status === "Retired" && status !== "Retired") markOutdatedLines(id);
    return tx
      .update(products)
      .set({ name: n, description: description.trim(), status, updatedAt: t })
      .where(eq(products.id, id))
      .returning()
      .get();
  });
}
