import { useEffect, useState } from "react";
import { STATUSES, type Lang, type Product, type Status, type StatusChange } from "../shared/rpc";
import { FileExplorer } from "./explorer/FileExplorer";
import { fmtDate, useT } from "./i18n";
import { api } from "./rpc";
import { btn, btnPrimary, ErrorText, errMsg, input, ProductDialog, StatusBadge } from "./ui";

export function ProductList({ onOpen }: { onOpen: (id: number) => void }) {
  const t = useT();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<Status | null>(null);
  const [items, setItems] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let stale = false; // ignore out-of-order responses while typing
    api
      .listProducts({ query, status })
      .then((r) => !stale && (setItems(r), setError(null)))
      .catch((e) => !stale && setError(errMsg(e)));
    return () => {
      stale = true;
    };
  }, [query, status]);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium border ${
      active
        ? "bg-blue-600 border-blue-600 text-white"
        : "border-neutral-300 dark:border-neutral-600 hover:bg-neutral-100 dark:hover:bg-neutral-800"
    }`;

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex gap-2">
        <input
          autoFocus
          type="search"
          aria-label={t("list.search")}
          placeholder={t("list.search")}
          className={input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className={`${btnPrimary} whitespace-nowrap`} onClick={() => setCreating(true)}>
          + {t("list.new")}
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={chip(status === null)} onClick={() => setStatus(null)}>
          {t("list.all")}
        </button>
        {STATUSES.map((s) => (
          <button key={s} className={chip(status === s)} onClick={() => setStatus(s)}>
            {t(`status.${s}`)}
          </button>
        ))}
      </div>
      <ErrorText error={error} />
      <ul className="flex-1 divide-y divide-neutral-200 overflow-auto rounded-md border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
        {items.map((p) => (
          <li key={p.id}>
            <button
              className="flex w-full items-center gap-4 px-4 py-2.5 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
              onClick={() => onOpen(p.id)}
            >
              <span className="w-32 shrink-0 font-mono text-sm">{p.sku}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{p.name}</span>
                <span className="block truncate text-sm text-neutral-500">{p.description}</span>
              </span>
              <StatusBadge status={p.status} />
            </button>
          </li>
        ))}
        {!items.length && !error && (
          <li className="p-6 text-center text-sm text-neutral-500">{t("list.empty")}</li>
        )}
      </ul>
      {creating && (
        <ProductDialog
          title={t("product.newTitle")}
          initial={{ name: "", description: "", status: "In development" }}
          withStatus={false}
          submitLabel={t("common.create")}
          onCancel={() => setCreating(false)}
          onSubmit={async ({ name, description }) =>
            onOpen((await api.createProduct({ name, description })).id)
          }
        />
      )}
    </div>
  );
}

export function ProductPage({ id, lang }: { id: number; lang: Lang }) {
  const t = useT();
  const [data, setData] = useState<{ product: Product; history: StatusChange[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = () => api.getProduct({ id }).then(setData, (e) => setError(errMsg(e)));
  useEffect(() => {
    load();
  }, [id]);

  if (error)
    return (
      <div className="p-4">
        <ErrorText error={error} />
      </div>
    );
  if (!data) return null;
  const { product: p, history } = data;

  return (
    <div className="flex h-full flex-col gap-4 p-4">
      <section className="flex items-start gap-4 rounded-md border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm text-neutral-500">{p.sku}</span>
            <StatusBadge status={p.status} />
          </div>
          <h1 className="text-xl font-semibold">{p.name}</h1>
          {p.description && <p className="whitespace-pre-wrap text-sm">{p.description}</p>}
          <p className="text-xs text-neutral-500">
            {t("product.created")} {fmtDate(p.createdAt, lang)} · {t("product.updated")}{" "}
            {fmtDate(p.updatedAt, lang)}
          </p>
          <details className="text-xs text-neutral-500">
            <summary className="cursor-pointer">{t("product.history")}</summary>
            <ul className="mt-1 space-y-0.5">
              {history.map((h, i) => (
                <li key={i}>
                  {fmtDate(h.changedAt, lang)} — {t(`status.${h.status}`)}
                </li>
              ))}
            </ul>
          </details>
        </div>
        <button className={btn} onClick={() => setEditing(true)}>
          {t("product.edit")}
        </button>
      </section>
      <section className="min-h-0 flex-1">
        <FileExplorer key={p.sku} sku={p.sku} t={t} />
      </section>
      {editing && (
        <ProductDialog
          title={t("product.editTitle")}
          initial={p}
          withStatus
          submitLabel={t("common.save")}
          onCancel={() => setEditing(false)}
          onSubmit={async (v) => {
            await api.updateProduct({ id, ...v });
            await load();
            setEditing(false);
          }}
        />
      )}
    </div>
  );
}
