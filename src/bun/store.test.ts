import { expect, test } from "bun:test";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { Database } from "bun:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as store from "./store";
import * as files from "./files";
import * as items from "./items";
import * as operations from "./operations";
import * as parts from "./parts";
import * as composition from "./composition";
import * as variants from "./variants";
import { productSku, skuFolder, toCode, toPartName } from "../shared/sku";
import { compareVersions } from "./db/version";
import { APP_VERSION } from "../shared/version";
import { migrations } from "./db/migrations";
import { readdirSync } from "node:fs";

test("versions", () => {
  expect(compareVersions("1.0.2", "1.0.2")).toBe(0);
  expect(compareVersions("v1.0.10", "1.0.9")).toBeGreaterThan(0);
  expect(compareVersions("1.0.2", "2.0.0")).toBeLessThan(0);
});

test("0.0.1 db migrates to the Research status and keeps its data", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  const d = new Database(join(dir, "db.sqlite"));
  d.exec(migrations[0].sql);
  d.exec(`
INSERT INTO meta VALUES ('version', '0.0.1');
INSERT INTO products VALUES (3, 'EK-PRD_00003', 'Cable', '', 'Active', 't', 't');
INSERT INTO status_history (product_id, status, changed_at) VALUES (3, 'In development', 't'), (3, 'Active', 't');
`);
  d.close();
  expect(store.openFolder(dir).kind).toBe("needsMigration");
  expect(store.migrate().state.kind).toBe("ready");
  expect(store.updateProduct(3, "Cable", "", "Research").status).toBe("Research");
  expect(store.getProduct(3).product.sku).toBe("EK-PRD-00003");
  expect(store.getProduct(3).history.map((h) => h.status)).toEqual([
    "In development",
    "Active",
    "Research",
  ]);
  expect(() => store.updateProduct(3, "Cable", "", "Nope" as never)).toThrow();
  store.close();
  const check = new Database(join(dir, "db.sqlite"));
  expect(check.query("PRAGMA foreign_key_check").all()).toEqual([]);
  expect(check.query("SELECT sql FROM sqlite_master WHERE name = 'status_history'").get()).toEqual({
    sql: expect.stringContaining("REFERENCES products(id)"),
  });
  check.close();
});

test("code format and SKU folders", () => {
  expect(toCode("1,75 mm")).toBe("175MM");
  expect(toCode("Male-Female")).toBe("MALEFEMALE");
  expect(toCode("1.75mm")).toBe("1.75MM");
  expect(toCode("Würth.")).toBe("WURTH");
  expect(toCode("---")).toBe("");
  expect(skuFolder("EK-PRD-00001")).toBe("1_PRODUCTS");
  expect(skuFolder("EK-MAT-A-B-C-D-3MM")).toBe("3_MATERIALS");
  expect(skuFolder("EK-PRT-A-B-M3X5.7")).toBe("4_PARTS");
  for (const bad of ["EK-MAT-..", "EK-PRT-A-.", "EK-PRT-a", "EK-PRT-A/B", "../EK-PRD-00001"])
    expect(() => skuFolder(bad)).toThrow();
});

