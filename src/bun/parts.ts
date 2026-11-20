// Manufactured parts and their versions (docs/manufactured-parts.md).
import { and, asc, desc, eq, ne, sql, type SQL } from "drizzle-orm";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type { PartStatus, PartStatusChange, PartVersion } from "../shared/rpc";
import { PART_STATUSES } from "../shared/rpc";
import { DIRS, toPartName, VERSION_RE, versionSku } from "../shared/sku";
import {
  compositionLines,
  manufacturedParts,
  partStatusHistory,
  partVersions,
  products,
} from "./db/schema";
import { calculator, markOtherVersionLines } from "./composition";
import { dataFolder, now, ready } from "./store";

const partsDir = () => join(dataFolder()!, DIRS.version);

function rows(where?: SQL) {
  return ready()
    .select({
      v: partVersions,
      name: manufacturedParts.name,
      product: { id: products.id, sku: products.sku, name: products.name },
    })
    .from(partVersions)
    .innerJoin(manufacturedParts, eq(manufacturedParts.id, partVersions.partId))
    .innerJoin(products, eq(products.id, manufacturedParts.productId))
    .where(where)
    .orderBy(desc(partVersions.id))
    .all();
}

function assemble(rs: ReturnType<typeof rows>): PartVersion[] {
  const calc = calculator();
  const review = new Set(calc.lines.filter((l) => l.toReview).map((l) => l.versionId));
  return rs.map(({ v, name, product }) => ({
    ...v,
    name,
    product,
    toReview: review.has(v.id),
    cost: calc.versionCost(v.id),
  }));
}

function versionRow(id: number) {
  const [r] = rows(eq(partVersions.id, id));
  if (!r) throw new Error(`Version ${id} not found`);
  return r;
}

// Searches the SKU, name, description and origin product.
export function listPartVersions(
  query: string,
  status: PartStatus | null,
  productId: number | null,
): PartVersion[] {
  const q = query.trim().toLowerCase();
  return assemble(
    rows(
      and(
        status ? eq(partVersions.status, status) : undefined,
        productId != null ? eq(manufacturedParts.productId, productId) : undefined,
      ),
    ),
  ).filter(
    (v) =>
      !q ||
      [v.sku, v.name, v.description, v.product.sku, v.product.name]
        .join(" ")
        .toLowerCase()
        .includes(q),
  );
}

export function getPartVersion(id: number): {
  version: PartVersion;
  history: PartStatusChange[];
  siblings: PartVersion[];
} {
  const r = versionRow(id);
  const history = ready()
    .select({ status: partStatusHistory.status, changedAt: partStatusHistory.changedAt })
    .from(partStatusHistory)
    .where(eq(partStatusHistory.versionId, id))
    .orderBy(asc(partStatusHistory.id))
    .all();
  const all = assemble(rows(eq(partVersions.partId, r.v.partId))).sort(
    (a, b) => a.version - b.version,
  );
  return {
    version: all.find((v) => v.id === id)!,
    history,
    siblings: all.filter((v) => v.id !== id),
  };
}

// Folders of a part in 2_MANUFACTURED_PARTS/, any version, ignoring case.
const partFolders = (productId: number, code: string) =>
  readdirSync(partsDir()).filter((f) => {
    const m = VERSION_RE.exec(f);
    return m && Number(m[1]) === productId && m[2].toLowerCase() === code.toLowerCase();
  });

// Validates a new part and returns its v1 SKU. Throws with the reason shown to the user.
function checkNewPart(productId: number, name: string) {
  const d = ready();
  const product = d.select().from(products).where(eq(products.id, productId)).get();
  if (!product) throw new Error(`Product ${productId} not found`);
  const code = toPartName(name);
  if (!code) throw new Error("The name needs at least one letter or digit.");
  if (code.length > 50) throw new Error(`“${code}” is longer than 50 characters.`);
  const clash = d
    .select()
    .from(manufacturedParts)
    .where(
      sql`${manufacturedParts.productId} = ${productId} AND ${manufacturedParts.code} = ${code} COLLATE NOCASE`,
    )
    .get();
  if (clash) throw new Error(`“${code}” is already used by ${clash.name} (${clash.code}).`);
  const [folder] = partFolders(productId, code);
  if (folder) throw new Error(`The folder ${folder} already exists in ${DIRS.version}.`);
  return { code, sku: versionSku(productId, code, 1) };
}

