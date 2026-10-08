import { useCallback, useEffect, useState } from "react";
import { STATUSES, type Lang, type Product, type Status, type StatusChange } from "../shared/rpc";
import { FileExplorer } from "./explorer/FileExplorer";
import { fmtDateTime, fmtDay, fmtRelative, useT } from "./i18n";
import { api } from "./rpc";
import {
  btn,
  btnPrimary,
  card,
  Dot,
  EditProductDialog,
  ErrorText,
  errMsg,
  Icon,
  NewProductDialog,
  StatusBadge,
  statusTone,
} from "./ui";

const listCols = "grid grid-cols-[150px_minmax(0,1fr)_150px_110px] gap-4";

export function ProductList({ lang, onOpen }: { lang: Lang; onOpen: (id: number) => void }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Status | null>(null);
  const [total, setTotal] = useState(0);
  const [matched, setMatched] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.listProducts({ query: "", status: null }).then(
      (r) => setTotal(r.length),
      () => {},
    );
  }, []);

  // Search runs in the backend; the status filter and chip counts are computed here.
  useEffect(() => {
    let stale = false; // ignore out-of-order responses while typing
    api.listProducts({ query, status: null }).then(
      (r) => !stale && (setMatched(r), setError(null)),
      (e) => !stale && setError(errMsg(e)),
    );
    return () => {
      stale = true;
    };
  }, [query]);

  const rows = filter ? matched.filter((p) => p.status === filter) : matched;
  const filtered = query.trim() !== "" || filter !== null;
  const emptyLabel = query.trim()
    ? t("list.emptyQuery", { q: query })
    : filter
      ? t(`list.empty.${filter}`)
      : t("list.empty");

  const chip = (key: Status | null, label: string, count: number) => {
    const on = filter === key;
    return (
      <button
        key={key ?? "all"}
        type="button"
        role="radio"
        aria-checked={on}
        onClick={() => setFilter(key)}
        className={`inline-flex h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-medium hover:border-ink ${
          on ? "border-ink bg-ink text-canvas" : "border-line-strong bg-surface text-ink"
        }`}
      >
        {label}
        <span className="text-xs tabular-nums opacity-75">{count}</span>
      </button>
    );
  };

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">{t("list.title")}</h1>
        <span className="text-sm text-muted">
          {filtered
            ? t("list.countFiltered", { n: rows.length, total })
            : t("list.count", { n: total })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="box-border flex h-11 min-w-0 flex-[1_1_320px] items-center gap-2.5 rounded-lg border border-line-strong bg-surface px-3.5 text-muted focus-within:border-ink">
          <Icon name="search" />
          <label htmlFor="search" className="sr-only">
            {t("list.searchLabel")}
          </label>
          <input
            id="search"
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("list.search")}
            className="h-10 min-w-0 flex-1 border-0 bg-transparent text-[15px] text-ink outline-none placeholder:text-muted focus-visible:outline-none"
          />
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          <Icon name="plus" strokeWidth={2} />
          {t("list.new")}
        </button>
      </div>

      <div role="radiogroup" aria-label={t("list.filter")} className="-mt-1 flex flex-wrap gap-2">
        {chip(null, t("list.all"), matched.length)}
        {STATUSES.map((s) =>
          chip(s, t(`status.${s}`), matched.filter((p) => p.status === s).length),
        )}
      </div>

      <ErrorText error={error} />

      <div className={`${card} overflow-x-auto`}>
        <div className="min-w-[720px]">
          <div
            className={`${listCols} border-b border-line bg-subtle px-5 py-3 text-xs font-medium uppercase tracking-[0.06em] text-muted`}
          >
            <span>{t("list.colSku")}</span>
            <span>{t("list.colProduct")}</span>
            <span>{t("list.colStatus")}</span>
            <span className="text-right">{t("list.colUpdated")}</span>
          </div>
          {rows.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpen(p.id)}
              className={`${listCols} w-full items-center px-5 py-3.5 text-left text-ink hover:bg-subtle focus-visible:-outline-offset-2 ${
                i ? "border-t border-divider" : ""
              }`}
            >
              <span className="font-mono text-[13px] font-medium">{p.sku}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[15px] font-medium">{p.name}</span>
                <span className="truncate text-[13px] text-muted">{p.description}</span>
              </span>
              <span>
                <StatusBadge status={p.status} />
              </span>
              <span className="text-right text-[13px] text-muted first-letter:uppercase">
                {fmtRelative(p.updatedAt, lang)}
              </span>
            </button>
          ))}
          {!rows.length && !error && (
            <div className="px-5 py-12 text-center text-sm text-muted">{emptyLabel}</div>
          )}
        </div>
      </div>

      {creating && (
        <NewProductDialog
          onCancel={() => setCreating(false)}
          onCreate={async (v) => onOpen((await api.createProduct(v)).id)}
        />
      )}
    </main>
  );
}

export function ProductPage({ id, lang }: { id: number; lang: Lang }) {
  const t = useT();
  const [data, setData] = useState<{ product: Product; history: StatusChange[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(
    () => api.getProduct({ id }).then(setData, (e) => setError(errMsg(e))),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (error)
    return (
      <main className="mx-auto max-w-[1120px] px-6 py-7">
        <ErrorText error={error} />
      </main>
    );
  if (!data) return null;
  const { product: p, history } = data;

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-7">
      <section className={`${card} flex flex-wrap items-start gap-6 p-6`}>
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-md bg-canvas px-2 py-1 font-mono text-sm font-medium">
              {p.sku}
            </span>
            <StatusBadge status={p.status} />
          </div>
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">{p.name}</h1>
          {p.description && (
            <p className="m-0 max-w-[680px] whitespace-pre-wrap text-[15px] leading-[1.55] text-body">
              {p.description}
            </p>
          )}
          <div className="flex flex-wrap gap-5 pt-1 text-[13px] text-muted">
            <span>{t("product.created", { date: fmtDay(p.createdAt, lang) })}</span>
            <span>{t("product.updated", { date: fmtRelative(p.updatedAt, lang) })}</span>
          </div>
          <details className="text-[13px] text-muted">
            <summary className="inline-flex min-h-8 cursor-pointer items-center font-medium text-ink">
              {t("product.history")}
            </summary>
            <ol className="m-0 mt-1 flex list-none flex-col gap-1.5 p-0">
              {history
                .map((h, i) => ({ ...h, from: i ? history[i - 1].status : null }))
                .reverse()
                .map((h, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span className="w-[150px] tabular-nums">{fmtDateTime(h.changedAt, lang)}</span>
                    <span
                      className={`inline-flex items-center gap-1.5 font-medium ${statusTone[h.status].fg}`}
                    >
                      <Dot status={h.status} />
                      {t(`status.${h.status}`)}
                    </span>
                    <span>
                      {h.from
                        ? t("product.historyFrom", { status: t(`status.${h.from}`) })
                        : t("product.historyCreated")}
                    </span>
                  </li>
                ))}
            </ol>
          </details>
        </div>
        <button type="button" className={btn} onClick={() => setEditing(true)}>
          <Icon name="pencil" size={16} />
          {t("product.edit")}
        </button>
      </section>

      <FileExplorer key={p.sku} sku={p.sku} t={t} />

      {editing && (
        <EditProductDialog
          sku={p.sku}
          initial={p}
          onCancel={() => setEditing(false)}
          onSave={async (v) => {
            await api.updateProduct({ id, ...v });
            await load();
            setEditing(false);
          }}
        />
      )}
    </main>
  );
}
