import { useCallback, useEffect, useState } from "react";
import { type Lang, type Operation, type Price } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { FileExplorer } from "../../components/explorer/FileExplorer";
import { btn, card } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { fmtDay, fmtRelative, useT } from "../../i18n";
import { api } from "../../rpc";
import { PriceHistory } from "../items/PriceHistory";
import { day, useCurrency } from "../items/utils";
import { EditOperationDialog } from "./OperationDialogs";
import { RateText, rateUnit } from "./RateText";

export function OperationPage({ id, lang }: { id: number; lang: Lang }) {
  const t = useT();
  const currency = useCurrency();
  const [data, setData] = useState<{ operation: Operation; rates: Price[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const load = useCallback(
    () => api.getOperation({ id }).then(setData, (e) => setError(errMsg(e))),
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
  const { operation: o, rates } = data;
  const facts = [
    { label: t("ops.rateKind"), value: t(`ops.kind.${o.rateKind}`) },
    { label: t("ops.rateUnit"), value: rateUnit(o) },
  ];

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-7">
      <section className={`${card} flex flex-wrap items-start gap-6 p-6`}>
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="m-0 font-mono text-xl font-medium">{o.sku}</h1>
          </div>
          <p className="m-0 text-[22px] font-semibold">{o.name}</p>
          {o.description && (
            <p className="m-0 max-w-[680px] whitespace-pre-wrap text-[15px] leading-[1.55] text-body">
              {o.description}
            </p>
          )}
          <dl className="m-0 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-x-5 gap-y-3.5">
            {facts.map((f) => (
              <div key={f.label} className="flex min-w-0 flex-col gap-[3px]">
                <dt className="text-xs text-muted">{f.label}</dt>
                <dd className="m-0 text-[15px] font-medium">{f.value}</dd>
              </div>
            ))}
          </dl>
          <div className="flex flex-wrap gap-5 text-[13px] text-muted">
            <span>{t("product.created", { date: fmtDay(o.createdAt, lang) })}</span>
            <span>{t("product.updated", { date: fmtRelative(o.updatedAt, lang) })}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-4">
          <button type="button" className={btn} onClick={() => setEditing(true)}>
            <Icon name="pencil" size={16} />
            {t("product.edit")}
          </button>
          <div className="flex min-w-40 flex-col items-end gap-0.5 rounded-lg border border-divider bg-subtle px-4 py-3">
            <span className="text-xs text-muted">{t("ops.currentRate")}</span>
            <span className="text-2xl font-semibold tabular-nums">
              <RateText op={o} currency={currency} />
            </span>
            {o.rate && <span className="text-[13px] text-muted">{day(o.rate.date)}</span>}
          </div>
        </div>
      </section>

      <PriceHistory
        rate
        unit={rateUnit(o)}
        prices={rates}
        currency={currency}
        onAdd={(date, amount) => api.addRate({ operationId: o.id, date, amount })}
        onUpdate={(id, date, amount) => api.updateRate({ id, date, amount })}
        onDelete={(id) => api.deleteRate({ id })}
        onChange={load}
      />

      <FileExplorer key={o.sku} sku={o.sku} t={t} />

      {editing && (
        <EditOperationDialog
          op={o}
          onCancel={() => setEditing(false)}
          onSave={async (v) => {
            await api.updateOperation({ id, ...v });
            await load();
            setEditing(false);
          }}
        />
      )}
    </main>
  );
}