export const partSku = (productId: number, name: string) => checkNewPart(productId, name).sku;

function addHistory(versionId: number, status: PartStatus, changedAt: string) {
  ready().insert(partStatusHistory).values({ versionId, status, changedAt }).run();
}

export function createPart(productId: number, name: string, description: string): PartVersion {
  const d = ready();
  const { code, sku } = checkNewPart(productId, name);
  const id = d.transaction((tx) => {
    const t = now();
    const part = tx
      .insert(manufacturedParts)
      .values({ productId, name: name.trim(), code, createdAt: t })
      .returning()
      .get();
    const { id } = tx
      .insert(partVersions)
      .values({
        partId: part.id,
        version: 1,
        sku,
        description: description.trim(),
        status: "In development",
        createdAt: t,
        updatedAt: t,
      })
      .returning({ id: partVersions.id })
      .get();
    addHistory(id, "In development", t);
    mkdirSync(join(partsDir(), sku)); // throws → rollback
    return id;
  });
  return assemble([versionRow(id)])[0];
}

// Above both the db and the part's folders, so a folder without a db row is never overwritten.
function nextVersion(fromId: number) {
  const { v, product } = versionRow(fromId);
  const part = ready()
    .select()
    .from(manufacturedParts)
    .where(eq(manufacturedParts.id, v.partId))
    .get()!;
  const maxDb = ready()
    .select({ m: sql<number>`max(${partVersions.version})` })
    .from(partVersions)
    .where(eq(partVersions.partId, part.id))
    .get()!.m;
  const maxDir = Math.max(
    0,
    ...partFolders(product.id, part.code).map((f) => Number(VERSION_RE.exec(f)![3])),
  );
  const n = Math.max(maxDb, maxDir) + 1;
  return { from: v, n, sku: versionSku(product.id, part.code, n) };
}

export const nextVersionSku = (fromId: number) => nextVersion(fromId).sku;

export function newVersion(fromId: number): PartVersion {
  const d = ready();
  const id = d.transaction((tx) => {
    const { from, n, sku } = nextVersion(fromId); // same connection, so this read is inside the transaction
    const t = now();
    const { id } = tx
      .insert(partVersions)
      .values({
        partId: from.partId,
        version: n,
        sku,
        description: from.description,
        status: "In development",
        createdAt: t,
        updatedAt: t,
      })
      .returning({ id: partVersions.id })
      .get();
    addHistory(id, "In development", t);
    for (const { id: _, versionId: __, ...l } of tx
      .select()
      .from(compositionLines)
      .where(eq(compositionLines.versionId, from.id))
      .all())
      tx.insert(compositionLines)
        .values({ ...l, versionId: id })
        .run();
    // Files last: a failure here rolls back the db. The source folder may be missing (deleted by hand).
    const src = join(partsDir(), from.sku);
    const dst = join(partsDir(), sku);
    if (existsSync(src)) cpSync(src, dst, { recursive: true, errorOnExist: true, force: false });
    else mkdirSync(dst);
    return id;
  });
  return assemble([versionRow(id)])[0];
}

// At most one Active version per part: activating one retires the other and marks lines To review.
export function updatePartVersion(
  id: number,
  description: string,
  status: PartStatus,
): PartVersion {
  if (!PART_STATUSES.includes(status)) throw new Error(`Invalid status: ${status}`);
  const d = ready();
  d.transaction((tx) => {
    const { v: old } = versionRow(id);
    const t = now();
    if (old.status !== status) {
      if (status === "Active") {
        const active = tx
          .select()
          .from(partVersions)
          .where(
            and(
              eq(partVersions.partId, old.partId),
              eq(partVersions.status, "Active"),
              ne(partVersions.id, id),
            ),
          )
          .get();
        if (active) {
          tx.update(partVersions)
            .set({ status: "Retired", updatedAt: t })
            .where(eq(partVersions.id, active.id))
            .run();
          addHistory(active.id, "Retired", t);
        }
        markOtherVersionLines(old.partId, id);
      }
      addHistory(id, status, t);
    }
    tx.update(partVersions)
      .set({ description: description.trim(), status, updatedAt: t })
      .where(eq(partVersions.id, id))
      .run();
  });
  return assemble([versionRow(id)])[0];
}