test("materials, parts, lists and prices", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  // a 0.0.2 db with one product migrates to the items schema
  const d = new Database(join(dir, "db.sqlite"));
  d.exec(migrations[0].sql + migrations[1].sql);
  d.exec("INSERT INTO meta VALUES ('version', '0.0.2')");
  d.close();
  expect(store.openFolder(dir).kind).toBe("needsMigration");
  expect(store.migrate().state.kind).toBe("ready");
  expect(existsSync(join(dir, "3_MATERIALS"))).toBe(true);
  expect(existsSync(join(dir, "4_PARTS"))).toBe(true);
  expect(items.getCurrency()).toBe("€");
  expect(items.setCurrency(" $ ")).toBe("$");

  const add = (list: Parameters<typeof items.addEntry>[0], name: string, code = name) =>
    items.addEntry(list, name, code).id;
  const lacry = add("seller", "L'acrylic", "lacry");
  expect(() => items.addEntry("seller", "Other", "LACRY")).toThrow("already used by L'acrylic");
  expect(() => items.addEntry("seller", "Empty", "--")).toThrow();
  expect(() => items.addEntry("seller", " ", "X")).toThrow();
  const pmma = add("materialType", "PMMA");
  const blk = add("colour", "Black", "BLK");
  const opq = add("finish", "Opaque", "OPQ");
  const sheet = add("unit", "sheet");
  expect(() => items.addEntry("unit", "Sheet", "")).toThrow(); // units are unique ignoring case
  const bossard = add("seller", "Bossard");
  const standoff = add("partType", "Standoff");
  const piece = add("unit", "piece");

  const mat = {
    kind: "material" as const,
    sellerId: lacry,
    typeId: pmma,
    colourId: blk,
    finishId: opq,
    size: "3 mm",
    specs: [],
    unitId: sheet,
    description: "Cast acrylic",
    sellerSku: "",
    firstPrice: { date: "2026-03-12", amount: 169000 },
  };
  const m = items.createItem(mat);
  expect(m.sku).toBe("EK-MAT-LACRY-PMMA-BLK-OPQ-3MM");
  expect(m.status).toBe("Active");
  expect(m.price?.amount).toBe(169000);
  expect(existsSync(join(dir, "3_MATERIALS", m.sku))).toBe(true);
  expect(() => items.createItem(mat)).toThrow("already exists");
  expect(() => items.createItem({ ...mat, typeId: standoff })).toThrow(); // wrong list
  expect(() => items.createItem({ ...mat, size: "--" })).toThrow();

  const p = items.createItem({
    ...mat,
    kind: "part",
    sellerId: bossard,
    typeId: standoff,
    colourId: null,
    finishId: null,
    specs: ["M2x10", " ", "Male-Female"],
    unitId: piece,
    firstPrice: null,
  });
  expect(p.sku).toBe("EK-PRT-BOSSARD-STANDOFF-M2X10-MALEFEMALE");
  expect(p.price).toBeNull();
  expect(() => items.createItem({ ...mat, kind: "part", specs: ["-"] })).toThrow();

  // current price: latest date, then latest entered
  items.addPrice(m.id, "2026-09-12", 1840);
  items.addPrice(m.id, "2026-09-12", 1850);
  items.addPrice(m.id, "2026-01-01", 100);
  expect(items.getItem(m.id).item.price?.amount).toBe(1850);
  expect(() => items.addPrice(m.id, "nope", 1)).toThrow();
  expect(() => items.addPrice(m.id, "2026-02-31", 1)).toThrow("Pick a date");
  expect(() => items.addPrice(m.id, "2026-13-01", 1)).toThrow("Pick a date");
  expect(() => items.addPrice(m.id, "2026-01-01", 1.5)).toThrow();
  const latest = items.getItem(m.id).prices[0];
  items.deletePrice(latest.id);
  expect(items.getItem(m.id).item.price?.amount).toBe(1840);

  // search and status
  expect(items.listItems("material", "acryl").length).toBe(1);
  expect(items.listItems("material", "bossard").length).toBe(0);
  expect(items.listItems("part", "standoff").length).toBe(1);
  items.updateItem(m.id, "Cast", "CA-1", "Retired");
  items.updateItem(m.id, "Cast", "CA-1", "Active");
  expect(items.getItem(m.id).history.map((h) => h.status)).toEqual(["Active", "Retired", "Active"]);
  expect(() => items.updateItem(m.id, "", "", "Research" as never)).toThrow();

  // the explorer works in item folders
  files.mkdir(p.sku, "", "datasheets");
  expect(files.listDir(p.sku, "")[0].name).toBe("datasheets");

  // colour and finish are optional (raw materials)
  const raw = items.createItem({ ...mat, finishId: null, firstPrice: null });
  expect(raw.sku).toBe("EK-MAT-LACRY-PMMA-BLK-3MM");
  expect(items.createItem({ ...mat, colourId: null, finishId: null, firstPrice: null }).sku).toBe(
    "EK-MAT-LACRY-PMMA-3MM",
  );
  store.close();
});

