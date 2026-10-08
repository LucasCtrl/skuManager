import { BrowserView, BrowserWindow, Updater, Utils } from "electrobun/main";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AppRPC, Settings } from "../shared/rpc";
import { APP_VERSION } from "../shared/version";
import * as store from "./store";
import * as files from "./files";

// ---------- settings (per-user, outside the data folder) ----------

const configPath = join(Utils.paths.userData, "config.json");
let settings: Settings = { dataFolder: null, theme: "system", lang: null };
try {
  settings = { ...settings, ...JSON.parse(readFileSync(configPath, "utf8")) };
} catch {} // first launch
const saveSettings = () => {
  mkdirSync(Utils.paths.userData, { recursive: true });
  writeFileSync(configPath, JSON.stringify(settings, null, 2));
};

if (settings.dataFolder) store.openFolder(settings.dataFolder);

// ---------- upload server (OS drag-in; the webview only has File objects, no paths) ----------

const token = crypto.randomUUID();
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*" };
const server = Bun.serve({
  hostname: "127.0.0.1",
  port: 0,
  async fetch(req) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (req.method !== "POST" || url.searchParams.get("token") !== token)
      return new Response("Forbidden", { status: 403, headers: cors });
    try {
      const target = files.uploadTarget(
        url.searchParams.get("sku") ?? "",
        url.searchParams.get("path") ?? "",
      );
      // ponytail: whole file buffered in memory; stream to disk if multi-GB files show up.
      await Bun.write(target, await req.arrayBuffer());
      return new Response("ok", { headers: cors });
    } catch (e) {
      return new Response((e as Error).message, { status: 400, headers: cors });
    }
  },
});

// ---------- RPC ----------

const rpc = BrowserView.defineRPC<AppRPC>({
  maxRequestTime: 120_000,
  handlers: {
    requests: {
      getSettings: () => settings,
      setSettings: (patch) => {
        settings = { ...settings, ...patch };
        saveSettings();
        return settings;
      },
      chooseDataFolder: async () => {
        const [dir] = await Utils.openFileDialog({
          startingFolder: settings.dataFolder ?? Utils.paths.documents,
          canChooseFiles: false,
          canChooseDirectory: true,
          allowsMultipleSelection: false,
        });
        if (!dir) return store.getState(); // cancelled
        const state = store.openFolder(dir);
        if (state.kind !== "error") {
          settings.dataFolder = dir;
          saveSettings();
        }
        return state;
      },
      getDbState: () => store.getState(),
      migrate: () => store.migrate(),
      backupDb: () => store.backup(),
      getVersions: () => ({ app: APP_VERSION, db: store.dbVersion() }),

      listProducts: ({ query, status }) => store.listProducts(query, status),
      getProduct: ({ id }) => store.getProduct(id),
      createProduct: ({ name, description }) => store.createProduct(name, description),
      updateProduct: ({ id, name, description, status }) =>
        store.updateProduct(id, name, description, status),

      listDir: ({ sku, path }) => files.listDir(sku, path),
      mkdir: ({ sku, path, name }) => files.mkdir(sku, path, name),
      rename: ({ sku, path, newName }) => files.rename(sku, path, newName),
      trash: ({ sku, paths }) => {
        const abs = paths.map((p) => files.resolveIn(sku, p));
        if (abs.includes(files.productRoot(sku)))
          throw new Error("Cannot delete the product folder");
        for (const p of abs) Utils.moveToTrash(p);
      },
      copy: ({ sku, paths, dest }) => files.copy(sku, paths, dest),
      move: ({ sku, paths, dest }) => files.move(sku, paths, dest),
      openPath: ({ sku, path }) => {
        Utils.openPath(files.resolveIn(sku, path));
      },
      reveal: ({ sku, path }) => {
        Utils.showItemInFolder(files.resolveIn(sku, path));
      },
      getUploadUrl: () => `http://127.0.0.1:${server.port}/?token=${token}`,
    },
    messages: {},
  },
});

// ---------- window ----------

const DEV_SERVER_URL = "http://localhost:5173";
async function mainViewUrl() {
  if ((await Updater.localInfo.channel()) === "dev") {
    try {
      await fetch(DEV_SERVER_URL, { method: "HEAD" });
      return DEV_SERVER_URL;
    } catch {}
  }
  return "views://mainview/index.html";
}

new BrowserWindow({
  title: "SKU Manager",
  url: await mainViewUrl(),
  rpc,
  frame: { width: 1100, height: 760, x: 120, y: 80 },
});
