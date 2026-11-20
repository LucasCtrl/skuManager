import { useEffect, useState } from "react";
import { type Item, type Swap } from "../../../shared/rpc";
import { Icon } from "../../components/Icon";
import { Modal } from "../../components/Modal";
import { Field, Req, useSubmit } from "../../components/form";
import { StatusBadge } from "../../components/status";
import { btn, btnPrimary, card, field, toolBtn } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { useT } from "../../i18n";
import { api } from "../../rpc";

const label = (i: Item) => `${i.sku} · ${i.type.name}${i.description ? ` · ${i.description}` : ""}`;

// A variant's swaps (docs/products.md#swaps). `items`: the items found in the variant, at any depth.
export function Swaps({
  variantId,
  swaps,
  items,
  locked,
  onOpen,
  onChange,
}: {
  variantId: number;
  swaps: Swap[];
  items: Item[];
  locked: boolean;
  onOpen: (i: Item) => void;
  onChange: () => Promise<unknown>;
}) {
  const t = useT();
  const [editing, setEditing] = useState<Swap | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const done = async () => {
    setEditing(null);
    await onChange();
  };

  return (
    <section aria-labelledby="swaps-title" className={card}>
      <div className="box-border flex min-h-16 flex-wrap items-center gap-3 border-b border-line py-2.5 pl-5 pr-3">
        <h2 id="swaps-title" className="m-0 text-base font-semibold">
          {t("swaps.title")}
        </h2>
        <span className="text-[13px] text-muted">{t("swaps.note")}</span>
        <span className="ml-auto" />
        {!locked && (
          <button type="button" className={toolBtn} onClick={() => setEditing("new")}>
            <Icon name="plus" size={16} strokeWidth={2} />
            {t("swaps.add")}
          </button>
        )}
      </div>
      {swaps.map((s) => (
        <div
          key={s.id}
          className="flex min-h-14 flex-wrap items-center gap-3 border-b border-divider px-5 py-2"
        >
          {[s.from, s.to].map((i, n) => (
            <span key={i.id} className="flex min-w-0 items-center gap-3">
              {n === 1 && <Icon name="arrowRight" size={16} />}
              <button
                type="button"
                onClick={() => onOpen(i)}
                className="flex min-w-0 flex-col items-start gap-0.5 rounded text-left hover:underline"
              >
                <span className="break-all font-mono text-[13px] font-medium">{i.sku}</span>
                <span className="truncate text-[13px] text-muted">{i.type.name}</span>
              </button>
            </span>
          ))}
          <span className="ml-auto flex flex-wrap justify-end gap-1.5">
            {s.unused && (
              <span
                title={t("swaps.unusedHelp")}
                className="inline-flex items-center whitespace-nowrap rounded-full bg-warn-soft px-2.5 py-1 text-xs font-medium text-warn"
              >
                {t("swaps.unused")}
              </span>
            )}
            {s.to.status !== "Active" && <StatusBadge status={s.to.status} />}
          </span>
          {!locked && (
            <div className="flex gap-1">
              <button
                type="button"
                className={`${toolBtn} w-10 justify-center px-0`}
                aria-label={t("swaps.edit", { sku: s.from.sku })}
                onClick={() => setEditing(s)}
              >
                <Icon name="pencil" size={16} />
              </button>
              <button
                type="button"
                className={`${toolBtn} w-10 justify-center px-0 text-danger hover:bg-danger-soft`}
                aria-label={t("swaps.delete", { sku: s.from.sku })}
                onClick={async () => {
                  if (!confirm(t("swaps.confirmDelete", { from: s.from.sku, to: s.to.sku })))
                    return;
                  setError(null);
                  try {
                    await api.deleteSwap({ id: s.id });
                    await onChange();
                  } catch (e) {
                    setError(errMsg(e));
                  }
                }}
              >
                <Icon name="trash" size={16} />
              </button>
            </div>
          )}
        </div>
      ))}
      {!swaps.length && (
        <div className="px-5 py-8 text-center text-sm text-muted">{t("swaps.empty")}</div>
      )}
      {error && (
        <div className="px-5 py-3">
          <ErrorText error={error} />
        </div>
      )}
      {editing && (
        <SwapDialog
          variantId={variantId}
          swap={editing === "new" ? null : editing}
          items={items.filter((i) => !swaps.some((s) => s.from.id === i.id))}
          onDone={done}
          onCancel={() => setEditing(null)}
        />
      )}
    </section>
  );
}

