import { useEffect, useState } from "react";
import { type Operation } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { SearchField } from "../../components/SearchField";
import { btnPrimary, card } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { useCurrency } from "../items/utils";
import { NewOperationDialog } from "./OperationDialogs";
import { RateText } from "./RateText";

const listCols = "grid grid-cols-[150px_200px_minmax(0,1fr)_160px] gap-4";

export function OperationList({ onOpen }: { onOpen: (id: number) => void }) {
  const t = useT();
  const currency = useCurrency();
  const [query, setQuery] = useState("");
  const [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Operation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api.listOperations({ query: "" }).then(
      (r) => setTotal(r.length),
      () => {},
    );
  }, []);
  useEffect(() => {
    let stale = false; // ignore out-of-order responses while typing
    api.listOperations({ query }).then(
      (r) => !stale && (setRows(r), setError(null)),
      (e) => !stale && setError(errMsg(e)),
    );
    return () => {
      stale = true;
    };
  }, [query]);

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-8">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">{t("app.operations")}</h1>
        <span className="text-sm text-muted">
          {query.trim()
            ? t("ops.countFiltered", { n: rows.length, total })
            : t("ops.count", { n: total })}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchField
          label={t("items.searchLabel")}
          placeholder={t("ops.search")}
          value={query}
          onChange={setQuery}
        />
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          <Icon name="plus" strokeWidth={2} />
          {t("ops.new")}
        </button>
      </div>

      <ErrorText error={error} />

      <div className={`${card} overflow-x-auto`}>
        <div className="min-w-[760px]">
          <div
            className={`${listCols} border-b border-line bg-subtle px-5 py-3 text-xs font-medium uppercase tracking-[0.06em] text-muted`}
          >
            <span>{t("list.colSku")}</span>
            <span>{t("product.name")}</span>
            <span>{t("product.description")}</span>
            <span className="text-right">{t("ops.rate")}</span>
          </div>
          {rows.map((o, n) => (
            <button
              key={o.id}
              type="button"
              onClick={() => onOpen(o.id)}
              className={`${listCols} w-full items-center px-5 py-3.5 text-left text-ink hover:bg-subtle focus-visible:-outline-offset-2 ${
                n ? "border-t border-divider" : ""
              }`}
            >
              <span className="font-mono text-[13px] font-medium">{o.sku}</span>
              <span className="text-sm font-medium">{o.name}</span>
              <span className="truncate text-sm">{o.description}</span>
              <span className="text-right text-sm tabular-nums">
                <RateText op={o} currency={currency} />
              </span>
            </button>
          ))}
          {!rows.length && !error && (
            <div className="px-5 py-12 text-center text-sm text-muted">
              {query.trim() ? t("items.emptyQuery", { q: query }) : t("ops.empty")}
            </div>
          )}
        </div>
      </div>

      {creating && (
        <NewOperationDialog
          currency={currency}
          onCancel={() => setCreating(false)}
          onCreate={async (v) => onOpen((await api.createOperation(v)).id)}
        />
      )}
    </main>
  );
}