test("0.1.0 prices move to 4 decimals", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  const d = new Database(join(dir, "db.sqlite"));
  d.exec(
    migrations
      .slice(0, 3)
      .map((m) => m.sql)
      .join(""),
  );
  d.exec(`
UPDATE meta SET value = '0.1.0' WHERE key = 'version';
INSERT INTO meta VALUES ('version', '0.1.0') ON CONFLICT DO NOTHING;
INSERT INTO list_entries (list, name, code, created_at) VALUES ('seller', 'S', 'S', 't'), ('partType', 'T', 'T', 't'), ('unit', 'piece', 'piece', 't');
INSERT INTO items (kind, sku, seller_id, type_id, specs, unit_id, status, created_at, updated_at) VALUES ('part', 'EK-PRT_S_T_M3', 1, 2, '["M3"]', 3, 'Active', 't', 't');
INSERT INTO item_prices (item_id, date, cents) VALUES (1, '2026-01-01', 1840);
`);
  d.close();
  mkdirSync(join(dir, "4_PARTS", "EK-PRT_S_T_M3"), { recursive: true });
  expect(store.openFolder(dir).kind).toBe("needsMigration");
  expect(store.migrate().state.kind).toBe("ready");
  expect(items.getItem(1).item.price?.amount).toBe(184000);
  expect(items.getItem(1).item.sku).toBe("EK-PRT-S-T-M3");
  expect(readdirSync(join(dir, "4_PARTS"))).toEqual(["EK-PRT-S-T-M3"]);
  expect(existsSync(join(dir, "2_MANUFACTURED_PARTS"))).toBe(true);
  expect(existsSync(join(dir, "5_OPERATIONS"))).toBe(true);
  store.close();
});

test("part names", () => {
  expect(toPartName("Tool ID card")).toBe("toolIdCard");
  expect(toPartName("Mini-figure (base)")).toBe("miniFigureBase");
  expect(toPartName("Pièce ßeta 3D")).toBe("pieceEta3d");
  expect(toPartName(" -- ")).toBe("");
  expect(skuFolder("EK-MAN-00012-toolIdCard-v2")).toBe("2_MANUFACTURED_PARTS");
  expect(skuFolder("EK-OP-00001")).toBe("5_OPERATIONS");
  for (const bad of ["EK-MAN-00012-toolIdCard-v0", "EK-MAN-00012-Tool-v1", "EK-MAN-00012-a/b_v1"])
    expect(() => skuFolder(bad)).toThrow();
});

