import { useCallback, useEffect, useState } from "react";
import {
  type CompositionLine,
  type Cost,
  type Item,
  type Lang,
  type Product,
  type Swap,
  type Variant,
} from "../../../shared/rpc";
import { type Page } from "../../App";
import { Icon } from "../../components/Icon";
import { StatusBadge, ToReviewBadge } from "../../components/status";
import { btn, card } from "../../components/styles";
import { errMsg, ErrorText } from "../../components/text";
import { fmtDay, fmtRelative, useT } from "../../i18n";
import { api } from "../../rpc";
import { useCurrency } from "../items/utils";
import { Composition, lineTarget } from "../parts/Composition";
import { CostBox } from "../parts/Cost";
import { Swaps } from "./Swaps";
import { EditVariantDialog, NewVariantDialog } from "./VariantDialogs";

type Data = {
  variant: Variant;
  product: Product;
  siblings: Variant[]; // every variant of the product, this one included
  swaps: Swap[];
  items: Item[];
  lines: CompositionLine[];
  cost: Cost;
};

export function VariantPage({
  id,
  lang,
  onNavigate,
}: {
  id: number;
  lang: Lang;
  onNavigate: (p: Page) => void;
}) {
  const t = useT();
  const currency = useCurrency();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<null | "edit" | "copy">(null);

  const load = useCallback(
    () =>
      Promise.all([
        api.getVariant({ id }),
        api.listSwaps({ variantId: id }),
        api.getComposition({ owner: { kind: "variant", id } }),
      ])
        .then(async ([v, s, c]) => {
          const { variants } = await api.getProduct({ id: v.product.id });
          setData({ ...v, ...s, ...c, siblings: variants });
        })
        .catch((e) => setError(errMsg(e))),
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
  const { variant: v, product: p } = data;
  const locked = p.status === "Retired";
  const last = data.siblings.length === 1;

  const remove = async () => {
    if (!confirm(t(last ? "variants.confirmDeleteLast" : "variants.confirmDelete", { sku: v.sku })))
      return;
    try {
      await api.deleteVariant({ id });
      onNavigate({ name: "product", id: p.id });
    } catch (e) {
      setError(errMsg(e));
    }
  };

  return (
    <main className="mx-auto box-border flex w-full max-w-[1120px] flex-col gap-5 px-6 pb-12 pt-7">
      <section className={`${card} flex flex-wrap items-start gap-6 p-6`}>
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <span className="break-all rounded-md bg-canvas px-2 py-1 font-mono text-sm font-medium">
              {v.sku}
            </span>
            {v.toReview && <ToReviewBadge />}
          </div>
          <h1 className="m-0 text-[26px] font-semibold tracking-[-0.01em]">{v.name}</h1>
          {v.description && (
            <p className="m-0 max-w-[680px] whitespace-pre-wrap text-[15px] leading-[1.55] text-body">
              {v.description}
            </p>
          )}
          <dl className="m-0 flex flex-col gap-[3px]">
            <dt className="text-xs text-muted">{t("variants.product")}</dt>
            <dd className="m-0 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="inline-flex items-baseline gap-2 rounded text-[15px] font-medium hover:underline"
                onClick={() => onNavigate({ name: "product", id: p.id })}
              >
                <span className="font-mono text-[13px]">{p.sku}</span>
                {p.name}
              </button>
              <StatusBadge status={p.status} />
            </dd>
          </dl>
          <div className="flex flex-wrap gap-5 text-[13px] text-muted">
            <span>{t("product.created", { date: fmtDay(v.createdAt, lang) })}</span>
            <span>{t("product.updated", { date: fmtRelative(v.updatedAt, lang) })}</span>
          </div>
          <ErrorText error={error} />
        </div>
        <div className="flex flex-col items-end gap-4">
          {!locked && (
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={btn} onClick={() => setDialog("copy")}>
                <Icon name="copy" size={16} />
                {t("variants.copy")}
              </button>
              <button type="button" className={btn} onClick={() => setDialog("edit")}>
                <Icon name="pencil" size={16} />
                {t("product.edit")}
              </button>
              <button
                type="button"
                className={`${btn} text-danger hover:bg-danger-soft`}
                onClick={remove}
              >
                <Icon name="trash" size={16} />
                {t("variants.delete")}
              </button>
            </div>
          )}
          <CostBox cost={v.cost} currency={currency} />
        </div>
      </section>

      <Swaps
        variantId={id}
        swaps={data.swaps}
        items={data.items}
        locked={locked}
        onOpen={(i) => onNavigate({ name: "item", kind: i.kind, id: i.id })}
        onChange={load}
      />

      <Composition
        owner={{ kind: "variant", id }}
        lines={data.lines}
        cost={data.cost}
        currency={currency}
        lang={lang}
        locked={locked}
        onOpen={(l) => onNavigate(lineTarget(l))}
        onChange={load}
      />

      {dialog === "edit" && (
        <EditVariantDialog
          variant={v}
          onCancel={() => setDialog(null)}
          onSave={async (x) => {
            await api.updateVariant({ id, ...x });
            await load();
            setDialog(null);
          }}
        />
      )}
      {dialog === "copy" && (
        <NewVariantDialog
          productId={p.id}
          variants={data.siblings}
          copyFrom={id}
          onCancel={() => setDialog(null)}
          onCreate={async (x) =>
            onNavigate({
              name: "variant",
              id: (await api.createVariant({ productId: p.id, ...x })).id,
            })
          }
        />
      )}
    </main>
  );
}
