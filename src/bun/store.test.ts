import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, existsSync, writeFileSync } from "node:fs";
import { Database } from "bun:sqlite";
import { tmpdir } from "node:os";
import { join } from "node:path";
import * as store from "./store";
import * as files from "./files";
import { compareVersions } from "./db/version";
import { migrations } from "./db/migrations";
import { readdirSync } from "node:fs";

test("versions", () => {
  expect(compareVersions("1.0.2", "1.0.2")).toBe(0);
  expect(compareVersions("v1.0.10", "1.0.9")).toBeGreaterThan(0);
  expect(compareVersions("1.0.2", "2.0.0")).toBeLessThan(0);
});

test("init, sku numbering, history, files", () => {
  const dir = mkdtempSync(join(tmpdir(), "sku-"));
  expect(store.openFolder(dir).kind).toBe("ready");
  expect(store.inspectFolder(dir)).toMatchObject({ hasDb: true, products: 0, dbVersion: "1.0.0" });
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
  set("0.9.0");
  expect(store.openFolder(dir).kind).toBe("needsMigration");
  migrations.length = 0; // schema is already 1.0.0, only the version bump + backup are under test
  const m = store.migrate();
  expect(m.state.kind).toBe("ready");
  expect(m.backup).toStartWith("db.backup-v0.9.0-");
  expect(store.lastBackup()).not.toBeNull();
  store.backup();
  expect(store.backup()).toEndWith("-2.sqlite"); // same version and day → suffixed
  expect(readdirSync(dir).some((f) => f.startsWith("db.backup-v0.9.0-"))).toBe(true);
  expect(store.dbVersion()).toBe("1.0.0");
  store.close();
  set("9.0.0");
  expect(store.openFolder(dir).kind).toBe("appOutdated");
  expect(() => store.listProducts("", null)).toThrow();
  store.close();
});