test("operations, manufactured parts, composition, cost and To review", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  expect(store.openFolder(dir).kind).toBe("ready");
  const entry = (list: Parameters<typeof items.addEntry>[0], name: string) =>
    items.addEntry(list, name, name).id;
  const kg = entry("unit", "kg");
  const piece = entry("unit", "piece");
  const seller = entry("seller", "S");
  const pla = items.createItem({
    kind: "material",
    sellerId: seller,
    typeId: entry("materialType", "PLA"),
    colourId: null,
    finishId: null,
    size: "1.75",
    specs: [],
    unitId: kg,
    description: "",
    sellerSku: "",
    firstPrice: { date: "2026-01-01", amount: 200000 }, // 20 € / kg
  });
  const screw = items.createItem({
    colourId: null,
    finishId: null,
    size: "",
    description: "",
    sellerSku: "",
    kind: "part",
    sellerId: seller,
    typeId: entry("partType", "Screw"),
    specs: ["M3"],
    unitId: piece,
    firstPrice: { date: "2026-01-01", amount: 230 }, // 0.023 € each
  });

  // operations
  const print = operations.createOperation({
    name: "3D printing",
    description: "",
    rateKind: "hour",
    unitId: null,
    firstRate: { date: "2026-01-01", amount: 9500 }, // 0.95 € / h
  });
  expect(print.sku).toBe("EK-OP-00001");
  expect(existsSync(join(dir, "5_OPERATIONS", print.sku))).toBe(true);
  expect(() =>
    operations.createOperation({
      name: "Bend",
      description: "",
      rateKind: "quantity",
      unitId: null,
      firstRate: null,
    }),
  ).toThrow("unit");
  const sand = operations.createOperation({
    name: "Sanding",
    description: "",
    rateKind: "quantity",
    unitId: piece,
    firstRate: null,
  });
  expect(sand.unit?.name).toBe("piece");
  expect(operations.listOperations("print").length).toBe(1);

  // parts: name, preview, clash, orphan folder
  const prd = store.createProduct("Figure", "");
  const prd2 = store.createProduct("Box", "");
  expect(parts.partSku(prd.id, "Mini figure")).toBe("EK-MAN-00001-miniFigure-v1");
  const fig = parts.createPart(prd.id, "Mini figure", "");
  expect(fig).toMatchObject({ version: 1, status: "In development", cost: { value: null } });
  expect(existsSync(join(dir, "2_MANUFACTURED_PARTS", fig.sku))).toBe(true);
  expect(() => parts.createPart(prd.id, "MINI-FIGURE", "")).toThrow("already used by Mini figure");
  expect(() => parts.createPart(prd.id, "x".repeat(51), "")).toThrow("50");
  mkdirSync(join(dir, "2_MANUFACTURED_PARTS", "EK-MAN-00001-base-v3"));
  expect(() => parts.createPart(prd.id, "Base", "")).toThrow("EK-MAN-00001-base-v3");
  const base = parts.createPart(prd2.id, "Base", ""); // same name, other product: fine
  expect(base.sku).toBe("EK-MAN-00002-base-v1");

  // composition and cost
  const V = (id: number) => ({ kind: "version" as const, id });
  composition.addLine(V(fig.id), { kind: "item", id: pla.id }, 14); // 0.014 kg
  composition.addLine(V(fig.id), { kind: "operation", id: print.id }, 5760); // 1 h 36 min
  composition.addLine(V(fig.id), { kind: "operation", id: sand.id }, 2000); // no rate
  expect(() => composition.addLine(V(fig.id), { kind: "item", id: pla.id }, 1)).toThrow("already");
  expect(() => composition.addLine(V(fig.id), { kind: "item", id: screw.id }, 0)).toThrow();
  let c = composition.getComposition(V(fig.id));
  expect(c.lines.map((l) => l.measure)).toEqual(["quantity", "duration", "quantity"]);
  expect(c.lines.map((l) => l.unit)).toEqual(["kg", null, "piece"]);
  expect(c.lines[0].cost.value).toBeCloseTo(0.28);
  expect(c.lines[1].cost.value).toBeCloseTo(1.52);
  expect(c.lines[2].cost).toEqual({ value: null, partial: true });
  expect(c.cost.value).toBeCloseTo(1.8);
  expect(c.cost.partial).toBe(true);

  // reorder: sanding to the top, then back down; ends are no-ops
  const order = () => composition.getComposition(V(fig.id)).lines.map((l) => l.measure);
  composition.moveLine(c.lines[2].id, -1);
  composition.moveLine(c.lines[2].id, -1);
  composition.moveLine(c.lines[2].id, -1);
  expect(order()).toEqual(["quantity", "quantity", "duration"]);
  expect(composition.getComposition(V(fig.id)).lines[0].id).toBe(c.lines[2].id);
  composition.moveLine(c.lines[2].id, 1);
  composition.moveLine(c.lines[2].id, 1);
  composition.moveLine(c.lines[2].id, 1);
  expect(composition.getComposition(V(fig.id)).lines.map((l) => l.id)).toEqual(
    c.lines.map((l) => l.id),
  );

  // only Active versions can be picked; one Active per part
  const P = { kind: "product" as const, id: prd2.id };
  expect(() => composition.addLine(P, V(fig.id), 2)).toThrow("only Active");
  expect(() => composition.addLine(P, { kind: "item", id: pla.id }, 1)).toThrow("only holds");
  parts.updatePartVersion(fig.id, "", "Active");
  composition.addLine(P, V(fig.id), 2);
  composition.addLine(P, { kind: "item", id: screw.id }, 4000);
  composition.addLine(P, { kind: "operation", id: print.id }, 1800); // batch labour, once per product
  c = composition.getComposition(P);
  expect(c.lines[2].measure).toBe("duration");
  expect(c.cost.value).toBeCloseTo(2 * 1.8 + 4 * 0.023 + c.lines[2].cost.value!);
  expect(c.cost.partial).toBe(true); // through the version
  expect(composition.usedBy(V(fig.id))).toEqual([
    { kind: "product", id: prd2.id, sku: prd2.sku, name: "Box" },
  ]);

  // cycles
  parts.updatePartVersion(base.id, "", "Active");
  composition.addLine(V(fig.id), V(base.id), 1);
  expect(() => composition.addLine(V(base.id), V(fig.id), 1)).toThrow(
    `${fig.sku} already uses ${base.sku}`,
  );
  expect(() => composition.addLine(V(fig.id), V(fig.id), 1)).toThrow("itself");

  // new version: next number above the folders, composition and files copied
  writeFileSync(join(dir, "2_MANUFACTURED_PARTS", fig.sku, "a.stl"), "x");
  mkdirSync(join(dir, "2_MANUFACTURED_PARTS", "EK-MAN-00001-minifigure-v4"));
  expect(parts.nextVersionSku(fig.id)).toBe("EK-MAN-00001-miniFigure-v5");
  const v5 = parts.newVersion(fig.id);
  expect(v5).toMatchObject({ version: 5, status: "In development" });
  expect(existsSync(join(dir, "2_MANUFACTURED_PARTS", v5.sku, "a.stl"))).toBe(true);
  expect(composition.getComposition(V(v5.id)).lines.length).toBe(4);

  // activating v5 retires v1 and marks the product line, not on a Retired product
  const prd3 = store.createProduct("Old", "");
  composition.addLine({ kind: "product", id: prd3.id }, V(fig.id), 1);
  store.updateProduct(prd3.id, "Old", "", "Retired");
  expect(() =>
    composition.addLine({ kind: "product", id: prd3.id }, { kind: "item", id: screw.id }, 1),
  ).toThrow("retired");
  parts.updatePartVersion(v5.id, "", "Active");
  const { version, siblings } = parts.getPartVersion(fig.id);
  expect(version.status).toBe("Retired");
  expect(parts.getPartVersion(fig.id).history.map((h) => h.status)).toEqual([
    "In development",
    "Active",
    "Retired",
  ]);
  expect(siblings.map((s) => s.version)).toEqual([5]);
  const line = composition.getComposition(P).lines.find((l) => l.component.kind === "version")!;
  expect(line).toMatchObject({ toReview: true, status: "Retired" });
  expect(store.listProducts("Box")[0].toReview).toBe(true);
  expect(composition.getComposition({ kind: "product", id: prd3.id }).lines[0].toReview).toBe(
    false,
  );
  // un-retiring marks it
  store.updateProduct(prd3.id, "Old", "", "Active");
  expect(composition.getComposition({ kind: "product", id: prd3.id }).lines[0].toReview).toBe(true);

  // switching to the Active version clears the mark; mark as reviewed too
  expect(() => composition.updateLine(line.id, 2, base.id)).toThrow("same part");
  composition.updateLine(line.id, 3, v5.id);
  expect(store.listProducts("Box")[0].toReview).toBe(false);
  const old = composition.getComposition({ kind: "product", id: prd3.id }).lines[0];
  composition.markReviewed(old.id);
  expect(composition.getComposition({ kind: "product", id: prd3.id }).lines[0].toReview).toBe(
    false,
  );
  expect(parts.listPartVersions("box", null, null).map((v) => v.sku)).toEqual([base.sku]); // origin product
  expect(parts.listPartVersions("", "Active", prd.id).map((v) => v.version)).toEqual([5]);
  composition.deleteLine(old.id);
  expect(composition.getComposition({ kind: "product", id: prd3.id }).lines).toEqual([]);
  store.close();
});

