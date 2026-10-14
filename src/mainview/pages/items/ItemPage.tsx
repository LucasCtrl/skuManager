import { useCallback, useEffect, useState } from "react";
import { type Item, type ItemStatusChange, type Lang, type Price } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { FileExplorer } from "../../components/explorer/FileExplorer";
import { StatusBadge, StatusHistory } from "../../components/status";
import { btn, card } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { fmtDay, fmtMoney, fmtRelative, useT } from "../../i18n";
import { api } from "../../rpc";
import { EditItemDialog } from "./EditItemDialog";
import { PriceHistory } from "./PriceHistory";
import { day, specFacts, useCurrency } from "./utils";

export function ItemPage({ id, lang }: { id: number; lang: Lang }) {
  const t = useT();
  const currency = useCurrency();
  const [data, setData] = useState<{
    item: Item;
    prices: Price[];
    history: ItemStatusChange[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(
    () => api.getItem({ id }).then(setData, (e) => setError(errMsg(e))),
    [id],
  );
  useEffect(() => {
    load();
  }, [load]);

  if (!data)
    return (
      <main className="mx-auto max-w-[1120px] px-6 py-7">
        <ErrorText error={error} />
      </main>
    );
  const { item: i, prices, history } = data;
  const facts = [
    ...specFacts(i, t),
    { label: t("items.sellerSku"), value: i.sellerSku || "—", code: "" },
    { label: t("items.unit"), value: i.unit.code, code: "" },
  ];

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-7">
      <section className={`${card} flex flex-wrap items-start gap-6 p-6`}>
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 break-all font-mono text-xl font-medium">{i.sku}</h1>
            <StatusBadge status={i.status} />
          </div>
          {i.description && (
            <p className="m-0 max-w-[680px] whitespace-pre-wrap text-[15px] leading-[1.55] text-body">
              {i.description}
            </p>
          )}
          <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-3.5">
            {facts.map((f) => (
              <div key={f.label} className="flex min-w-0 flex-col gap-[3px]">
                <dt className="text-xs text-muted">{f.label}</dt>
                <dd className="m-0 flex flex-wrap items-baseline gap-1.5 text-[15px] font-medium">
                  <span>{f.value}</span>
                  {f.code && (
                    <span className="font-mono text-xs font-normal text-muted">{f.code}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-5 text-[13px] text-muted">
            <span>{t("product.created", { date: fmtDay(i.createdAt, lang) })}</span>
            <span>{t("product.updated", { date: fmtRelative(i.updatedAt, lang) })}</span>
          </div>
          <StatusHistory history={history} lang={lang} />
        </div>
        <div className="flex flex-col items-end gap-4">
          <button type="button" className={btn} onClick={() => setEditing(true)}>
            <Icon name="pencil" size={16} />
            {t("product.edit")}
          </button>
          <div className="flex min-w-40 flex-col items-end gap-0.5 rounded-lg border border-divider bg-subtle px-4 py-3">
            <span className="text-xs text-muted">{t("items.currentPrice")}</span>
            <span className="text-2xl font-semibold tabular-nums">
              {i.price ? fmtMoney(i.price.cents, currency, lang) : "—"}
            </span>
            <span className="text-[13px] text-muted">
              {t("items.perUnit", { unit: i.unit.code })}
              {i.price && ` · ${day(i.price.date)}`}
            </span>
          </div>
        </div>
      </section>

      <PriceHistory item={i} prices={prices} currency={currency} onChange={load} />

      <FileExplorer key={i.sku} sku={i.sku} t={t} />

      {editing && (
        <EditItemDialog
          item={i}
          onCancel={() => setEditing(false)}
          onSave={async (v) => {
            await api.updateItem({ id, ...v });
            await load();
            setEditing(false);
          }}
        />
      )}
    </main>
  );
}
