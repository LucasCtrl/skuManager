// End-to-end UI tests: the real React UI (Vite) on the real backend handlers, driven by Playwright.
// Usage: hutch run e2e [name filter]. Each spec gets a fresh data folder.
import { mkdirSync, mkdtempSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import react from "@vitejs/plugin-react";
import { chromium, type Page } from "playwright-core";
import { createServer } from "vite";
import type { Settings } from "../src/shared/rpc";
import { handlers, type Handlers } from "../src/bun/handlers";
import * as store from "../src/bun/store";

const here = import.meta.dir;
const root = join(here, "..");

export type Rpc = <K extends keyof Handlers>(
  method: K,
  params: Parameters<Handlers[K]>[0],
) => Promise<Awaited<ReturnType<Handlers[K]>>>;
export type Ctx = {
  page: Page;
  rpc: Rpc; // seed data straight through the backend
  step: (name: string, fn: () => Promise<void>) => Promise<void>;
};

// Settings live outside the data folder in the app (index.ts); here they are per spec.
let settings: Settings;
const local: Partial<Handlers> = {
  getSettings: () => settings,
  setSettings: (patch) => (settings = { ...settings, ...patch }),
  defaultFolder: () => settings.dataFolder!,
  getUploadUrl: () => "http://127.0.0.1:1/", // OS drag-in is not testable in a browser
};
const all = { ...handlers, ...local } as Partial<Handlers>;
const call = async (method: string, params: unknown) => {
  const fn = all[method as keyof Handlers] as ((p: unknown) => unknown) | undefined;
  if (!fn) throw new Error(`${method} is native-only and not available in e2e`);
  return await fn(params);
};
const rpc = call as Rpc;

const api = Bun.serve({
  port: 0,
  async fetch(req) {
    try {
      const method = new URL(req.url).pathname.replace("/rpc/", "");
      return Response.json({ result: (await call(method, await req.json())) ?? null });
    } catch (e) {
      return Response.json({ error: (e as Error).message }, { status: 400 });
    }
  },
});

const shim = join(here, "rpc-shim.ts");
const vite = await createServer({
  configFile: false,
  root: join(root, "src/mainview"),
  logLevel: "warn",
  plugins: [
    react(),
    {
      name: "e2e-rpc",
      enforce: "pre",
      // src/mainview/rpc.ts talks to Electrobun; the shim POSTs to the api server instead
      resolveId: (src, importer) =>
        importer?.includes("/src/mainview/") && /^\.{1,2}\/(\.\.\/)*rpc$/.test(src) ? shim : null,
    },
  ],
  server: { port: 5180, proxy: { "/rpc": `http://127.0.0.1:${api.port}` } },
});
await vite.listen();
const url = vite.resolvedUrls!.local[0];

const filter = process.argv[2] ?? "";
const specs = readdirSync(here).filter((f) => f.endsWith(".e2e.ts") && f.includes(filter));
const browser = await chromium.launch();
const failures = join(here, "failures");
let failed = 0;

for (const file of specs) {
  const name = file.replace(".e2e.ts", "");
  const dir = mkdtempSync(join(tmpdir(), "sku-e2e-"));
  if (store.openFolder(dir).kind !== "ready") throw new Error(`Cannot open ${dir}`);
  settings = { dataFolder: dir, theme: "light", lang: "en" };
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  // rpc errors come back as HTTP 400 on purpose (refused input); the UI shows them itself
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource"))
      errors.push(m.text());
  });
  page.on("dialog", (d) => d.accept()); // confirm() before deleting
  let current = "start";
  const step: Ctx["step"] = async (s, fn) => {
    current = s;
    await fn();
    if (errors.length) throw new Error(`Console errors: ${errors.join("\n")}`);
    console.log(`  ok  ${s}`);
  };
  console.log(name);
  try {
    await page.goto(url);
    await (await import(join(here, file))).default({ page, rpc, step } satisfies Ctx);
  } catch (e) {
    failed++;
    mkdirSync(failures, { recursive: true });
    const shot = join(failures, `${name}--${current.replace(/\W+/g, "-")}.png`);
    await page.screenshot({ path: shot, fullPage: true });
    console.log(`  FAIL ${current}\n${(e as Error).message}\n  screenshot: ${shot}`);
  }
  await page.close();
  store.close();
}

await browser.close();
await vite.close();
api.stop();
console.log(failed ? `${failed} of ${specs.length} specs failed` : `${specs.length} specs passed`);
process.exit(failed ? 1 : 0);
