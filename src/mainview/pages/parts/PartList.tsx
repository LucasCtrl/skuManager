import { useEffect, useState } from "react";
import { PART_STATUSES, type PartStatus, type PartVersion } from "../../../shared/rpc";
import { FilterChips } from "../../components/FilterChips";
import { SearchField } from "../../components/SearchField";
import { StatusBadge, ToReviewBadge } from "../../components/status";
import { card } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { useCurrency } from "../items/utils";
import { CostText } from "./Cost";

const listCols = "grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_120px_190px] gap-4";

// No create button: parts are created from the product page.
export function PartList({ onOpen }: { onOpen: (id: number) => void }) {
  const t = useT();
  const currency = useCurrency();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<PartStatus | null>(null);
  const [total, setTotal] = useState(0);
  const [matched, setMatched] = useState<PartVersion[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listPartVersions({ query: "", status: null, productId: null }).then(
      (r) => setTotal(r.length),
      () => {},
    );
  }, []);
  useEffect(() => {
    let stale = false; // ignore out-of-order responses while typing
    api.listPartVersions({ query, status: null, productId: null }).then(
      (r) => !stale && (setMatched(r), setError(null)),
      (e) => !stale && setError(errMsg(e)),
    );
    return () => {
      stale = true;
    };
  }, [query]);

  const rows = filter ? matched.filter((v) => v.status === filter) : matched;
  const filtered = query.trim() !== "" || filter !== null;

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">
          {t("app.manufactured")}
        </h1>
        <span className="text-sm text-muted">
          {filtered
            ? t("parts.countFiltered", { n: rows.length, total })
            : t("parts.count", { n: total })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          label={t("items.searchLabel")}
          placeholder={t("parts.search")}
          value={query}
          onChange={setQuery}
        />
      </div>

      <FilterChips
        value={filter}
        onChange={setFilter}
        options={[
          { key: null, label: t("list.all"), count: matched.length },
          ...PART_STATUSES.map((s) => ({
            key: s,
            label: t(`status.${s}`),
            count: matched.filter((v) => v.status === s).length,
          })),
        ]}
      />

      <ErrorText error={error} />

      <div className={`${card} overflow-x-auto`}>
        <div className="min-w-[820px]">
          <div
            className={`${listCols} border-b border-line bg-subtle px-5 py-3 text-xs font-medium uppercase tracking-[0.06em] text-muted`}
          >
            <span>{t("list.colSku")}</span>
            <span>{t("parts.origin")}</span>
            <span className="text-right">{t("cost.label")}</span>
            <span>{t("list.colStatus")}</span>
          </div>
          {rows.map((v, n) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onOpen(v.id)}
              className={`${listCols} w-full items-center px-5 py-3.5 text-left text-ink hover:bg-subtle focus-visible:-outline-offset-2 ${
                n ? "border-t border-divider" : ""
              }`}
            >
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="break-all font-mono text-[13px] font-medium">{v.sku}</span>
                <span className="truncate text-sm">{v.name}</span>
              </span>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-mono text-[13px]">{v.product.sku}</span>
                <span className="truncate text-[13px] text-muted">{v.product.name}</span>
              </span>
              <span className="text-right text-sm tabular-nums">
                <CostText cost={v.cost} currency={currency} />
              </span>
              <span className="flex flex-wrap gap-1.5">
                <StatusBadge status={v.status} />
                {v.toReview && <ToReviewBadge />}
              </span>
            </button>
          ))}
          {!rows.length && !error && (
            <div className="px-5 py-12 text-center text-sm text-muted">
              {query.trim()
                ? t("items.emptyQuery", { q: query })
                : filter
                  ? t(`parts.empty.${filter}`)
                  : t("parts.empty")}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
