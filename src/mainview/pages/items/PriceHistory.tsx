import { useState } from "react";
import { type Price } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { btn, btnPrimary, card, field, toolBtn } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { fmtMoney, uiLang, useT } from "../../i18n";
import { amountText, day, parseAmount, today } from "./utils";

export const priceCols = "grid grid-cols-[160px_160px_minmax(0,1fr)_200px] items-center gap-3 px-5";

// Price history of an item, or rate history of an operation (`rate`).
export function PriceHistory({
  unit,
  prices,
  currency,
  rate = false,
  onAdd,
  onUpdate,
  onDelete,
  onChange,
}: {
  unit: string;
  prices: Price[];
  currency: string;
  rate?: boolean;
  onAdd: (date: string, amount: number) => Promise<unknown>;
  onUpdate: (id: number, date: string, amount: number) => Promise<unknown>;
  onDelete: (id: number) => Promise<unknown>;
  onChange: () => Promise<unknown>;
}) {
  const t = useT();
  // null = viewing, "add" = new row, number = editing that entry
  const [mode, setMode] = useState<null | "add" | number>(null);
  const [date, setDate] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState<string | null>(null);

  const open = (m: "add" | Price) => {
    setMode(m === "add" ? m : m.id);
    setDate(m === "add" ? today() : m.date);
    setPrice(m === "add" ? "" : amountText(m.amount));
    setError(null);
  };
  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      setMode(null);
      await onChange();
    } catch (e) {
      setError(errMsg(e));
    }
  };
  const save = () => {
    const amount = parseAmount(price);
    if (!date) return setError(t("items.pickDate"));
    if (amount === null) return setError(t("items.enterPrice"));
    run(() => (mode === "add" ? onAdd(date, amount) : onUpdate(mode as number, date, amount)));
  };

  const editRow = (
    <div className={`${priceCols} border-b border-divider bg-accent-soft py-2.5`}>
      <input
        type="date"
        aria-label={t("items.date")}
        className={`${field} h-10 px-2.5 text-sm`}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />
      <div className="box-border flex h-10 items-center gap-1 rounded-lg border border-line-strong bg-surface px-2.5 focus-within:border-ink">
        <span className="text-sm text-muted">{currency}</span>
        <input
          inputMode="decimal"
          autoFocus
          aria-label={t("items.price")}
          placeholder="0.00"
          className="min-w-0 flex-1 border-0 bg-transparent text-right text-sm tabular-nums text-ink outline-none focus-visible:outline-none"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => (e.key === "Enter" ? save() : e.key === "Escape" && setMode(null))}
        />
      </div>
      <span className="text-[13px] text-danger">{error}</span>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          className={`${btn} h-10 px-3.5 text-sm`}
          onClick={() => setMode(null)}
        >
          {t("common.cancel")}
        </button>
        <button type="button" className={`${btnPrimary} h-10 px-3.5 text-sm`} onClick={save}>
          {t("items.save")}
        </button>
      </div>
    </div>
  );

  return (
    <section aria-labelledby="ph-title" className={card}>
      <div className="box-border flex min-h-16 flex-wrap items-center gap-3 border-b border-line py-2.5 pl-5 pr-3">
        <h2 id="ph-title" className="m-0 text-base font-semibold">
          {t(rate ? "ops.rateHistory" : "items.priceHistory")}
        </h2>
        <span className="text-[13px] text-muted">
          {t(rate ? "ops.rateNote" : "items.priceNote", { unit })}
        </span>
        <span className="ml-auto" />
        {mode === null && (
          <button type="button" className={toolBtn} onClick={() => open("add")}>
            <Icon name="plus" size={16} strokeWidth={2} />
            {t(rate ? "ops.addRate" : "items.addPrice")}
          </button>
        )}
      </div>
      <div
        className={`${priceCols} h-10 border-b border-line bg-subtle text-xs font-medium uppercase tracking-[0.06em] text-muted`}
      >
        <span>{t("items.date")}</span>
        <span className="text-right">{t(rate ? "ops.rate" : "items.price")}</span>
        <span />
        <span />
      </div>
      {mode === "add" && editRow}
      {prices.map((p, n) =>
        mode === p.id ? (
          <div key={p.id}>{editRow}</div>
        ) : (
          <div key={p.id} className={`${priceCols} min-h-12 border-b border-divider`}>
            <span className="text-sm tabular-nums">{day(p.date)}</span>
            <span className="text-right text-sm font-medium tabular-nums">
              {fmtMoney(p.amount / 1e4, currency, uiLang(), 4)}
            </span>
            <span>
              {n === 0 && (
                <span className="inline-flex items-center rounded-md bg-accent-tint px-2 py-[3px] text-xs font-medium text-accent-hover">
                  {t("items.current")}
                </span>
              )}
            </span>
            <div className="flex justify-end gap-1">
              <button
                type="button"
                className={`${toolBtn} w-10 justify-center px-0`}
                aria-label={t("items.editPrice", { date: day(p.date) })}
                onClick={() => open(p)}
              >
                <Icon name="pencil" size={16} />
              </button>
              <button
                type="button"
                className={`${toolBtn} w-10 justify-center px-0 text-danger hover:bg-danger-soft`}
                aria-label={t("items.deletePrice", { date: day(p.date) })}
                onClick={() =>
                  confirm(
                    t(rate ? "ops.confirmDeleteRate" : "items.confirmDeletePrice", {
                      date: day(p.date),
                    }),
                  ) && run(() => onDelete(p.id))
                }
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          </div>
        ),
      )}
      {!prices.length && mode !== "add" && (
        <div className="px-5 py-8 text-center text-sm text-muted">
          {t(rate ? "ops.noRate" : "items.noPrice")}
        </div>
      )}
      {mode === null && error && (
        <div className="px-5 py-3">
          <ErrorText error={error} />
        </div>
      )}
    </section>
  );
}