test("product variants: composition moves, copies, swaps at depth, cost range", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  expect(store.openFolder(dir)).toEqual({ kind: "ready" });
  const entry = (list: Parameters<typeof items.addEntry>[0], name: string) =>
    items.addEntry(list, name, name).id;
  const m2 = entry("unit", "m2");
  const kg = entry("unit", "kg");
  const piece = entry("unit", "piece");
  const seller = entry("seller", "S");
  const pmma = entry("materialType", "PMMA");
  const mat = (colour: string, unitId: number, amount: number) =>
    items.createItem({
      kind: "material",
      sellerId: seller,
      typeId: pmma,
      colourId: entry("colour", colour),
      finishId: null,
      size: "3MM",
      specs: [],
      unitId,
      description: "",
      sellerSku: "",
      firstPrice: { date: "2026-01-01", amount },
    });
  const yellow = mat("YEL", m2, 100000); // 10 € / m²
  const blue = mat("BLU", m2, 200000); // 20 € / m²
  const heavy = mat("HVY", kg, 10000);
  const box = (spec: string, amount: number) =>
    items.createItem({
      kind: "part",
      sellerId: seller,
      typeId: entry("partType", `BOX${spec}`),
      colourId: null,
      finishId: null,
      size: "",
      specs: [spec],
      unitId: piece,
      description: "",
      sellerSku: "",
      firstPrice: { date: "2026-01-01", amount },
    });
  const small = box("S", 5000); // 0.50 €
  const large = box("L", 10000); // 1.00 €

  // card (yellow PMMA) inside a kit: the swap applies at depth
  const prd = store.createProduct("Tool ID card", "");
  const card = parts.createPart(prd.id, "Card", "");
  composition.addLine({ kind: "version", id: card.id }, { kind: "item", id: yellow.id }, 100); // 0.1 m² → 1 €
  parts.updatePartVersion(card.id, "", "Active");
  const kit = parts.createPart(prd.id, "Kit", "");
  composition.addLine({ kind: "version", id: kit.id }, { kind: "version", id: card.id }, 10);
  parts.updatePartVersion(kit.id, "", "Active");

  const P = { kind: "product" as const, id: prd.id };
  composition.addLine(P, { kind: "version", id: kit.id }, 1);
  composition.addLine(P, { kind: "item", id: small.id }, 1000);
  expect(store.getProduct(prd.id).cost.value).toBeCloseTo(10.5);

  // first variant takes the product's composition
  expect(variants.variantSku(prd.id, "y 10").sku).toBe("EK-PRD-00001-Y10");
  const y10 = variants.createVariant(prd.id, "Y10", "Yellow ×10", "", null);
  expect(composition.getComposition(P).lines).toEqual([]);
  expect(composition.getComposition({ kind: "variant", id: y10.id }).lines.length).toBe(2);
  expect(() => composition.addLine(P, { kind: "item", id: large.id }, 1000)).toThrow("variants");
  expect(() => variants.createVariant(prd.id, "y10", "Dup", "", null)).toThrow("already used");

  // copy, then swap: blue PMMA inside the card, large box on the variant
  const b10 = variants.createVariant(prd.id, "B10", "Blue ×10", "", y10.id);
  const B = { kind: "variant" as const, id: b10.id };
  expect(composition.getComposition(B).lines.length).toBe(2);
  expect(
    variants
      .listSwaps(b10.id)
      .items.map((i) => i.id)
      .sort(),
  ).toEqual([yellow.id, small.id].sort());
  variants.addSwap(b10.id, yellow.id, blue.id);
  variants.addSwap(b10.id, small.id, large.id);
  expect(() => variants.addSwap(b10.id, yellow.id, blue.id)).toThrow("already replaced");
  expect(() => variants.addSwap(b10.id, blue.id, heavy.id)).toThrow("price unit");
  expect(() => variants.addSwap(b10.id, blue.id, large.id)).toThrow("raw material");
  const c = composition.getComposition(B);
  expect(c.cost.value).toBeCloseTo(21); // 10 cards × 0.1 m² × 20 € + 1 €
  expect(c.lines[1].swap).toBe(large.sku);
  expect(parts.getPartVersion(card.id).version.cost.value).toBeCloseTo(1); // the part is unchanged
  expect(store.getProduct(prd.id).cost).toMatchObject({ value: 10.5, max: 21 });
  expect(store.listProducts("blue ×10").map((p) => p.id)).toEqual([prd.id]);
  expect(composition.usedBy({ kind: "item", id: blue.id })).toEqual([
    { kind: "variant", id: b10.id, sku: b10.sku, name: "Blue ×10" },
  ]);

  // a swap whose item is gone is not used; a copy keeps the swaps
  variants.addSwap(b10.id, heavy.id, mat("HV2", kg, 1).id);
  expect(variants.listSwaps(b10.id).swaps.map((s) => s.unused)).toEqual([false, false, true]);
  const b100 = variants.createVariant(prd.id, "B100", "Blue ×100", "", b10.id);
  expect(variants.listSwaps(b100.id).swaps.length).toBe(3);

  // a new Active kit version marks the variant lines that use the old one
  const kit2 = parts.newVersion(kit.id);
  parts.updatePartVersion(kit2.id, "", "Active");
  expect(store.listProducts("").find((p) => p.id === prd.id)!.toReview).toBe(true);

  // retired: locked
  store.updateProduct(prd.id, "Tool ID card", "", "Retired");
  expect(() => variants.deleteVariant(b100.id)).toThrow("retired");
  expect(() => variants.addSwap(b10.id, small.id, large.id)).toThrow("retired");
  store.updateProduct(prd.id, "Tool ID card", "", "Active");

  // deleting the last variant gives its composition back to the product
  variants.deleteVariant(b100.id);
  variants.deleteVariant(b10.id);
  variants.deleteVariant(y10.id);
  expect(store.getProduct(prd.id).variants).toEqual([]);
  expect(composition.getComposition(P).lines.length).toBe(2);
  expect(store.getProduct(prd.id).cost.value).toBeCloseTo(10.5);
  store.close();
});