// Add (pick X among the variant's items, then Y) or edit (change Y) a swap.
function SwapDialog({
  variantId,
  swap,
  items,
  onDone,
  onCancel,
}: {
  variantId: number;
  swap: Swap | null;
  items: Item[];
  onDone: () => Promise<unknown>;
  onCancel: () => void;
}) {
  const t = useT();
  const [from, setFrom] = useState<Item | null>(swap?.from ?? null);
  const [toId, setToId] = useState<number | null>(swap?.to.id ?? null);
  const [candidates, setCandidates] = useState<Item[] | null>(null);
  const { busy, error, submit } = useSubmit(async () => {
    if (swap) await api.updateSwap({ id: swap.id, toId: toId! });
    else await api.addSwap({ variantId, fromId: from!.id, toId: toId! });
    await onDone();
  });

  // same kind and price unit, Active, not X itself
  useEffect(() => {
    if (!from) return;
    api
      .listItems({ kind: from.kind, query: "" })
      .then((is) =>
        setCandidates(
          is.filter(
            (i) =>
              i.id !== from.id &&
              i.unit.id === from.unit.id &&
              (i.status === "Active" || i.id === swap?.to.id),
          ),
        ),
      );
  }, [from, swap]);

  return (
    <form onSubmit={submit}>
      <Modal
        title={t(swap ? "swaps.editTitle" : "swaps.addTitle")}
        onClose={onCancel}
        width={600}
        top={80}
        footer={
          <>
            <button type="button" className={btn} onClick={onCancel}>
              {t("common.cancel")}
            </button>
            <button type="submit" className={btnPrimary} disabled={busy || !from || !toId}>
              {t(swap ? "product.saveChanges" : "swaps.add")}
            </button>
          </>
        }
      >
        <div className="flex flex-col gap-[18px] px-6 pb-6 pt-4">
          <Field
            id="swap-from"
            label={
              <>
                {t("swaps.from")} <Req />
              </>
            }
          >
            <select
              id="swap-from"
              className={`${field} h-11 px-2.5`}
              value={from?.id ?? ""}
              disabled={!!swap}
              onChange={(e) => {
                setFrom(items.find((i) => i.id === Number(e.target.value)) ?? null);
                setToId(null);
                setCandidates(null);
              }}
            >
              <option value="">{t("items.select")}</option>
              {(swap ? [swap.from] : items).map((i) => (
                <option key={i.id} value={i.id}>
                  {label(i)}
                </option>
              ))}
            </select>
            <span className="text-[13px] text-muted">{t("swaps.fromHelp")}</span>
          </Field>
          <Field
            id="swap-to"
            label={
              <>
                {t("swaps.to")} <Req />
              </>
            }
          >
            <select
              id="swap-to"
              className={`${field} h-11 px-2.5`}
              value={toId ?? ""}
              disabled={!candidates}
              onChange={(e) => setToId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">{t("items.select")}</option>
              {candidates?.map((i) => (
                <option key={i.id} value={i.id}>
                  {label(i)}
                </option>
              ))}
            </select>
            <span className="text-[13px] text-muted">
              {from ? t("swaps.toHelp", { unit: from.unit.name }) : t("swaps.pickFrom")}
            </span>
          </Field>
          <ErrorText error={error} />
        </div>
      </Modal>
    </form>
  );
}
