import { useEffect, useState } from "react";
import { type Item, ITEM_STATUSES, type ItemKind, type ItemStatus } from "../../../shared/rpc";
import { FilterChips } from "../../components/FilterChips";
import { Icon } from "../../components/Icon";
import { SearchField } from "../../components/SearchField";
import { StatusBadge } from "../../components/status";
import { btnPrimary, card } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { fmtMoney, useT } from "../../i18n";
import { api } from "../../rpc";
import { NewItemDialog } from "./NewItemDialog";
import { uiLang, useCurrency } from "./utils";

export const listCols = "grid grid-cols-[320px_120px_minmax(0,1fr)_150px_100px] gap-4";

export function ItemList({ kind, onOpen }: { kind: ItemKind; onOpen: (id: number) => void }) {
  const t = useT();
  const currency = useCurrency();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ItemStatus | null>(null);
  const [total, setTotal] = useState(0);
  const [matched, setMatched] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.listItems({ kind, query: "" }).then(
      (r) => setTotal(r.length),
      () => {},
    );
  }, [kind]);
  useEffect(() => {
    let stale = false; // ignore out-of-order responses while typing
    api.listItems({ kind, query }).then(
      (r) => !stale && (setMatched(r), setError(null)),
      (e) => !stale && setError(errMsg(e)),
    );
    return () => {
      stale = true;
    };
  }, [kind, query]);

  const rows = filter ? matched.filter((i) => i.status === filter) : matched;
  const filtered = query.trim() !== "" || filter !== null;
  const emptyLabel = query.trim()
    ? t("items.emptyQuery", { q: query })
    : filter
      ? t(`items.empty.${kind}.${filter}`)
      : t(`items.empty.${kind}`);

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">
          {t(`items.title.${kind}`)}
        </h1>
        <span className="text-sm text-muted">
          {filtered
            ? t(`items.countFiltered.${kind}`, { n: rows.length, total })
            : t(`items.count.${kind}`, { n: total })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          label={t("items.searchLabel")}
          placeholder={t("items.search")}
          value={query}
          onChange={setQuery}
        />
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          <Icon name="plus" strokeWidth={2} />
          {t(`items.new.${kind}`)}
        </button>
      </div>

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { key: null, label: t("list.all"), count: matched.length },
          ...ITEM_STATUSES.map((s) => ({
            key: s,
            label: t(`status.${s}`),
            count: matched.filter((i) => i.status === s).length,
          })),
        ]}
      />

      <ErrorText error={error} />

      <div className={`${card} overflow-x-auto`}>
        <div className="min-w-[900px]">
          <div
            className={`${listCols} border-b border-line bg-subtle px-5 py-3 text-xs font-medium uppercase tracking-[0.06em] text-muted`}
          >
            <span>{t("list.colSku")}</span>
            <span>{t("items.type")}</span>
            <span>{t("product.description")}</span>
            <span className="text-right">{t("items.price")}</span>
            <span>{t("list.colStatus")}</span>
          </div>
          {rows.map((i, n) => (
            <button
              key={i.id}
              type="button"
              onClick={() => onOpen(i.id)}
              className={`${listCols} w-full items-center px-5 py-3.5 text-left text-ink hover:bg-subtle focus-visible:-outline-offset-2 ${
                n ? "border-t border-divider" : ""
              }`}
            >
              <span className="break-all font-mono text-[13px] font-medium">{i.sku}</span>
              <span className="text-sm font-medium">{i.type.name}</span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm">{i.description}</span>
                <span className="truncate text-[13px] text-muted">{i.seller.name}</span>
              </span>
              <span className="text-right text-sm tabular-nums">
                {i.price ? fmtMoney(i.price.cents, currency, uiLang()) : "—"}
                {i.price && <span className="text-[13px] text-muted"> / {i.unit.code}</span>}
              </span>
              <span>
                <StatusBadge status={i.status} />
              </span>
            </button>
          ))}
          {!rows.length && !error && (
            <div className="px-5 py-12 text-center text-sm text-muted">{emptyLabel}</div>
          )}
        </div>
      </div>

      {creating && (
        <NewItemDialog
          kind={kind}
          currency={currency}
          onCancel={() => setCreating(false)}
          onCreate={async (v) => onOpen((await api.createItem(v)).id)}
        />
      )}
    </main>
  );
}