test("old SKUs in a current db are converted on open, folders included", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  expect(store.openFolder(dir)).toEqual({ kind: "ready" }); // fresh db at the current version
  store.close();
  const d = new Database(join(dir, "db.sqlite"));
  d.exec(`
INSERT INTO products VALUES (1, 'EK-PRD_00001', 'Box', '', 'Active', 't', 't');
INSERT INTO operations VALUES (1, 'EK-OPE_00001', 'Cut', '', 'hour', NULL, 't', 't');
`);
  d.close();
  mkdirSync(join(dir, "1_PRODUCTS", "EK-PRD-00001"), { recursive: true }); // already renamed
  mkdirSync(join(dir, "5_OPERATIONS", "EK-OPE-00001"), { recursive: true });
  expect(store.openFolder(dir).kind).toBe("ready");
  expect(store.getProduct(1).product.sku).toBe("EK-PRD-00001");
  expect(operations.getOperation(1).operation.sku).toBe("EK-OP-00001");
  expect(readdirSync(join(dir, "5_OPERATIONS"))).toEqual(["EK-OP-00001"]);
  store.close();
});

// chmod can't lock a folder on Windows
test.skipIf(process.platform === "win32")(
  "a folder that can't be renamed doesn't block opening",
  () => {
    const dir = mkdtempSync(join(tmpdir(), "sku-"));
    store.openFolder(dir);
    store.close();
    mkdirSync(join(dir, "1_PRODUCTS", "EK-PRD_00001"));
    chmodSync(join(dir, "1_PRODUCTS"), 0o555);
    try {
      expect(store.openFolder(dir).kind).toBe("ready");
    } finally {
      chmodSync(join(dir, "1_PRODUCTS"), 0o755);
    }
    expect(store.openFolder(dir).kind).toBe("ready"); // retried once unlocked
    expect(readdirSync(join(dir, "1_PRODUCTS"))).toEqual(["EK-PRD-00001"]);
    store.close();
  },
);

