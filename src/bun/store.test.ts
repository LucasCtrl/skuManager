import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, existsSync, writeFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as store from "./store";
import * as files from "./files";
import * as items from "./items";
import { skuFolder, toCode } from "../shared/sku";
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
  expect(skuFolder("EK-PRD_00001")).toBe("1_PRODUCTS");
  expect(skuFolder("EK-MAT_A_B_C_D_3MM")).toBe("3_MATERIALS");
  expect(skuFolder("EK-PRT_A_B_M3X5.7")).toBe("4_PARTS");
  for (const bad of ["EK-MAT_..", "EK-PRT_A_.", "EK-PRT_a", "EK-PRT_A/B", "../EK-PRD_00001"])
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
    firstPrice: { date: "2026-03-12", cents: 1690 },
  };
  const m = items.createItem(mat);
  expect(m.sku).toBe("EK-MAT_LACRY_PMMA_BLK_OPQ_3MM");
  expect(m.status).toBe("Active");
  expect(m.price?.cents).toBe(1690);
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
  expect(p.sku).toBe("EK-PRT_BOSSARD_STANDOFF_M2X10_MALEFEMALE");
  expect(p.price).toBeNull();
  expect(() => items.createItem({ ...mat, kind: "part", specs: ["-"] })).toThrow();

  // current price: latest date, then latest entered
  items.addPrice(m.id, "2026-09-12", 1840);
  items.addPrice(m.id, "2026-09-12", 1850);
  items.addPrice(m.id, "2026-01-01", 100);
  expect(items.getItem(m.id).item.price?.cents).toBe(1850);
  expect(() => items.addPrice(m.id, "nope", 1)).toThrow();
  expect(() => items.addPrice(m.id, "2026-01-01", 1.5)).toThrow();
  const latest = items.getItem(m.id).prices[0];
  items.deletePrice(latest.id);
  expect(items.getItem(m.id).item.price?.cents).toBe(1840);

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
  store.close();
});

test("init, sku numbering, history, files", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  expect(store.openFolder(dir).kind).toBe("ready");
  expect(store.inspectFolder(dir)).toMatchObject({
    hasDb: true,
    products: 0,
    dbVersion: APP_VERSION,
  });
  expect(store.skuOf(store.nextId())).toBe("EK-PRD_00001");
  const a = store.createProduct(" Cable ", "red");
  expect(a.sku).toBe("EK-PRD_00001");
  expect(existsSync(join(dir, "1_PRODUCTS", "EK-PRD_00001"))).toBe(true);
  // orphan folder bumps the counter: SKUs are never reassigned
  mkdirSync(join(dir, "1_PRODUCTS", "EK-PRD_00007"));
  expect(store.createProduct("Plug", "").sku).toBe("EK-PRD_00008");
  expect(() => store.createProduct("  ", "")).toThrow();

  store.updateProduct(a.id, "Cable", "red", "Active");
  store.updateProduct(a.id, "Cable 2", "red", "Active");
  expect(store.getProduct(a.id).history.map((h) => h.status)).toEqual(["In development", "Active"]);
  expect(store.listProducts("cable", null).length).toBe(1);
  expect(store.listProducts("", "Active").length).toBe(1);

  // files
  files.mkdir(a.sku, "", "docs");
  expect(files.listDir(a.sku, "")[0]).toMatchObject({ name: "docs", isDir: true, size: 0 });
  writeFileSync(files.resolveIn(a.sku, "docs/a.txt"), "x");
  files.copy(a.sku, ["docs/a.txt"], "docs");
  expect(files.listDir(a.sku, "docs").map((f) => f.name)).toEqual(["a (copy).txt", "a.txt"]);
  files.move(a.sku, ["docs/a.txt"], "");
  expect(() => files.move(a.sku, ["docs"], "docs")).toThrow();
  expect(() => files.resolveIn(a.sku, "../EK-PRD_00008")).toThrow();
  expect(() => files.listDir("../x", "")).toThrow();
  expect(() => files.mkdir(a.sku, "", "a/b")).toThrow();
  expect(files.uploadTarget(a.sku, "new/sub/a.txt")).toEndWith(join("new", "sub", "a.txt"));

  // reopen keeps data
  store.close();
  expect(store.openFolder(dir).kind).toBe("ready");
  expect(store.listProducts("", null).length).toBe(2);
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
  expect(() => store.listProducts("", null)).toThrow();
  store.close();
});
