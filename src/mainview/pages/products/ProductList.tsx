import { useEffect, useState } from "react";
import { type Lang, type Product, type Status, STATUSES } from "../../../shared/rpc";
import { FilterChips } from "../../components/FilterChips";
import { Icon } from "../../components/Icon";
import { SearchField } from "../../components/SearchField";
import { StatusBadge } from "../../components/status";
import { btnPrimary, card } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { fmtRelative, useT } from "../../i18n";
import { api } from "../../rpc";
import { NewProductDialog } from "./ProductDialogs";

export const listCols = "grid grid-cols-[150px_minmax(0,1fr)_150px_110px] gap-4";

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
        <SearchField
          label={t("list.searchLabel")}
          placeholder={t("list.search")}
          value={query}
          onChange={setQuery}
        />
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          <Icon name="plus" strokeWidth={2} />
          {t("list.new")}
        </button>
      </div>

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { key: null, label: t("list.all"), count: matched.length },
          ...STATUSES.map((s) => ({
            key: s,
            label: t(`status.${s}`),
            count: matched.filter((p) => p.status === s).length,
          })),
        ]}
      />

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
