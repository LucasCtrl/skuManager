import { Fragment, useEffect, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent, MouseEvent } from "react";
import type { FileEntry } from "../../shared/rpc";
import { api } from "../rpc";

const DND = "application/x-sku-paths";
const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);
const parentOf = (p: string) => p.slice(0, Math.max(0, p.lastIndexOf("/")));
const inside = (p: string, dest: string) => dest === p || dest.startsWith(p + "/");
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const fmt = (s: string, v: Record<string, string | number>) =>
  s.replace(/\{(\w+)\}/g, (_, k) => String(v[k] ?? ""));
const byDirThenName = (a: FileEntry, b: FileEntry) =>
  Number(b.isDir) - Number(a.isDir) ||
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

function fmtSize(n: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  for (; n >= 1024 && i < units.length - 1; i++) n /= 1024;
  return `${i ? n.toFixed(1) : n} ${units[i]}`;
}

type Upload = { file: File; rel: string };
// Walks a dropped OS entry recursively. ponytail: empty dropped folders are skipped (upload endpoint only takes files).
async function collect(entry: FileSystemEntry, out: Upload[]) {
  if (entry.isFile) {
    const file = await new Promise<File>((res, rej) =>
      (entry as FileSystemFileEntry).file(res, rej),
    );
    out.push({ file, rel: entry.fullPath.replace(/^\/+/, "") });
  } else if (entry.isDirectory) {
    const reader = (entry as FileSystemDirectoryEntry).createReader();
    for (;;) {
      const batch = await new Promise<FileSystemEntry[]>((res, rej) =>
        reader.readEntries(res, rej),
      );
      if (!batch.length) break;
      for (const e of batch) await collect(e, out);
    }
  }
}

function NameInput({ initial, onDone }: { initial: string; onDone: (v: string | null) => void }) {
  return (
    <input
      autoFocus
      defaultValue={initial}
      className="w-full rounded border border-blue-500 bg-white px-1 outline-none dark:bg-neutral-900"
      onFocus={(e) => {
        const dot = initial.lastIndexOf(".");
        e.currentTarget.setSelectionRange(0, dot > 0 ? dot : initial.length);
      }}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onDone(e.currentTarget.value);
        if (e.key === "Escape") onDone(null);
      }}
      onBlur={() => onDone(null)}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    />
  );
}

