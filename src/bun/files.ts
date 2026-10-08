// File operations inside a product folder. Every path from the webview goes through `resolveIn`.
import { cpSync, existsSync, mkdirSync, readdirSync, renameSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path";
import type { FileEntry } from "../shared/rpc";
import { productsDir, SKU_RE } from "./store";

export function productRoot(sku: string) {
  if (!SKU_RE.test(sku)) throw new Error(`Invalid SKU: ${sku}`);
  const root = join(productsDir(), sku);
  mkdirSync(root, { recursive: true }); // recreate if someone deleted it by hand
  return root;
}

// Absolute path for a relative one, refusing anything that escapes the product folder.
export function resolveIn(sku: string, rel: string) {
  const root = productRoot(sku);
  const p = resolve(root, rel);
  if (p !== root && !p.startsWith(root + sep)) throw new Error("Path outside product folder");
  return p;
}

const toRel = (sku: string, abs: string) => relative(productRoot(sku), abs).split(sep).join("/");

function entry(sku: string, abs: string): FileEntry {
  const s = statSync(abs);
  return {
    name: basename(abs),
    path: toRel(sku, abs),
    isDir: s.isDirectory(),
    size: s.size,
    mtime: s.mtimeMs,
  };
}

// Names valid on Windows, macOS and Linux.
export function checkName(name: string) {
  const n = name.trim();
  // oxlint-disable-next-line no-control-regex
  if (!n || n === "." || n === ".." || /[<>:"/\\|?*\x00-\x1f]/.test(n) || /[. ]$/.test(n))
    throw new Error(`Invalid name: "${name}"`);
  return n;
}

// "a.txt" → "a (copy).txt" → "a (copy 2).txt" until free.
export function uniquePath(dir: string, name: string) {
  let p = join(dir, name);
  if (!existsSync(p)) return p;
  const ext = statSync(p).isDirectory() ? "" : extname(name);
  const stem = name.slice(0, name.length - ext.length);
  for (let i = 1; ; i++) {
    p = join(dir, `${stem} (copy${i > 1 ? ` ${i}` : ""})${ext}`);
    if (!existsSync(p)) return p;
  }
}

export function listDir(sku: string, rel: string): FileEntry[] {
  const dir = resolveIn(sku, rel);
  return readdirSync(dir)
    .map((n) => entry(sku, join(dir, n)))
    .sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
}

export function mkdir(sku: string, rel: string, name: string): FileEntry {
  const p = join(resolveIn(sku, rel), checkName(name));
  if (existsSync(p)) throw new Error(`"${name}" already exists`);
  mkdirSync(p);
  return entry(sku, p);
}

export function rename(sku: string, rel: string, newName: string): FileEntry {
  const src = resolveIn(sku, rel);
  if (src === productRoot(sku)) throw new Error("Cannot rename the product folder");
  const dst = join(dirname(src), checkName(newName));
  if (dst !== src && existsSync(dst) && dst.toLowerCase() !== src.toLowerCase())
    throw new Error(`"${newName}" already exists`);
  renameSync(src, dst);
  return entry(sku, dst);
}

function transfer(sku: string, rels: string[], destRel: string, op: "copy" | "move") {
  const dest = resolveIn(sku, destRel);
  if (!statSync(dest).isDirectory()) throw new Error("Destination is not a folder");
  for (const rel of rels) {
    const src = resolveIn(sku, rel);
    if (src === productRoot(sku)) throw new Error("Cannot move the product folder");
    if (dest === src || dest.startsWith(src + sep))
      throw new Error(`Cannot put "${basename(src)}" inside itself`);
    if (op === "move" && dirname(src) === dest) continue; // already there
    const dst = uniquePath(dest, basename(src));
    if (op === "copy") cpSync(src, dst, { recursive: true, errorOnExist: true, force: false });
    else renameSync(src, dst);
  }
}

export const copy = (sku: string, rels: string[], dest: string) =>
  transfer(sku, rels, dest, "copy");
export const move = (sku: string, rels: string[], dest: string) =>
  transfer(sku, rels, dest, "move");

// Target for an uploaded file; creates parent folders. Each path segment is validated.
export function uploadTarget(sku: string, rel: string) {
  const parts = rel.split(/[/\\]/).filter(Boolean).map(checkName);
  if (!parts.length) throw new Error("Empty upload path");
  const dir = resolveIn(sku, parts.slice(0, -1).join("/"));
  mkdirSync(dir, { recursive: true });
  return uniquePath(dir, parts.at(-1)!);
}
