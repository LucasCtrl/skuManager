import { Fragment, useEffect, useRef, useState } from "react";
import type { DragEvent, KeyboardEvent, MouseEvent } from "react";
import type { FileEntry } from "../../shared/rpc";
import { fmtRelative, type T } from "../i18n";
import { api } from "../rpc";
import { Icon, card, toolBtn } from "../ui";

const DND = "application/x-sku-paths";
const join = (dir: string, name: string) => (dir ? `${dir}/${name}` : name);
const parentOf = (p: string) => p.slice(0, Math.max(0, p.lastIndexOf("/")));
const inside = (p: string, dest: string) => dest === p || dest.startsWith(p + "/");
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));
const MOD = navigator.platform.startsWith("Mac") ? "⌘" : "Ctrl+";
const byDirThenName = (a: FileEntry, b: FileEntry) =>
  Number(b.isDir) - Number(a.isDir) ||
  a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });

function fmtSize(n: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  for (; n >= 1024 && i < units.length - 1; i++) n /= 1024;
  return `${i ? n.toFixed(1) : n} ${units[i]}`;
}

function kind(e: FileEntry, t: T) {
  if (e.isDir) return t("explorer.folder");
  const dot = e.name.lastIndexOf(".");
  return dot > 0
    ? t("explorer.fileKind", { ext: e.name.slice(dot + 1).toUpperCase() })
    : t("explorer.file");
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
      className="box-border h-8 w-full rounded-md border border-accent bg-surface px-2 text-sm text-ink outline-none"
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

export function FileExplorer({ sku, t }: { sku: string; t: T }) {
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
  // The parent remounts this component per SKU (key={sku}), so only folder changes need a reset.
  const go = (p: string) => {
    setPath(p);
    setSelected(new Set());
    setRenaming(null);
    setCreating(false);
  };
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
    e.isDir ? go(e.path) : run(() => api.openPath({ sku, path: e.path }));
  const openSelected = () => sel.forEach((e) => (!e.isDir || sel.length === 1) && open(e));
  const startRename = () => selPaths.length === 1 && setRenaming(selPaths[0]);
  const trash = () => {
    if (selPaths.length && confirm(t("explorer.confirmDelete", { count: selPaths.length })))
      run(() => api.trash({ sku, paths: selPaths }));
  };
  const duplicate = () =>
    selPaths.length && run(() => api.copy({ sku, paths: selPaths, dest: path }));
  const toggle = (p: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (!n.delete(p)) n.add(p);
      return n;
    });
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
          setProgress(t("explorer.uploading", { done: i + 1, total: files.length }));
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
    if (e.ctrlKey || e.metaKey) toggle(p);
    else setSelected(new Set([p]));
  };

  const onKey = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (mod && e.shiftKey && k === "n") {
      e.preventDefault();
      setCreating(true);
    } else if (mod && k === "d") {
      e.preventDefault();
      duplicate();
    } else if (mod && k === "a") {
      e.preventDefault();
      setSelected(new Set(entries.map((x) => x.path)));
    } else if (mod && (k === "c" || k === "x")) {
      if (selPaths.length) setClip({ cut: k === "x", paths: selPaths });
    } else if (mod && k === "v") paste();
    else if (e.key === "Delete" || (e.metaKey && e.key === "Backspace")) trash();
    else if (e.key === "F2") startRename();
    else if (e.key === "Enter") openSelected();
  };

  type Item = { key: string; label?: string; fn: () => unknown; hint?: string; danger?: boolean };
  const menuItems: (Item | null)[] = menu?.onItem
    ? [
        { key: "explorer.open", fn: openSelected, hint: "Enter" },
        ...(sel.length === 1 ? [{ key: "explorer.rename", fn: startRename, hint: "F2" }] : []),
        { key: "explorer.duplicate", fn: duplicate, hint: `${MOD}D` },
        null,
        { key: "explorer.cut", fn: () => setClip({ cut: true, paths: selPaths }), hint: `${MOD}X` },
        {
          key: "explorer.copy",
          fn: () => setClip({ cut: false, paths: selPaths }),
          hint: `${MOD}C`,
        },
        null,
        { key: "explorer.newFolder", fn: () => setCreating(true), hint: `${MOD}Shift+N` },
        { key: "explorer.reveal", fn: () => run(() => api.reveal({ sku, path: selPaths[0] })) },
        null,
        {
          key: "explorer.trash",
          label: sel.length > 1 ? t("explorer.trashN", { count: sel.length }) : undefined,
          fn: trash,
          hint: "Del",
          danger: true,
        },
      ]
    : [
        { key: "explorer.newFolder", fn: () => setCreating(true), hint: `${MOD}Shift+N` },
        ...(clip ? [{ key: "explorer.paste", fn: paste, hint: `${MOD}V` }] : []),
        { key: "explorer.reveal", fn: () => run(() => api.reveal({ sku, path })) },
      ];

  const crumbs = path ? path.split("/") : [];
  const dropHi = "bg-accent-soft ring-1 ring-inset ring-accent";
  const cols = "grid grid-cols-[28px_minmax(0,1fr)_140px_90px_120px] items-center gap-3 px-4";
  const lang = document.documentElement.lang === "fr" ? "fr" : "en";
  const check = "h-4 w-4 accent-accent";
  const menuH = menuItems.reduce((h, i) => h + (i ? 36 : 9), 12);

  return (
    <section aria-label={t("explorer.files")} className={`${card} text-sm text-ink`}>
      <div className="flex min-h-16 flex-wrap items-center gap-2 border-b border-divider px-4 py-2">
        <nav className="flex min-w-0 flex-1 flex-wrap items-center gap-0.5 font-mono text-[13px] text-muted">
          <span className="px-1">1_PRODUCTS</span>
          {[sku, ...crumbs].map((name, i) => {
            const p = crumbs.slice(0, i).join("/");
            const last = i === crumbs.length;
            return (
              <Fragment key={p || "/"}>
                <Icon name="chevronRight" size={14} />
                <button
                  type="button"
                  aria-current={last ? "location" : undefined}
                  className={`rounded px-1.5 py-1 hover:bg-hover ${last ? "font-medium text-ink" : ""} ${
                    over === p ? dropHi : ""
                  }`}
                  onClick={() => go(p)}
                  {...dropProps(p)}
                >
                  {name}
                </button>
              </Fragment>
            );
          })}
        </nav>
        {sel.length > 0 && (
          <>
            <span className="px-1 text-muted">{t("explorer.selected", { count: sel.length })}</span>
            <button type="button" className={toolBtn} onClick={duplicate}>
              <Icon name="copy" size={16} />
              {t("explorer.duplicate")}
            </button>
            <button
              type="button"
              className={`${toolBtn} text-danger hover:bg-danger-soft`}
              onClick={trash}
            >
              <Icon name="trash" size={16} />
              {t("explorer.trash")}
            </button>
            <span className="mx-1 h-6 w-px bg-line" />
          </>
        )}
        <button type="button" className={toolBtn} onClick={() => setCreating(true)}>
          <Icon name="folderPlus" size={16} />
          {t("explorer.newFolder")}
        </button>
        <button
          type="button"
          className={toolBtn}
          onClick={() => run(() => api.reveal({ sku, path }))}
        >
          <Icon name="external" size={16} />
          {t("explorer.reveal")}
        </button>
        <button
          type="button"
          aria-label={t("explorer.refresh")}
          title={t("explorer.refresh")}
          className={toolBtn}
          onClick={refresh}
        >
          <Icon name="refresh" size={16} />
        </button>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 bg-danger-soft px-4 py-2 text-danger">
          <span className="flex-1">{error}</span>
          <button
            type="button"
            aria-label={t("explorer.dismiss")}
            className="rounded p-1 hover:bg-hover"
            onClick={() => setError(null)}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      )}

      <div
        tabIndex={0}
        className="select-none pb-4 outline-none"
        onKeyDown={onKey}
        onClick={() => setSelected(new Set())}
        onContextMenu={(e) => {
          e.preventDefault();
          setSelected(new Set());
          setMenu({ x: e.clientX, y: e.clientY, onItem: false });
        }}
        {...dropProps(path)}
      >
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div
              className={`${cols} h-10 border-b border-divider bg-subtle text-xs font-medium uppercase tracking-[0.06em] text-muted`}
            >
              <input
                type="checkbox"
                aria-label={t("explorer.selectAll")}
                className={check}
                checked={entries.length > 0 && sel.length === entries.length}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) =>
                  setSelected(new Set(e.target.checked ? entries.map((x) => x.path) : []))
                }
              />
              <span>{t("explorer.name")}</span>
              <span>{t("explorer.modified")}</span>
              <span className="text-right">{t("explorer.size")}</span>
              <span>{t("explorer.kind")}</span>
            </div>

            {creating && (
              <div className={`${cols} h-12 border-b border-divider`}>
                <span />
                <span className="flex items-center gap-2.5">
                  <Icon name="folder" className="text-accent" fill="var(--accent-tint)" />
                  <NameInput initial={t("explorer.newFolder")} onDone={commitEdit} />
                </span>
              </div>
            )}
            {entries.map((e, i) => {
              const on = selected.has(e.path);
              return (
                <div
                  key={e.path}
                  draggable={renaming !== e.path}
                  className={`${cols} h-12 cursor-default border-b border-divider ${on ? "bg-accent-soft" : "hover:bg-hover"} ${
                    over === e.path ? dropHi : ""
                  } ${clip?.cut && clip.paths.includes(e.path) ? "opacity-50" : ""}`}
                  onClick={(ev) => clickRow(ev, i)}
                  onDoubleClick={() => open(e)}
                  onContextMenu={(ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    if (!on) {
                      setSelected(new Set([e.path]));
                      setAnchor(i);
                    }
                    setMenu({ x: ev.clientX, y: ev.clientY, onItem: true });
                  }}
                  onDragStart={(ev) => {
                    const paths = on ? selPaths : [e.path];
                    if (!on) setSelected(new Set([e.path]));
                    ev.dataTransfer.setData(DND, JSON.stringify(paths));
                    ev.dataTransfer.effectAllowed = "move";
                  }}
                  {...(e.isDir ? dropProps(e.path) : {})}
                >
                  <input
                    type="checkbox"
                    aria-label={t("explorer.select", { name: e.name })}
                    className={check}
                    checked={on}
                    onClick={(ev) => ev.stopPropagation()}
                    onDoubleClick={(ev) => ev.stopPropagation()}
                    onChange={() => {
                      setAnchor(i);
                      toggle(e.path);
                    }}
                  />
                  <span className="flex min-w-0 items-center gap-2.5">
                    {e.isDir ? (
                      <Icon name="folder" className="text-accent" fill="var(--accent-tint)" />
                    ) : (
                      <Icon name="file" className="text-muted" />
                    )}
                    {renaming === e.path ? (
                      <NameInput initial={e.name} onDone={commitEdit} />
                    ) : (
                      <span className={`truncate ${e.isDir ? "font-medium" : ""}`}>{e.name}</span>
                    )}
                  </span>
                  <span className="text-muted first-letter:uppercase">
                    {fmtRelative(e.mtime, lang)}
                  </span>
                  <span className="text-right text-muted">
                    {e.isDir
                      ? e.size === 1
                        ? t("explorer.item")
                        : t("explorer.items", { count: e.size })
                      : fmtSize(e.size)}
                  </span>
                  <span className="truncate text-muted">{kind(e, t)}</span>
                </div>
              );
            })}
            {!entries.length && !creating && (
              <div className="flex h-24 items-center justify-center border-b border-divider text-muted">
                {t("explorer.empty")}
              </div>
            )}
          </div>
        </div>

        <div
          className={`mx-4 mt-4 flex items-center gap-3 rounded-lg border-[1.5px] border-dashed px-4 py-3.5 text-[13px] text-muted ${
            over === path ? "border-accent bg-accent-soft" : "border-line-strong"
          }`}
        >
          <Icon name="upload" size={18} />
          <span aria-live="polite">{progress ?? t("explorer.dropHint")}</span>
        </div>
      </div>

      {menu && (
        <ul
          role="menu"
          className="fixed z-50 m-0 box-border w-60 list-none rounded-lg border border-line bg-surface p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
          style={{
            left: Math.min(menu.x, innerWidth - 248),
            top: Math.min(menu.y, innerHeight - menuH - 8),
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {menuItems.map((item, i) =>
            item ? (
              <li key={item.key} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className={`flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-left text-sm ${
                    item.danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-hover"
                  }`}
                  onClick={() => {
                    setMenu(null);
                    item.fn();
                  }}
                >
                  <span className="flex-1 truncate">{item.label ?? t(item.key)}</span>
                  {item.hint && <span className="text-xs text-muted">{item.hint}</span>}
                </button>
              </li>
            ) : (
              <li key={i} role="separator" className="mx-1 my-1 h-px bg-divider" />
            ),
          )}
        </ul>
      )}
    </section>
  );
}