test("a folder with another app's db.sqlite is left untouched", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  new Database(join(dir, "db.sqlite")).exec("CREATE TABLE other (x)");
  expect(store.openFolder(dir).kind).toBe("error");
  expect(readdirSync(dir)).toEqual(["db.sqlite"]);
});

test("init, sku numbering, history, files", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  expect(store.openFolder(dir).kind).toBe("ready");
  expect(store.inspectFolder(dir)).toMatchObject({
    hasDb: true,
    products: 0,
    dbVersion: APP_VERSION,
  });
  expect(productSku(store.nextId())).toBe("EK-PRD-00001");
  const a = store.createProduct(" Cable ", "red");
  expect(a.sku).toBe("EK-PRD-00001");
  expect(existsSync(join(dir, "1_PRODUCTS", "EK-PRD-00001"))).toBe(true);
  // orphan folder bumps the counter: SKUs are never reassigned
  mkdirSync(join(dir, "1_PRODUCTS", "EK-PRD-00007"));
  expect(store.createProduct("Plug", "").sku).toBe("EK-PRD-00008");
  expect(() => store.createProduct("  ", "")).toThrow();

  store.updateProduct(a.id, "Cable", "red", "Active");
  store.updateProduct(a.id, "Cable 2", "red", "Active");
  expect(store.getProduct(a.id).history.map((h) => h.status)).toEqual(["In development", "Active"]);
  expect(store.listProducts("cable").length).toBe(1);
  expect(store.listProducts("_").length).toBe(0); // not a LIKE wildcard

  // files
  files.mkdir(a.sku, "", "docs");
  expect(files.listDir(a.sku, "")[0]).toMatchObject({ name: "docs", isDir: true, size: 0 });
  writeFileSync(files.resolveIn(a.sku, "docs/a.txt"), "x");
  files.copy(a.sku, ["docs/a.txt"], "docs");
  expect(files.listDir(a.sku, "docs").map((f) => f.name)).toEqual(["a (copy).txt", "a.txt"]);
  files.move(a.sku, ["docs/a.txt"], "");
  expect(() => files.move(a.sku, ["docs"], "docs")).toThrow();
  expect(() => files.resolveIn(a.sku, "../EK-PRD-00008")).toThrow();
  expect(() => files.listDir("../x", "")).toThrow();
  expect(() => files.mkdir(a.sku, "", "a/b")).toThrow();
  for (const n of ["CON", "aux.txt", "Com1", "lpt9.tar.gz"])
    expect(() => files.mkdir(a.sku, "", n)).toThrow("Invalid name");
  files.mkdir(a.sku, "", "console"); // only the exact reserved names
  // rename: refuses a taken name, allows a case-only rename of the same file
  writeFileSync(files.resolveIn(a.sku, "b.txt"), "b");
  expect(() => files.rename(a.sku, "b.txt", "a.txt")).toThrow("already exists");
  expect(readFileSync(files.resolveIn(a.sku, "a.txt"), "utf8")).toBe("x");
  files.rename(a.sku, "b.txt", "B.txt");
  if (process.platform === "linux") {
    writeFileSync(files.resolveIn(a.sku, "b.txt"), "other");
    expect(() => files.rename(a.sku, "b.txt", "B.txt")).toThrow("already exists");
  }
  expect(files.uploadTarget(a.sku, "new/sub/a.txt")).toEndWith(join("new", "sub", "a.txt"));

  // reopen keeps data
  store.close();
  expect(store.openFolder(dir).kind).toBe("ready");
  expect(store.listProducts("").length).toBe(2);
  store.close();

  // older db → migration with backup; newer db → app outdated
  const set = (v: string) => {
    const d = new Database(join(dir, "db.sqlite"));
    d.run("UPDATE meta SET value = ? WHERE key = 'version'", [v]);
    d.close();
  };
  set("0.0.0");
  expect(store.openFolder(dir).kind).toBe("needsMigration");
  migrations.length = 0; // schema is already current, only the version bump + backup are under test
  const m = store.migrate();
  expect(m.state.kind).toBe("ready");
  expect(m.backup).toStartWith("db.backup-v0.0.0-");
  expect(store.lastBackup()).not.toBeNull();
  store.backup();
  expect(store.backup()).toEndWith("-2.sqlite"); // same version and day → suffixed
  expect(readdirSync(dir).some((f) => f.startsWith("db.backup-v0.0.0-"))).toBe(true);
  expect(store.dbVersion()).toBe(APP_VERSION);
  store.close();
  set("9.0.0");
  expect(store.openFolder(dir).kind).toBe("appOutdated");
  expect(() => store.listProducts("")).toThrow();
  store.close();
});
