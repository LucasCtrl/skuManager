import { useState } from "react";
import { type CompositionLine, type Cost, type Lang, type Owner } from "../../../shared/rpc";
import { ITEM_PREFIX } from "../../../shared/sku";
import { type Page } from "../../App";
import { Icon } from "../../components/Icon";
import { StatusBadge, ToReviewBadge } from "../../components/status";
import { card, toolBtn } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";
import { CostText } from "./Cost";
import { AddLineDialog, EditLineDialog } from "./LineDialogs";
import { fmtQty } from "./quantity";

// Page a line's SKU opens.
export const lineTarget = ({ component: c, sku }: CompositionLine): Page =>
  c.kind === "item"
    ? { name: "item", kind: sku.startsWith(ITEM_PREFIX.material) ? "material" : "part", id: c.id }
    : c.kind === "operation"
      ? { name: "operation", id: c.id }
      : { name: "version", id: c.id };

const cols =
  "grid grid-cols-[minmax(0,1fr)_minmax(0,auto)_130px_120px_216px] items-center gap-3 px-5";

// Composition of a product or part version. `locked`: a Retired product's composition is read-only.
export function Composition({
  owner,
  lines,
  cost,
  currency,
  lang,
  locked = false,
  onOpen,
  onChange,
}: {
  owner: Owner;
  lines: CompositionLine[];
  cost: Cost;
  currency: string;
  lang: Lang;
  locked?: boolean;
  onOpen: (l: CompositionLine) => void;
  onChange: () => Promise<unknown>;
}) {
  const t = useT();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<CompositionLine | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    try {
      await fn();
      await onChange();
    } catch (e) {
      setError(errMsg(e));
    }
  };
  const done = async () => {
    setAdding(false);
    setEditing(null);
    await onChange();
  };

  return (
    <section aria-labelledby="comp-title" className={card}>
      <div className="box-border flex min-h-16 flex-wrap items-center gap-3 border-b border-line py-2.5 pl-5 pr-3">
        <h2 id="comp-title" className="m-0 text-base font-semibold">
          {t("comp.title")}
        </h2>
        <span className="text-[13px] text-muted">
          {locked ? t("comp.locked") : t("comp.count", { n: lines.length })}
        </span>
        <span className="ml-auto text-sm tabular-nums">
          <span className="text-muted">{t("comp.total")} </span>
          <span className="font-semibold">
            <CostText cost={cost} currency={currency} />
          </span>
        </span>
        {!locked && (
          <button type="button" className={toolBtn} onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} strokeWidth={2} />
            {t("comp.addLine")}
          </button>
        )}
      </div>
      {lines.map((l, i) => (
        <div key={l.id} className={`${cols} min-h-14 border-b border-divider py-2`}>
          <button
            type="button"
            onClick={() => onOpen(l)}
            className="flex min-w-0 flex-col items-start gap-0.5 rounded text-left hover:underline"
          >
            <span className="break-all font-mono text-[13px] font-medium">{l.sku}</span>
            <span className="truncate text-[13px] text-muted">{l.name}</span>
          </button>
          <span className="flex flex-wrap justify-end gap-1.5">
            {l.status && l.status !== "Active" && <StatusBadge status={l.status} />}
            {l.toReview && <ToReviewBadge />}
          </span>
          <span className="text-right text-sm tabular-nums">{fmtQty(l, lang)}</span>
          <span className="text-right text-sm tabular-nums">
            <CostText cost={l.cost} currency={currency} />
          </span>
          <div className="flex justify-end gap-1">
            {!locked && l.toReview && (
              <button
                type="button"
                className={`${toolBtn} w-10 justify-center px-0`}
                aria-label={t("comp.markReviewed", { sku: l.sku })}
                title={t("comp.markReviewed", { sku: l.sku })}
                onClick={() => run(() => api.markReviewed({ id: l.id }))}
              >
                <Icon name="check" size={16} />
              </button>
            )}
            {!locked && (
              <>
                {([-1, 1] as const).map((by) => (
                  <button
                    key={by}
                    type="button"
                    className={`${toolBtn} w-10 justify-center px-0 disabled:opacity-40`}
                    aria-label={t(by < 0 ? "comp.moveUp" : "comp.moveDown", { sku: l.sku })}
                    title={t(by < 0 ? "comp.moveUp" : "comp.moveDown", { sku: l.sku })}
                    disabled={by < 0 ? i === 0 : i === lines.length - 1}
                    onClick={() => run(() => api.moveLine({ id: l.id, by }))}
                  >
                    <Icon name={by < 0 ? "chevronUp" : "chevronDown"} size={16} />
                  </button>
                ))}
                <button
                  type="button"
                  className={`${toolBtn} w-10 justify-center px-0`}
                  aria-label={t("comp.editLine", { sku: l.sku })}
                  onClick={() => setEditing(l)}
                >
                  <Icon name="pencil" size={16} />
                </button>
                <button
                  type="button"
                  className={`${toolBtn} w-10 justify-center px-0 text-danger hover:bg-danger-soft`}
                  aria-label={t("comp.deleteLine", { sku: l.sku })}
                  onClick={() =>
                    confirm(t("comp.confirmDelete", { sku: l.sku })) &&
                    run(() => api.deleteLine({ id: l.id }))
                  }
                >
                  <Icon name="trash" size={16} />
                </button>
              </>
            )}
          </div>
        </div>
      ))}
      {!lines.length && (
        <div className="px-5 py-8 text-center text-sm text-muted">{t("comp.empty")}</div>
      )}
      {error && (
        <div className="px-5 py-3">
          <ErrorText error={error} />
        </div>
      )}
      {adding && (
        <AddLineDialog
          owner={owner}
          lines={lines}
          onDone={done}
          onCancel={() => setAdding(false)}
        />
      )}
      {editing && <EditLineDialog line={editing} onDone={done} onCancel={() => setEditing(null)} />}
    </section>
  );
}