export function FileExplorer({ sku, t }: { sku: string; t: (key: string) => string }) {
  const [path, setPath] = useState("");
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [tick, setTick] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState(0);
  const [menu, setMenu] = useState<{ x: number; y: number; onItem: boolean } | null>(null);
  const [clip, setClip] = useState<{ cut: boolean; paths: string[] } | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const uploadUrl = useRef<string>();

  const refresh = () => setTick((n) => n + 1);
  useEffect(() => setPath(""), [sku]);
  useEffect(() => {
    setSelected(new Set());
    setRenaming(null);
    setCreating(false);
  }, [sku, path]);
  useEffect(() => {
    let live = true;
    api.listDir({ sku, path }).then(
      (list) => {
        if (!live) return;
        setEntries([...list].sort(byDirThenName));
        setSelected((s) => new Set(list.filter((e) => s.has(e.path)).map((e) => e.path)));
      },
      (e) => live && setError(msg(e)),
    );
    return () => {
      live = false;
    };
  }, [sku, path, tick]);
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const esc = (e: globalThis.KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [menu]);

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(msg(e));
    }
    refresh();
  };

  const sel = entries.filter((e) => selected.has(e.path));
  const selPaths = sel.map((e) => e.path);

  const open = (e: FileEntry) =>
    e.isDir ? setPath(e.path) : run(() => api.openPath({ sku, path: e.path }));
  const openSelected = () => sel.forEach((e) => (!e.isDir || sel.length === 1) && open(e));
  const startRename = () => selPaths.length === 1 && setRenaming(selPaths[0]);
  const trash = () => {
    if (selPaths.length && confirm(fmt(t("explorer.confirmDelete"), { count: selPaths.length })))
      run(() => api.trash({ sku, paths: selPaths }));
  };
  const move = (paths: string[], dest: string) => {
    const ok = paths.filter((p) => !inside(p, dest) && parentOf(p) !== dest);
    return ok.length ? api.move({ sku, paths: ok, dest }) : Promise.resolve();
  };
  const paste = () =>
    clip &&
    run(async () => {
      if (clip.cut) {
        await move(clip.paths, path);
        setClip(null);
      } else {
        const ok = clip.paths.filter((p) => !inside(p, path));
        if (ok.length) await api.copy({ sku, paths: ok, dest: path });
      }
    });
  const commitEdit = (value: string | null) => {
    const target = renaming;
    const isNew = creating;
    setRenaming(null);
    setCreating(false);
    const name = value?.trim();
    if (!name) return;
    if (isNew) run(() => api.mkdir({ sku, path, name }));
    else if (target && name !== target.split("/").pop())
      run(() => api.rename({ sku, path: target, newName: name }));
  };

  const upload = (roots: FileSystemEntry[], loose: File[], dest: string) =>
    run(async () => {
      const files: Upload[] = loose.map((file) => ({ file, rel: file.name }));
      for (const r of roots) await collect(r, files);
      const url = (uploadUrl.current ??= await api.getUploadUrl({}));
      try {
        for (const [i, { file, rel }] of files.entries()) {
          setProgress(fmt(t("explorer.uploading"), { done: i + 1, total: files.length }));
          const q = `&sku=${encodeURIComponent(sku)}&path=${encodeURIComponent(join(dest, rel))}`;
          const res = await fetch(url + q, { method: "POST", body: file });
          if (!res.ok) throw new Error((await res.text()) || res.statusText);
        }
      } finally {
        setProgress(null);
      }
    });

  const dropProps = (dest: string) => ({
    onDragOver: (e: DragEvent) => {
      const types = e.dataTransfer.types;
      if (!types.includes(DND) && !types.includes("Files")) return;
      e.preventDefault();
      e.stopPropagation();
      setOver(dest);
    },
    onDragLeave: () => setOver((o) => (o === dest ? null : o)),
    onDrop: (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOver(null);
      const internal = e.dataTransfer.getData(DND);
      if (internal) return void run(() => move(JSON.parse(internal) as string[], dest));
      // webkitGetAsEntry must be called synchronously inside the drop handler.
      // Items without an entry (webview without the API) fall back to plain files.
      const roots: FileSystemEntry[] = [];
      const loose: File[] = [];
      for (const i of e.dataTransfer.items) {
        const entry = i.kind === "file" ? i.webkitGetAsEntry() : null;
        const file = entry ? null : i.getAsFile();
        if (entry) roots.push(entry);
        else if (file) loose.push(file);
      }
      if (roots.length || loose.length) void upload(roots, loose, dest);
    },
  });

  const clickRow = (e: MouseEvent, i: number) => {
    e.stopPropagation();
    const p = entries[i].path;
    if (e.shiftKey) {
      const [a, b] = [Math.min(anchor, i), Math.max(anchor, i)];
      return setSelected(new Set(entries.slice(a, b + 1).map((x) => x.path)));
    }
    setAnchor(i);
    if (e.ctrlKey || e.metaKey)
      setSelected((s) => {
        const n = new Set(s);
        if (!n.delete(p)) n.add(p);
        return n;
      });
    else setSelected(new Set([p]));
  };

  const onKey = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && k === "a") {
      e.preventDefault();
      setSelected(new Set(entries.map((x) => x.path)));
    } else if (mod && (k === "c" || k === "x")) {
      if (selPaths.length) setClip({ cut: k === "x", paths: selPaths });
    } else if (mod && k === "v") paste();
    else if (e.key === "Delete" || (e.metaKey && e.key === "Backspace")) trash();
    else if (e.key === "F2") startRename();
    else if (e.key === "Enter") openSelected();
  };

  const menuItems: [string, () => unknown][] = menu?.onItem
    ? [
        ["explorer.open", openSelected],
        ...(sel.length === 1 ? [["explorer.rename", startRename] as [string, () => unknown]] : []),
        ["explorer.duplicate", () => run(() => api.copy({ sku, paths: selPaths, dest: path }))],
        ["explorer.cut", () => setClip({ cut: true, paths: selPaths })],
        ["explorer.copy", () => setClip({ cut: false, paths: selPaths })],
        ["explorer.delete", trash],
        ["explorer.reveal", () => run(() => api.reveal({ sku, path: selPaths[0] }))],
      ]
    : [
        ["explorer.newFolder", () => setCreating(true)],
        ...(clip ? [["explorer.paste", paste] as [string, () => unknown]] : []),
        ["explorer.reveal", () => run(() => api.reveal({ sku, path }))],
      ];

  const crumbs = path ? path.split("/") : [];
  const hover = "hover:bg-neutral-100 dark:hover:bg-neutral-800";
  const dropHi = "bg-blue-50 ring-1 ring-blue-400 dark:bg-blue-950";
  const cols = "grid grid-cols-[1fr_6rem_11rem] gap-2 px-2 py-1";

  return (
    <div className="flex h-full min-h-64 flex-col rounded border border-neutral-200 text-sm text-neutral-800 dark:border-neutral-700 dark:text-neutral-200">
      <div className="flex items-center gap-1 border-b border-neutral-200 px-2 py-1 dark:border-neutral-700">
        {[sku, ...crumbs].map((name, i) => {
          const p = crumbs.slice(0, i).join("/");
          return (
            <Fragment key={p || "/"}>
              {i > 0 && <span className="text-neutral-400">/</span>}
              <button
                className={`rounded px-1 ${hover} ${over === p ? dropHi : ""}`}
                onClick={() => setPath(p)}
                {...dropProps(p)}
              >
                {name}
              </button>
            </Fragment>
          );
        })}
        <button className={`ml-auto rounded px-2 ${hover}`} onClick={refresh}>
          {t("explorer.refresh")}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 px-2 py-1 text-red-700 dark:bg-red-950 dark:text-red-300">
          <span className="flex-1">{error}</span>
          <button onClick={() => setError(null)}>{t("explorer.dismiss")}</button>
        </div>
      )}
      {progress && <div className="px-2 py-1 text-neutral-500">{progress}</div>}

      <div
        className={`${cols} border-b border-neutral-200 text-xs text-neutral-500 dark:border-neutral-700`}
      >
        <span>{t("explorer.name")}</span>
        <span className="text-right">{t("explorer.size")}</span>
        <span>{t("explorer.modified")}</span>
      </div>

      <div
        tabIndex={0}
        className={`flex-1 select-none overflow-auto outline-none ${over === path ? dropHi : ""}`}
        onKeyDown={onKey}
        onClick={() => setSelected(new Set())}
        onContextMenu={(e) => {
          e.preventDefault();
          setSelected(new Set());
          setMenu({ x: e.clientX, y: e.clientY, onItem: false });
        }}
        {...dropProps(path)}
      >
        {creating && (
          <div className={cols}>
            <NameInput initial={t("explorer.newFolder")} onDone={commitEdit} />
          </div>
        )}
        {entries.map((e, i) => (
          <div
            key={e.path}
            draggable={renaming !== e.path}
            className={`${cols} cursor-default ${selected.has(e.path) ? "bg-blue-100 dark:bg-blue-900/40" : hover} ${
              over === e.path ? dropHi : ""
            } ${clip?.cut && clip.paths.includes(e.path) ? "opacity-50" : ""}`}
            onClick={(ev) => clickRow(ev, i)}
            onDoubleClick={() => open(e)}
            onContextMenu={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              if (!selected.has(e.path)) {
                setSelected(new Set([e.path]));
                setAnchor(i);
              }
              setMenu({ x: ev.clientX, y: ev.clientY, onItem: true });
            }}
            onDragStart={(ev) => {
              const paths = selected.has(e.path) ? selPaths : [e.path];
              if (!selected.has(e.path)) setSelected(new Set([e.path]));
              ev.dataTransfer.setData(DND, JSON.stringify(paths));
              ev.dataTransfer.effectAllowed = "move";
            }}
            {...(e.isDir ? dropProps(e.path) : {})}
          >
            {renaming === e.path ? (
              <NameInput initial={e.name} onDone={commitEdit} />
            ) : (
              <span className={`truncate ${e.isDir ? "font-medium" : ""}`}>
                {e.name}
                {e.isDir && "/"}
              </span>
            )}
            <span className="text-right text-neutral-500">{e.isDir ? "" : fmtSize(e.size)}</span>
            <span className="text-neutral-500">{new Date(e.mtime).toLocaleString()}</span>
          </div>
        ))}
        {!entries.length && !creating && (
          <p className="p-6 text-center text-neutral-400">{t("explorer.empty")}</p>
        )}
      </div>

      {menu && (
        <ul
          className="fixed z-50 w-56 rounded border border-neutral-200 bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
          style={{
            left: Math.min(menu.x, innerWidth - 232),
            top: Math.min(menu.y, innerHeight - 32 * menuItems.length - 16),
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {menuItems.map(([key, fn]) => (
            <li key={key}>
              <button
                className={`w-full px-3 py-1 text-left ${hover}`}
                onClick={() => {
                  setMenu(null);
                  fn();
                }}
              >
                {t(key)}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
